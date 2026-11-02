import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS } from '../../content.js';
import { currentAnswers, isComplete } from '../quiz.js';

const full = Object.fromEntries(QUESTIONS.map((q) => [q.id, q.options[1]]));

test('currentAnswers keeps current options and drops stale or foreign values', () => {
  assert.deepEqual(currentAnswers(full), full);
  const stale = { ...full, strength: 'Strategic thinking', extra: 'x', monday_vibe: 42 };
  const kept = currentAnswers(stale);
  assert.equal('strength' in kept, false);
  assert.equal('monday_vibe' in kept, false);
  assert.equal('extra' in kept, false);
  assert.equal(kept.coworker_desc, full.coworker_desc);
});

test('currentAnswers tolerates junk input', () => {
  assert.deepEqual(currentAnswers(null), {});
  assert.deepEqual(currentAnswers('x'), {});
});

test('isComplete needs all five, the field question included', () => {
  assert.equal(isComplete(full), true);
  assert.equal(isComplete({ ...full, desired_field: undefined }), false);
  assert.equal(isComplete({ ...full, strength: 'Strategic thinking' }), false);
  assert.equal(isComplete(undefined), false);
});
