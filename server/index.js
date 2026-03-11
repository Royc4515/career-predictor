// Load environment variables FIRST — before anything else reads process.env
require('dotenv').config();
console.log('[SERVER] Environment loaded');
console.log('[SERVER] CLIENT_URL:', process.env.CLIENT_URL);
console.log('[SERVER] SERVER_URL:', process.env.SERVER_URL);

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { initDB } = require('./db');

const app = express();

// --- CORS (must be before routes) ---
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
console.log('[SERVER] CORS configured for:', process.env.CLIENT_URL);

// --- Body parsers ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Session middleware (must be before Passport) ---
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: false,    // false for localhost (HTTP)
    sameSite: 'lax',  // 'lax' allows cookies on OAuth redirect flow
  },
}));
console.log('[SERVER] Session middleware configured (memory store)');

// Initialize DB (async), then set up Passport and start server
initDB().then(() => {
  // Require auth.js AFTER db is initialized (it imports db functions)
  const passport = require('./auth');
  const authRoutes = require('./routes/authRoutes');

  // --- Passport middleware (must be after session) ---
  app.use(passport.initialize());
  app.use(passport.session());
  console.log('[SERVER] Passport initialized');

  // --- Routes ---
  const userRoutes = require('./routes/userRoutes');
  app.use('/auth', authRoutes);
  app.use('/api/user', userRoutes);
  console.log('[SERVER] Auth routes mounted at /auth');
  console.log('[SERVER] User routes mounted at /api/user');

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // --- Start server ---
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`[SERVER] Running on port ${PORT}`);
    console.log(`[SERVER] Auth URL: ${process.env.SERVER_URL}/auth/google`);
  });
}).catch((err) => {
  console.error('[SERVER] Failed to initialize database:', err);
  process.exit(1);
});
