const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createClient } = require('@libsql/client');
const db = require('../db');

// A real SQLite file through the same libsql client production uses against
// Turso, so SQL, PRAGMA and batch behaviour are exercised for real.
let file;
function freshUrl() {
  file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cp-db-')), 'test.db');
  return { url: `file:${file}` };
}

const quiet = () => {
  const log = console.log;
  console.log = () => {};
  return () => (console.log = log);
};

beforeEach(async () => {
  const restore = quiet();
  await db.initDB(freshUrl());
  restore();
});

test('connectionConfig: Turso when TURSO_DATABASE_URL is set, local file otherwise', () => {
  assert.deepEqual(db.connectionConfig({ TURSO_DATABASE_URL: 'libsql://x.turso.io', TURSO_AUTH_TOKEN: 't' }), {
    url: 'libsql://x.turso.io',
    authToken: 't',
  });
  assert.match(db.connectionConfig({}).url, /^file:.*career-predictor\.db$/);
});

test('upsertUser inserts, then updates the same Google account in place', async () => {
  const restore = quiet();
  const a = await db.upsertUser({ googleId: 'g1', email: 'a@x', name: 'Roy', avatarUrl: null });
  const b = await db.upsertUser({ googleId: 'g1', email: 'new@x', name: 'Roy C', avatarUrl: 'p' });
  restore();
  assert.equal(a.id, b.id);
  assert.equal(b.email, 'new@x');
  assert.deepEqual(await db.findUserById(a.id), b);
  assert.equal(await db.findUserById(999), null);
});

test('rows come back as plain objects (toPublicUser and JSON rely on it)', async () => {
  const restore = quiet();
  const u = await db.upsertUser({ googleId: 'g2', email: null, name: null, avatarUrl: null });
  restore();
  assert.equal(Object.getPrototypeOf(u), Object.prototype);
  assert.deepEqual(Object.keys(JSON.parse(JSON.stringify(u))).sort(), ['avatar_url', 'created_at', 'email', 'google_id', 'id', 'name']);
});

test('saveOnboarding keeps exactly one result per user, the latest', async () => {
  const restore = quiet();
  const u = await db.upsertUser({ googleId: 'g3', email: 'c@x', name: 'C', avatarUrl: null });
  const base = { userId: u.id, strength: 's', mondayVibe: 'm', coworkerDesc: 'c', fiveYearGoal: 'g' };
  await db.saveOnboarding({ ...base, careerResult: '{"title":"First"}', imageId: 'aaaaaaaaaaaaaaaa' });
  await db.saveOnboarding({ ...base, careerResult: '{"title":"Second"}', imageId: 'bbbbbbbbbbbbbbbb' });
  restore();
  const row = await db.getOnboardingByUserId(u.id);
  assert.equal(JSON.parse(row.career_result).title, 'Second');
  assert.equal(row.image_id, 'bbbbbbbbbbbbbbbb');
  const count = await createClient({ url: `file:${file}` }).execute('SELECT COUNT(*) AS n FROM onboarding');
  assert.equal(Number(count.rows[0].n), 1);
  assert.equal(await db.getOnboardingByUserId(12345), null);
});

test('migrates the schema production Turso has today without losing its rows', async () => {
  // Exactly the tables the previous Turso-backed version created: no image_id.
  const url = freshUrl();
  const legacy = createClient(url);
  await legacy.execute(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, google_id TEXT UNIQUE NOT NULL,
    email TEXT, name TEXT, avatar_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await legacy.execute(`CREATE TABLE onboarding (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id),
    strength TEXT, monday_vibe TEXT, coworker_desc TEXT, five_year_goal TEXT, desired_field TEXT,
    career_result TEXT, image_url TEXT, completed_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await legacy.execute("INSERT INTO users (google_id, email, name) VALUES ('g-old', 'old@x', 'Old User')");
  await legacy.execute(`INSERT INTO onboarding (user_id, strength, career_result, image_url)
    VALUES (1, 's', '{"title":"JIRA Ticket Archaeologist"}', 'https://image.pollinations.ai/prompt/x')`);

  const restore = quiet();
  await db.initDB(url);
  await db.initDB(url); // idempotent: a second boot must not fail on existing columns
  restore();

  const cols = (await createClient(url).execute('PRAGMA table_info(onboarding)')).rows.map((r) => r.name);
  assert.ok(cols.includes('image_id'));
  const user = await db.findUserById(1);
  assert.equal(user.email, 'old@x');
  const row = await db.getOnboardingByUserId(1);
  assert.equal(JSON.parse(row.career_result).title, 'JIRA Ticket Archaeologist');
  assert.equal(row.image_url, 'https://image.pollinations.ai/prompt/x');
  assert.equal(row.image_id, null);
});
