import { QUIZ_STEPS } from '../content.js';

/**
 * The draft with only answers that are current options. A draft saved
 * before the questionnaire changed holds option text the server no longer
 * accepts; dropping it sends the reader to the first unanswered question
 * instead of into a submit that fails.
 */
export function currentAnswers(answers) {
  const kept = {};
  if (!answers || typeof answers !== 'object') return kept;
  for (const q of QUIZ_STEPS) {
    if (q.options.includes(answers[q.id])) kept[q.id] = answers[q.id];
  }
  return kept;
}

/** True when every step, the photographer's included, holds a current option. */
export function isComplete(answers) {
  return QUIZ_STEPS.every((q) => q.options.includes(answers?.[q.id]));
}
