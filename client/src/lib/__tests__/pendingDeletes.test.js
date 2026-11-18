import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeleteQueue } from '../pendingDeletes.js';

// A hand-run clock: timers fire only when the test says so.
function clock() {
  const timers = new Map();
  let next = 1;
  return {
    setTimer: (fn) => {
      const id = next++;
      timers.set(id, fn);
      return id;
    },
    clearTimer: (id) => timers.delete(id),
    fireAll: () => {
      const due = [...timers.values()];
      timers.clear();
      due.forEach((fn) => fn());
    },
    get count() {
      return timers.size;
    },
  };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

test('a delete is sent when its time runs out, not before', async () => {
  const c = clock();
  const q = createDeleteQueue(c);
  const sent = [];
  q.schedule('a', () => sent.push('a'));
  assert.deepEqual(sent, []);
  assert.equal(q.has('a'), true);
  c.fireAll();
  await tick();
  assert.deepEqual(sent, ['a']);
  assert.equal(q.size, 0);
});

test('undo takes it back for good; a second undo is false', async () => {
  const c = clock();
  const q = createDeleteQueue(c);
  const sent = [];
  q.schedule('a', () => sent.push('a'));
  assert.equal(q.undo('a'), true);
  assert.equal(c.count, 0, 'the timer is cleared');
  c.fireAll();
  await tick();
  assert.deepEqual(sent, []);
  assert.equal(q.undo('a'), false);
  assert.equal(q.undo('never'), false);
});

test('flush sends everything waiting at once, with the options given', async () => {
  const c = clock();
  const q = createDeleteQueue(c);
  const sent = [];
  q.schedule('a', (o) => sent.push(['a', o?.keepalive]));
  q.schedule('b', (o) => sent.push(['b', o?.keepalive]));
  await q.flush({ keepalive: true });
  assert.deepEqual(sent, [['a', true], ['b', true]]);
  assert.equal(c.count, 0);
  c.fireAll();
  await tick();
  assert.equal(sent.length, 2, 'a flushed delete is not sent again by its timer');
  assert.equal(q.undo('a'), false, 'too late to undo');
});

test('a failed delete calls onError so the caller can put it back', async () => {
  const c = clock();
  const q = createDeleteQueue(c);
  let caught = null;
  q.schedule('a', () => Promise.reject(new Error('offline')), { onError: (e) => (caught = e) });
  await q.flush();
  assert.equal(caught?.message, 'offline');
});

test('scheduling the same key again sends the first one now', async () => {
  const c = clock();
  const q = createDeleteQueue(c);
  const sent = [];
  q.schedule('a', () => sent.push(1));
  q.schedule('a', () => sent.push(2));
  await tick();
  assert.deepEqual(sent, [1]);
  assert.equal(q.size, 1);
  await q.flush();
  assert.deepEqual(sent, [1, 2]);
});
