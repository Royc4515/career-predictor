const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  profileToUserFields,
  toPublicUser,
  validateOnboardingAnswers,
  MAX_ANSWER_LENGTH,
} = require('../userData');

const VALID = {
  strength: 'Strategic thinking',
  monday_vibe: 'Powered by coffee',
  coworker_desc: 'Reliable',
  five_year_goal: 'Running the place',
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

test('validateOnboardingAnswers: accepts the four required answers', () => {
  const { answers, error } = validateOnboardingAnswers(VALID);
  assert.equal(error, undefined);
  assert.deepEqual(answers, VALID);
});

test('validateOnboardingAnswers: keeps optional desired_field when present', () => {
  const { answers } = validateOnboardingAnswers({ ...VALID, desired_field: 'Tech' });
  assert.equal(answers.desired_field, 'Tech');
});

test('validateOnboardingAnswers: omits desired_field when empty', () => {
  const { answers } = validateOnboardingAnswers({ ...VALID, desired_field: '' });
  assert.equal('desired_field' in answers, false);
});

test('validateOnboardingAnswers: each missing required answer is rejected', () => {
  for (const key of Object.keys(VALID)) {
    const body = { ...VALID };
    delete body[key];
    assert.ok(validateOnboardingAnswers(body).error, `missing ${key} should fail`);
  }
});

test('validateOnboardingAnswers: whitespace-only required answer is rejected', () => {
  assert.ok(validateOnboardingAnswers({ ...VALID, strength: '   ' }).error);
});

test('validateOnboardingAnswers: non-string answers are rejected (mapCareer would throw)', () => {
  for (const bad of [42, true, { a: 1 }, ['x']]) {
    const { error } = validateOnboardingAnswers({ ...VALID, strength: bad });
    assert.match(error, /must be a string/);
  }
  assert.match(validateOnboardingAnswers({ ...VALID, desired_field: 5 }).error, /must be a string/);
});

test('validateOnboardingAnswers: over-long answer is rejected', () => {
  const long = 'x'.repeat(MAX_ANSWER_LENGTH + 1);
  assert.match(validateOnboardingAnswers({ ...VALID, coworker_desc: long }).error, /too long/);
});

test('validateOnboardingAnswers: answer exactly at the limit is accepted', () => {
  const atLimit = 'x'.repeat(MAX_ANSWER_LENGTH);
  assert.equal(validateOnboardingAnswers({ ...VALID, coworker_desc: atLimit }).error, undefined);
});

test('validateOnboardingAnswers: trims surrounding whitespace', () => {
  const { answers } = validateOnboardingAnswers({ ...VALID, strength: '  Strategic thinking  ' });
  assert.equal(answers.strength, 'Strategic thinking');
});

test('validateOnboardingAnswers: missing or non-object body is rejected', () => {
  assert.ok(validateOnboardingAnswers(undefined).error);
  assert.ok(validateOnboardingAnswers(null).error);
  assert.ok(validateOnboardingAnswers('strength=x').error);
});
