import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PORTRAIT_STEP, QUESTIONS, QUIZ_STEPS } from '../../content.js';
import { currentAnswers, isComplete } from '../quiz.js';

const five = Object.fromEntries(QUESTIONS.map((q) => [q.id, q.options[0]]));

test("the photographer's step comes last and is not one of the five questions", () => {
  assert.equal(QUESTIONS.length, 5);
  assert.equal(QUIZ_STEPS.at(-1), PORTRAIT_STEP);
  assert.equal(QUIZ_STEPS.length, 6);
});

test('a draft with five answers but no photo choice is not complete, so it resumes there', () => {
  assert.equal(isComplete(five), false);
  assert.equal(isComplete({ ...five, portrait_subject: PORTRAIT_STEP.options[2] }), true);
});

test('an unknown photo choice is dropped from a resumed draft', () => {
  const kept = currentAnswers({ ...five, portrait_subject: 'Shoot me as a giraffe' });
  assert.equal('portrait_subject' in kept, false);
  assert.deepEqual(kept, five);
});
