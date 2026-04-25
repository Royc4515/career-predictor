const { createClient } = require('@libsql/client');

let client;

async function initDB() {
  client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

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
  console.log('[DB] Users table ready');

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
  console.log('[DB] Onboarding table ready');

  // Add desired_field to any existing DB that was created before this column existed
  try {
    await client.execute('ALTER TABLE onboarding ADD COLUMN desired_field TEXT');
    console.log('[DB] desired_field column added');
  } catch (_) {
    // Column already exists — safe to ignore
  }
}

async function upsertUser({ googleId, email, name, avatarUrl }) {
  console.log('[DB] Upserting user:', email);

  await client.execute({
    sql: `INSERT INTO users (google_id, email, name, avatar_url)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(google_id) DO UPDATE SET
            email = excluded.email,
            name = excluded.name,
            avatar_url = excluded.avatar_url`,
    args: [googleId, email, name, avatarUrl],
  });

  const result = await client.execute({
    sql: 'SELECT * FROM users WHERE google_id = ?',
    args: [googleId],
  });

  const user = result.rows[0] ?? null;
  console.log('[DB] User upserted, DB id:', user?.id);
  return user;
}

async function findUserById(id) {
  const result = await client.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [id],
  });
  return result.rows[0] ?? null;
}

async function saveOnboarding({ userId, strength, mondayVibe, coworkerDesc, fiveYearGoal, desiredField, careerResult, imageUrl }) {
  console.log('[DB] Saving onboarding for user ID:', userId);

  await client.execute({
    sql: 'DELETE FROM onboarding WHERE user_id = ?',
    args: [userId],
  });

  await client.execute({
    sql: `INSERT INTO onboarding (user_id, strength, monday_vibe, coworker_desc, five_year_goal, desired_field, career_result, image_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [userId, strength, mondayVibe, coworkerDesc, fiveYearGoal, desiredField ?? null, careerResult, imageUrl],
  });

  console.log('[DB] Onboarding saved');
}

async function getOnboardingByUserId(userId) {
  const result = await client.execute({
    sql: 'SELECT * FROM onboarding WHERE user_id = ? ORDER BY completed_at DESC LIMIT 1',
    args: [userId],
  });
  return result.rows[0] ?? null;
}

module.exports = { initDB, upsertUser, findUserById, saveOnboarding, getOnboardingByUserId };
