// Language-aware access to the questionnaire and career copy. The English
// option text stays the value stored and sent to the server (server/quiz.js
// is the contract); Hebrew is display only, matched by position, so a Hebrew
// reader and an English reader get the same career from the same choices.
import { FINDINGS, PORTRAIT_STEP, PRESS_STEPS, QUIZ_STEPS, ANALYSIS_NOTES } from '../content.js';
import { QUESTIONS_HE, PORTRAIT_STEP_HE, FINDINGS_HE, ANALYSIS_NOTES_HE, PRESS_STEPS_HE } from './quiz.he.js';
import { CAREERS_HE } from './careers.he.js';

const STEPS_HE = [...QUESTIONS_HE, PORTRAIT_STEP_HE];

/** The quiz steps to render: English shapes, display text in the reader's language. */
export function quizSteps(lang) {
  // `options` stay the English values; `labels` are what the reader sees.
  if (lang !== 'he') return QUIZ_STEPS.map((step) => ({ ...step, labels: step.options }));
  return QUIZ_STEPS.map((step, i) => {
    const he = STEPS_HE[i];
    return { ...step, label: he.label ?? step.label, question: he.question ?? step.question, labels: he.options };
  });
}

/** How an option (English value) reads in the reader's language. */
export function optionLabel(lang, englishText) {
  if (lang !== 'he' || typeof englishText !== 'string') return englishText;
  for (const [i, step] of QUIZ_STEPS.entries()) {
    const at = step.options.indexOf(englishText);
    if (at !== -1) return STEPS_HE[i]?.options?.[at] ?? englishText;
  }
  return englishText; // an option since reworded: quote it as saved
}

/** The analyst's line under a quoted answer, or undefined. */
export function findingFor(lang, englishText) {
  return lang === 'he' ? FINDINGS_HE[englishText] : FINDINGS[englishText];
}

export function analysisNotes(lang) {
  return lang === 'he' ? ANALYSIS_NOTES_HE : ANALYSIS_NOTES;
}

export function pressSteps(lang) {
  return lang === 'he' ? PRESS_STEPS_HE : PRESS_STEPS;
}

export const OWN_PHOTO_VALUE = PORTRAIT_STEP.options[PORTRAIT_STEP.options.length - 1];

/**
 * A career's headline, caption and figures in the reader's language. Hebrew
 * job titles are gendered: `gender` ('woman' | 'man' | null, who is on the
 * cover, from the server) picks the form; unknown reads masculine, the
 * Hebrew default. A career with no Hebrew copy (an old saved result) stays
 * in English rather than half-translated.
 */
export function careerCopy(lang, { title, caption, salary, outlook }, gender = null) {
  const he = lang === 'he' ? CAREERS_HE[title] : null;
  if (!he) return { title, caption, salary, outlook };
  return {
    title: gender === 'woman' ? he.titleF || he.title : he.title,
    caption: he.caption,
    salary: he.salary,
    outlook: he.outlook,
  };
}

/** Just the headline (landing samples, back issues). */
export function careerTitle(lang, title, gender = null) {
  return careerCopy(lang, { title }, gender).title;
}
