// Pure helpers for shaping user data at the edges (OAuth profile in, API
// payloads out, quiz answers in). Kept free of db/passport imports so they
// can be unit tested without initializing either.

const REQUIRED_ANSWERS = ['strength', 'monday_vibe', 'coworker_desc', 'five_year_goal'];
const OPTIONAL_ANSWERS = ['desired_field'];

// Every real option in client/src/pages/Onboarding.jsx is well under this.
// The cap only exists so a hand-crafted request can't store arbitrarily
// large strings in the DB.
const MAX_ANSWER_LENGTH = 200;

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
 * Validate the onboarding request body.
 * Returns { answers } on success or { error } with a client-facing message.
 * mapCareer() calls .includes() on every answer, so a non-string value
 * (number, object) would throw there; reject it here instead.
 */
function validateOnboardingAnswers(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' };
  }

  const answers = {};
  for (const key of [...REQUIRED_ANSWERS, ...OPTIONAL_ANSWERS]) {
    const value = body[key];
    const required = REQUIRED_ANSWERS.includes(key);

    if (value === undefined || value === null || value === '') {
      if (required) return { error: 'All four answers are required' };
      continue;
    }
    if (typeof value !== 'string') {
      return { error: `Answer "${key}" must be a string` };
    }
    const trimmed = value.trim();
    if (required && trimmed === '') {
      return { error: 'All four answers are required' };
    }
    if (trimmed.length > MAX_ANSWER_LENGTH) {
      return { error: `Answer "${key}" is too long` };
    }
    answers[key] = trimmed;
  }

  return { answers };
}

module.exports = {
  profileToUserFields,
  toPublicUser,
  validateOnboardingAnswers,
  MAX_ANSWER_LENGTH,
};
