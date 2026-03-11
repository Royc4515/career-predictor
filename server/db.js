const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'career-predictor.db');

let db;

/**
 * Initialize the database. Must be called (and awaited) before using any db functions.
 */
async function initDB() {
  const SQL = await initSqlJs();

  // Load existing database file if it exists, otherwise create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('[DB] SQLite database loaded from file');
  } else {
    db = new SQL.Database();
    console.log('[DB] New SQLite database created');
  }

  // Create tables
  db.run(`
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

  db.run(`
    CREATE TABLE IF NOT EXISTS onboarding (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      strength TEXT,
      monday_vibe TEXT,
      coworker_desc TEXT,
      five_year_goal TEXT,
      career_result TEXT,
      image_url TEXT,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('[DB] Onboarding table ready');

  return db;
}

/** Save the in-memory database to disk */
function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Insert or update a user based on their Google ID.
 * Returns the user row from the database.
 */
function upsertUser({ googleId, email, name, avatarUrl }) {
  console.log('[DB] Upserting user:', email);

  db.run(
    `INSERT INTO users (google_id, email, name, avatar_url)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(google_id) DO UPDATE SET
       email = excluded.email,
       name = excluded.name,
       avatar_url = excluded.avatar_url`,
    [googleId, email, name, avatarUrl]
  );

  const stmt = db.prepare('SELECT * FROM users WHERE google_id = ?');
  stmt.bind([googleId]);
  let user = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    user = row;
  }
  stmt.free();

  saveDB();
  console.log('[DB] User upserted, DB id:', user?.id);
  return user;
}

/**
 * Find a user by their internal database ID.
 * Used by Passport's deserializeUser.
 */
function findUserById(id) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  stmt.bind([id]);
  let user = null;
  if (stmt.step()) {
    user = stmt.getAsObject();
  }
  stmt.free();
  return user;
}

module.exports = { initDB, upsertUser, findUserById, saveDB };
