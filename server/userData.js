// Pure helpers for shaping user data at the edges (OAuth profile in, API
// payloads out, quiz answers in). Kept free of db/passport imports so they
// can be unit tested without initializing either.

const { QUESTION_IDS, PORTRAIT_QUESTION, optionIdFor, portraitIdFor } = require('./quiz');

// Every real option is well under this. Checked before the option lookup so
// a hand-crafted request is turned away cheaply.
const MAX_ANSWER_LENGTH = 200;

// A tab or saved draft from before the questionnaire changed sends option
// text that no longer exists. Say what to do instead of a generic error.
const STALE_ANSWERS_ERROR = 'The questionnaire was updated. Reload the page and answer again.';

/**
 * Map a passport-google-oauth20 profile to the fields upsertUser() expects.
 * Google can omit emails (scope not granted) or photos, so neither is
 * assumed to exist.
 */
function profileToUserFields(profile) {
  return {
    googleId: profile.id,
    email: profile.emails?.[0]?.value || null,
    name: profile.displayName || null,
    avatarUrl: profile.photos?.[0]?.value || null,
  };
}

/**
 * The subset of a users row that is safe to send to the browser.
 * Deliberately a whitelist: new columns stay private unless added here.
 */
function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar_url,
  };
}

/**
 * Validate the onboarding request body: all five answers, each the exact
 * text of a current option (quiz.js), plus the optional photographer's
 * answer (portrait_subject).
 * Returns { answers } (trimmed text keyed by question id) on success or
 * { error } with a client-facing message.
 */
function validateOnboardingAnswers(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' };
  }

  const answers = {};
  for (const key of QUESTION_IDS) {
    const value = body[key];
    if (value === undefined || value === null) {
      return { error: 'All five answers are required' };
    }
    if (typeof value !== 'string') {
      return { error: `Answer "${key}" must be a string` };
    }
    const trimmed = value.trim();
    if (trimmed === '') {
      return { error: 'All five answers are required' };
    }
    if (trimmed.length > MAX_ANSWER_LENGTH) {
      return { error: `Answer "${key}" is too long` };
    }
    if (!optionIdFor(key, trimmed)) {
      return { error: STALE_ANSWERS_ERROR };
    }
    answers[key] = trimmed;
  }

  // Optional: a client from before the photographer's question sends none.
  const portrait = body[PORTRAIT_QUESTION.id];
  if (portrait !== undefined && portrait !== null && portrait !== '') {
    if (typeof portrait !== 'string') return { error: `Answer "${PORTRAIT_QUESTION.id}" must be a string` };
    if (!portraitIdFor(portrait.trim())) return { error: STALE_ANSWERS_ERROR };
    answers[PORTRAIT_QUESTION.id] = portrait.trim();
  }

  return { answers };
}

module.exports = {
  profileToUserFields,
  toPublicUser,
  validateOnboardingAnswers,
  MAX_ANSWER_LENGTH,
  STALE_ANSWERS_ERROR,
};
