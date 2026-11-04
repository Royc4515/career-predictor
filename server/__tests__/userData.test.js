const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  profileToUserFields,
  toPublicUser,
  validateOnboardingAnswers,
  MAX_ANSWER_LENGTH,
  STALE_ANSWERS_ERROR,
} = require('../userData');

const VALID = {
  strength: 'Present from memory. Slides were holding me back',
  monday_vibe: "Third coffee (it's 9:02)",
  coworker_desc: 'The one who can just quickly do it. Again.',
  five_year_goal: 'Same desk. Hopefully.',
  desired_field: 'A spreadsheet tracking my other spreadsheets',
};

// --- profileToUserFields ---

test('profileToUserFields: maps a full Google profile', () => {
  const fields = profileToUserFields({
    id: 'g-123',
    displayName: 'Ada',
    emails: [{ value: 'ada@example.com' }],
    photos: [{ value: 'https://img/ada.png' }],
  });
  assert.deepEqual(fields, {
    googleId: 'g-123',
    email: 'ada@example.com',
    name: 'Ada',
    avatarUrl: 'https://img/ada.png',
  });
});

test('profileToUserFields: missing emails/photos do not throw (was a crash)', () => {
  const fields = profileToUserFields({ id: 'g-1', displayName: 'No Email' });
  assert.equal(fields.email, null);
  assert.equal(fields.avatarUrl, null);
});

test('profileToUserFields: empty emails/photos arrays do not throw', () => {
  const fields = profileToUserFields({ id: 'g-1', displayName: 'X', emails: [], photos: [] });
  assert.equal(fields.email, null);
  assert.equal(fields.avatarUrl, null);
});

// --- toPublicUser ---

test('toPublicUser: never exposes google_id or other private columns', () => {
  const pub = toPublicUser({
    id: 7,
    google_id: 'secret-google-sub',
    email: 'a@b.c',
    name: 'Ada',
    avatar_url: 'https://img/a.png',
    created_at: '2026-01-01',
  });
  assert.deepEqual(pub, { id: 7, name: 'Ada', email: 'a@b.c', avatarUrl: 'https://img/a.png' });
  assert.equal('google_id' in pub, false);
});

test('toPublicUser: null in, null out', () => {
  assert.equal(toPublicUser(null), null);
  assert.equal(toPublicUser(undefined), null);
});

// --- validateOnboardingAnswers ---

test('validateOnboardingAnswers: accepts all five current options', () => {
  const { answers, error } = validateOnboardingAnswers(VALID);
  assert.equal(error, undefined);
  assert.deepEqual(answers, VALID);
});

test('validateOnboardingAnswers: each missing answer is rejected, the field included', () => {
  for (const key of Object.keys(VALID)) {
    const body = { ...VALID };
    delete body[key];
    assert.match(validateOnboardingAnswers(body).error, /All five answers/, `missing ${key} should fail`);
    assert.match(validateOnboardingAnswers({ ...VALID, [key]: '' }).error, /All five answers/);
  }
});

test('validateOnboardingAnswers: whitespace-only answer is rejected', () => {
  assert.ok(validateOnboardingAnswers({ ...VALID, strength: '   ' }).error);
});

test('validateOnboardingAnswers: non-string answers are rejected', () => {
  for (const bad of [42, true, { a: 1 }, ['x']]) {
    const { error } = validateOnboardingAnswers({ ...VALID, strength: bad });
    assert.match(error, /must be a string/);
  }
  assert.match(validateOnboardingAnswers({ ...VALID, desired_field: 5 }).error, /must be a string/);
});

test('validateOnboardingAnswers: over-long answer is rejected before the option lookup', () => {
  const long = 'x'.repeat(MAX_ANSWER_LENGTH + 1);
  assert.match(validateOnboardingAnswers({ ...VALID, coworker_desc: long }).error, /too long/);
});

test('validateOnboardingAnswers: text that is not a current option gets the reload message', () => {
  // An open tab or saved draft from before the questionnaire changed.
  assert.equal(validateOnboardingAnswers({ ...VALID, strength: 'Strategic thinking' }).error, STALE_ANSWERS_ERROR);
  assert.equal(validateOnboardingAnswers({ ...VALID, coworker_desc: 'x'.repeat(10) }).error, STALE_ANSWERS_ERROR);
});

test('validateOnboardingAnswers: trims surrounding whitespace', () => {
  const { answers } = validateOnboardingAnswers({ ...VALID, strength: '  Present from memory. Slides were holding me back  ' });
  assert.equal(answers.strength, 'Present from memory. Slides were holding me back');
});

test('validateOnboardingAnswers: ignores unknown extra fields', () => {
  const { answers } = validateOnboardingAnswers({ ...VALID, role: 'admin' });
  assert.equal('role' in answers, false);
});

test('validateOnboardingAnswers: missing or non-object body is rejected', () => {
  assert.ok(validateOnboardingAnswers(undefined).error);
  assert.ok(validateOnboardingAnswers(null).error);
  assert.ok(validateOnboardingAnswers('strength=x').error);
});

// --- the photographer's answer (portrait_subject) ---

test('validateOnboardingAnswers: the photo choice is optional (older clients send none)', () => {
  const { answers, error } = validateOnboardingAnswers(VALID);
  assert.equal(error, undefined);
  assert.equal('portrait_subject' in answers, false);
});

test('validateOnboardingAnswers: a current photo choice is kept, trimmed', () => {
  const { answers } = validateOnboardingAnswers({ ...VALID, portrait_subject: '  Shoot me as a man ' });
  assert.equal(answers.portrait_subject, 'Shoot me as a man');
});

test('validateOnboardingAnswers: an unknown or non-string photo choice is rejected', () => {
  assert.equal(validateOnboardingAnswers({ ...VALID, portrait_subject: 'man' }).error, STALE_ANSWERS_ERROR);
  assert.match(validateOnboardingAnswers({ ...VALID, portrait_subject: 7 }).error, /must be a string/);
});
