import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barcodeBars, firstName, issueFor } from '../issue.js';

test('issue number counts months from January 2024 as No. 1', () => {
  assert.equal(issueFor(new Date(2024, 0, 15)).number, 1);
  assert.equal(issueFor(new Date(2024, 11, 1)).number, 12);
  assert.equal(issueFor(new Date(2026, 10, 1)).number, 35);
});

test('issue number never drops below 1 for dates before the first issue', () => {
  assert.equal(issueFor(new Date(2020, 0, 1)).number, 1);
});

test('issue label is "Month YYYY"', () => {
  assert.equal(issueFor(new Date(2026, 10, 1)).label, 'November 2026');
});

test('firstName takes the first word and tolerates bad input', () => {
  assert.equal(firstName('Roy Carmelli'), 'Roy');
  assert.equal(firstName('  Madonna  '), 'Madonna');
  assert.equal(firstName(''), null);
  assert.equal(firstName('   '), null);
  assert.equal(firstName(undefined), null);
  assert.equal(firstName(42), null);
});

test('barcodeBars is deterministic per title and varies between titles', () => {
  const a = barcodeBars('Senior Falafel Architect, Tel Aviv District');
  assert.deepEqual(a, barcodeBars('Senior Falafel Architect, Tel Aviv District'));
  assert.notDeepEqual(a, barcodeBars('Thought Leader Without the Thought'));
});

test('barcodeBars returns the requested count of widths in 1..3', () => {
  const bars = barcodeBars('x', 40);
  assert.equal(bars.length, 40);
  for (const w of bars) assert.ok(w >= 1 && w <= 3);
  assert.equal(barcodeBars('').length, 34);
});
