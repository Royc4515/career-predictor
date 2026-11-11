// The questionnaire's answer catalog. The client renders the same questions
// from client/src/content.js and sends the option text; this file turns that
// text into a stable id the career table can refer to. Question ids are the
// onboarding table's column names, so they stay as they are even where the
// question changed (strength now holds the dead-laptop answer, and so on).
//
// don't touch / Option text must match client/src/content.js character for
// character. __tests__/quiz.test.js imports the client file and fails on any
// difference, so a copy edit on one side can't silently break the mapping.
const QUESTIONS = [
  {
    id: 'strength',
    options: [
      { id: 'vision', text: 'Present from memory. Slides were holding me back' },
      { id: 'improv', text: 'Improvise with a whiteboard and unearned confidence' },
      { id: 'grind', text: 'Fix it with a paperclip and pure spite' },
      { id: 'network', text: 'Call a guy who knows a guy' },
    ],
  },
  {
    id: 'monday_vibe',
    options: [
      { id: 'coffee', text: "Third coffee (it's 9:02)" },
      { id: 'suffer', text: 'Stare at the wall until lunch' },
      { id: 'same', text: 'Same as Sunday, honestly' },
      { id: 'hype', text: 'Genuinely love Mondays (liar)' },
    ],
  },
  {
    id: 'coworker_desc',
    options: [
      { id: 'asked', text: 'The one who can just quickly do it. Again.' },
      { id: 'translator', text: 'The one whose ideas need a translator' },
      { id: 'ghost', text: 'Who? We have never met' },
      { id: 'lunch', text: 'The one who knows when lunch arrives' },
    ],
  },
  {
    id: 'five_year_goal',
    options: [
      { id: 'bell', text: 'Ringing the bell at a stock exchange. Any stock exchange' },
      { id: 'palms', text: 'Somewhere with palm trees and bad Wi-Fi' },
      { id: 'desk', text: 'Same desk. Hopefully.' },
      { id: 'thursday', text: "I can't see past Thursday" },
    ],
  },
  {
    // The field question, asked sideways: the tabs give the field away
    // without asking for it outright.
    id: 'desired_field',
    options: [
      { id: 'tech', text: 'Pitch decks and an app that is 90% done' },
      { id: 'creative', text: 'Moodboards and fonts I will never pay for' },
      { id: 'finance', text: 'A spreadsheet tracking my other spreadsheets' },
      { id: 'viral', text: 'My own comments section' },
    ],
  },
];

// Asked after the five questions, "for the photographer". It never affects
// which career comes out (careers.test.js checks the mapping without it); it
// only picks which version of the career's portrait is shot. Optional on the
// wire: a tab opened before it existed sends nothing and gets 'surprise'.
// The client copy is client/src/content.js PORTRAIT_STEP; quiz.test.js keeps
// the two identical.
const PORTRAIT_QUESTION = {
  id: 'portrait_subject',
  options: [
    { id: 'woman', text: 'Shoot me as a woman' },
    { id: 'man', text: 'Shoot me as a man' },
    { id: 'surprise', text: 'Surprise me. The desk will cast someone' },
    // The user's own face (personal portrait). The client collects consent
    // and the selfie on this step and uploads it right after the result is
    // saved; the shared portrait is still shot, as the desk's casting, and
    // is what the cover falls back to if the personal one can't be made.
    { id: 'photo', text: 'Use my own photo' },
  ],
};
const DEFAULT_PORTRAIT = 'surprise';

const QUESTION_IDS = QUESTIONS.map((q) => q.id);

const byText = new Map(QUESTIONS.map((q) => [q.id, new Map(q.options.map((o) => [o.text, o.id]))]));
const byId = new Map(QUESTIONS.map((q) => [q.id, new Map(q.options.map((o) => [o.id, o.text]))]));

/** 'woman' | 'man' | 'surprise' for the photographer's answer, or null if unknown. */
function portraitIdFor(text) {
  return PORTRAIT_QUESTION.options.find((o) => o.text === text)?.id ?? null;
}

/** Option id for an answer's text, or null if it is not a current option. */
function optionIdFor(questionId, text) {
  return byText.get(questionId)?.get(text) ?? null;
}

/** Option text for an id, or null. */
function optionText(questionId, optionId) {
  return byId.get(questionId)?.get(optionId) ?? null;
}

/**
 * Map an { questionId: text } object to { questionId: optionId }. Returns
 * null if any question is missing or holds text that is not a current
 * option (a stale tab or draft from before the questionnaire changed).
 */
function resolveAnswers(answers) {
  if (!answers || typeof answers !== 'object') return null;
  const ids = {};
  for (const q of QUESTION_IDS) {
    const id = optionIdFor(q, answers[q]);
    if (!id) return null;
    ids[q] = id;
  }
  return ids;
}

module.exports = {
  QUESTIONS,
  QUESTION_IDS,
  PORTRAIT_QUESTION,
  DEFAULT_PORTRAIT,
  optionIdFor,
  optionText,
  portraitIdFor,
  resolveAnswers,
};
