import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { cachedResult, draftAnswers, isResult } from '../storage.js';

function installStorage({ throwing = false } = {}) {
  const map = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => {
      if (throwing) throw new Error('SecurityError');
      return map.has(k) ? map.get(k) : null;
    },
    setItem: (k, v) => {
      if (throwing) throw new Error('QuotaExceededError');
      map.set(k, String(v));
    },
    removeItem: (k) => map.delete(k),
  };
  return map;
}

const RESULT = { careerTitle: 'Eternal Intern', stats: { happiness: 27 }, imageUrl: '/api/image/0123456789abcdef' };

beforeEach(() => installStorage());

test('round-trips answers and result', () => {
  draftAnswers.set({ strength: 'Raw creativity' });
  assert.deepEqual(draftAnswers.get(), { strength: 'Raw creativity' });
  cachedResult.set(RESULT);
  assert.deepEqual(cachedResult.get(), RESULT);
});

test('clear removes stored values', () => {
  draftAnswers.set({ a: 'b' });
  draftAnswers.clear();
  assert.deepEqual(draftAnswers.get(), {});
  cachedResult.set(RESULT);
  cachedResult.clear();
  assert.equal(cachedResult.get(), null);
});

test('corrupt JSON degrades to empty instead of throwing', () => {
  const map = installStorage();
  map.set('cp:answers', '{not json');
  map.set('cp:result', '{not json');
  assert.deepEqual(draftAnswers.get(), {});
  assert.equal(cachedResult.get(), null);
});

test('a stored value with the wrong shape is ignored', () => {
  const map = installStorage();
  map.set('cp:answers', '["an","array"]');
  map.set('cp:result', '{"careerTitle":""}');
  assert.deepEqual(draftAnswers.get(), {});
  assert.equal(cachedResult.get(), null);
});

test('a throwing storage (private mode) never breaks the flow', () => {
  installStorage({ throwing: true });
  assert.doesNotThrow(() => draftAnswers.set({ a: 'b' }));
  assert.deepEqual(draftAnswers.get(), {});
  assert.equal(cachedResult.get(), null);
});

test('isResult requires a non-empty title and a stats object', () => {
  assert.equal(isResult(RESULT), true);
  assert.equal(isResult(null), false);
  assert.equal(isResult({ careerTitle: 'x' }), false);
  assert.equal(isResult({ careerTitle: 'x', stats: null }), false);
  assert.equal(isResult({ careerTitle: 7, stats: {} }), false);
});
