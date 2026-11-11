const path = require('path');
const { createClient } = require('@libsql/client');

// One client for both environments. In production TURSO_DATABASE_URL points
// at the hosted Turso database, which survives Render redeploys (the free
// tier wipes local disk). Without it, the same libsql client uses a local
// SQLite file, so development needs no account.
const DEFAULT_FILE = path.join(__dirname, 'career-predictor.db');

// Back issues kept per user; the oldest beyond this are pruned on each new
// cover. Thirty covers is a long scroll and a bounded amount of rows.
const MAX_BACK_ISSUES = 30;

let client;

function connectionConfig(env = process.env) {
  if (env.TURSO_DATABASE_URL) {
    return { url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN || undefined };
  }
  return { url: `file:${DEFAULT_FILE}` };
}

/**
 * Connect and bring the schema up to date. Must be awaited before any other
 * function here is called. `config` overrides the environment (tests pass
 * { url: ':memory:' }).
 */
async function initDB(config = connectionConfig()) {
  client = createClient(config);
  console.log(`[DB] Connected (${config.url.startsWith('file:') || config.url === ':memory:' ? 'local' : 'remote'})`);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT,
      name TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS onboarding (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      strength TEXT,
      monday_vibe TEXT,
      coworker_desc TEXT,
      five_year_goal TEXT,
      desired_field TEXT,
      career_result TEXT,
      image_url TEXT,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Additive migrations. The production Turso database was created by an
  // earlier version without image_id, and very old databases lack
  // desired_field; both are added in place without touching existing rows.
  await addColumnIfMissing('onboarding', 'desired_field', 'TEXT');
  // image_id (16-hex content hash) for new rows; image_url is kept for legacy
  // rows that point at the Pollinations CDN, and reads fall back to it.
  await addColumnIfMissing('onboarding', 'image_id', 'TEXT');
  // The photographer's answer ('woman' | 'man' | 'surprise'), so a future
  // gallery or reshoot knows which version of the portrait a result used.
  await addColumnIfMissing('onboarding', 'portrait_subject', 'TEXT');
  // Personal portrait (opt-in, the user's own face): the image id in the
  // images table, 'generating' | 'ready' | 'failed', and when consent was
  // given. Never the uploaded photo itself: that only ever lives in memory.
  await addColumnIfMissing('onboarding', 'personal_image_id', 'TEXT');
  await addColumnIfMissing('onboarding', 'personal_status', 'TEXT');
  await addColumnIfMissing('onboarding', 'personal_consent_at', 'TEXT');

  // "Your back issues": every cover a user has been given, newest first.
  // `onboarding` stays the single current result (its row is replaced on a
  // retake); this table is the archive. Personal portraits are deliberately
  // not archived: the consent screen promises a retake deletes them.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS covers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      career_result TEXT NOT NULL,
      image_id TEXT,
      portrait_subject TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute('CREATE INDEX IF NOT EXISTS covers_user_created ON covers (user_id, id DESC)');
  // One-time import: users whose result predates the archive start with it as
  // their first back issue. Idempotent (only users with no archived cover).
  const imported = await client.execute(`
    INSERT INTO covers (user_id, career_result, image_id, portrait_subject, created_at)
    SELECT user_id, career_result, image_id, portrait_subject, completed_at FROM onboarding
    WHERE user_id IS NOT NULL AND career_result IS NOT NULL
      AND user_id NOT IN (SELECT DISTINCT user_id FROM covers)
  `);
  if (imported.rowsAffected) console.log(`[DB] Archived ${imported.rowsAffected} existing result(s) as back issues`);

  console.log('[DB] Schema ready');
  return client;
}

/**
 * Checks the schema first instead of relying on ALTER TABLE throwing for an
 * existing column, so any other failure (typo, permissions, network) surfaces
 * at startup instead of being swallowed.
 */
async function addColumnIfMissing(table, column, type) {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  const existing = info.rows.map((row) => row.name);
  if (existing.includes(column)) return;
  await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  console.log(`[DB] Migrated: added ${table}.${column} column`);
}

// libsql rows are array-like objects with extra properties; callers (and
// toPublicUser) expect plain objects keyed by column.
function plain(row) {
  return row ? { ...row } : null;
}

/** Insert or update a user by Google id; returns the stored row. */
async function upsertUser({ googleId, email, name, avatarUrl }) {
  await client.execute({
    sql: `INSERT INTO users (google_id, email, name, avatar_url)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(google_id) DO UPDATE SET
            email = excluded.email,
            name = excluded.name,
            avatar_url = excluded.avatar_url`,
    args: [googleId, email ?? null, name ?? null, avatarUrl ?? null],
  });
  const result = await client.execute({ sql: 'SELECT * FROM users WHERE google_id = ?', args: [googleId] });
  const user = plain(result.rows[0]);
  console.log('[DB] User upserted, DB id:', user?.id);
  return user;
}

/** Used by Passport's deserializeUser on every authenticated request. */
async function findUserById(id) {
  const result = await client.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
  return plain(result.rows[0]);
}

/**
 * Save answers and result, replacing any previous record (one result per
 * user). Both statements run in one batch so a failure cannot leave the user
 * with their old result deleted and no new one.
 */
async function saveOnboarding({
  userId,
  strength,
  mondayVibe,
  coworkerDesc,
  fiveYearGoal,
  desiredField,
  careerResult,
  imageUrl,
  imageId,
  portraitSubject,
}) {
  await client.batch(
    [
      { sql: 'DELETE FROM onboarding WHERE user_id = ?', args: [userId] },
      {
        sql: `INSERT INTO onboarding (user_id, strength, monday_vibe, coworker_desc, five_year_goal, desired_field, career_result, image_url, image_id, portrait_subject)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          userId,
          strength,
          mondayVibe,
          coworkerDesc,
          fiveYearGoal,
          desiredField || null,
          careerResult,
          imageUrl || null,
          imageId || null,
          portraitSubject || null,
        ],
      },
      // Archive the same cover and prune past the cap, in the same write
      // batch, so the current result and the archive can't disagree.
      {
        sql: 'INSERT INTO covers (user_id, career_result, image_id, portrait_subject) VALUES (?, ?, ?, ?)',
        args: [userId, careerResult, imageId || null, portraitSubject || null],
      },
      {
        sql: `DELETE FROM covers WHERE user_id = ? AND id NOT IN (
                SELECT id FROM covers WHERE user_id = ? ORDER BY id DESC LIMIT ?
              )`,
        args: [userId, userId, MAX_BACK_ISSUES],
      },
    ],
    'write',
  );
  console.log('[DB] Onboarding saved for user ID:', userId);
}

/** A user's back issues, newest first. */
async function getCovers(userId) {
  const result = await client.execute({
    sql: 'SELECT id, career_result, image_id, portrait_subject, created_at FROM covers WHERE user_id = ? ORDER BY id DESC',
    args: [userId],
  });
  return result.rows.map(plain);
}

/** Remove one back issue; true if it existed and was the user's. */
async function deleteCover(userId, coverId) {
  const result = await client.execute({ sql: 'DELETE FROM covers WHERE id = ? AND user_id = ?', args: [coverId, userId] });
  return result.rowsAffected > 0;
}

/** Point a saved result at its current shared portrait id. */
async function updateImageId(userId, imageId) {
  await client.execute({ sql: 'UPDATE onboarding SET image_id = ? WHERE user_id = ?', args: [imageId, userId] });
}

/** Attach a newly started personal portrait to the user's current result. */
async function setPersonalPortrait(userId, { imageId, status, consentAt }) {
  await client.execute({
    sql: `UPDATE onboarding SET personal_image_id = ?, personal_status = ?, personal_consent_at = ?
          WHERE user_id = ?`,
    args: [imageId, status, consentAt, userId],
  });
}

/**
 * Record how generation ended. Matches on the image id so a late finish of an
 * older upload can't overwrite a newer one (or a removal).
 */
async function updatePersonalStatus(userId, imageId, status) {
  await client.execute({
    sql: 'UPDATE onboarding SET personal_status = ? WHERE user_id = ? AND personal_image_id = ?',
    args: [status, userId, imageId],
  });
}

async function clearPersonalPortrait(userId) {
  await client.execute({
    sql: `UPDATE onboarding SET personal_image_id = NULL, personal_status = NULL, personal_consent_at = NULL
          WHERE user_id = ?`,
    args: [userId],
  });
}

/** The user's latest result, or null. */
async function getOnboardingByUserId(userId) {
  const result = await client.execute({
    sql: 'SELECT * FROM onboarding WHERE user_id = ? ORDER BY completed_at DESC, id DESC LIMIT 1',
    args: [userId],
  });
  return plain(result.rows[0]);
}

module.exports = {
  initDB,
  connectionConfig,
  upsertUser,
  findUserById,
  saveOnboarding,
  getOnboardingByUserId,
  updateImageId,
  getCovers,
  deleteCover,
  MAX_BACK_ISSUES,
  setPersonalPortrait,
  updatePersonalStatus,
  clearPersonalPortrait,
};
