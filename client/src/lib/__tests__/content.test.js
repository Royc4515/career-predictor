import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FINDINGS, QUESTIONS } from '../../content.js';

test('every answer has an evidence finding, and no finding is orphaned', () => {
  const options = QUESTIONS.flatMap((q) => q.options);
  for (const option of options) assert.ok(FINDINGS[option], `no finding for "${option}"`);
  assert.deepEqual(Object.keys(FINDINGS).sort(), [...options].sort());
});

test('quiz copy has no em dashes and stays dry', () => {
  for (const text of [...QUESTIONS.flatMap((q) => [q.question, ...q.options]), ...Object.values(FINDINGS)]) {
    assert.doesNotMatch(text, /—/, text);
    assert.doesNotMatch(text, /!/, text);
  }
});
