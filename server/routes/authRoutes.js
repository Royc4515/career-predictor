const express = require('express');
const passport = require('passport');
const router = express.Router();

// GET /auth/google — redirect to Google OAuth consent screen
router.get('/google', (req, res, next) => {
  console.log('[ROUTE] GET /auth/google - Redirecting to Google OAuth');
  next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /auth/google/callback — handle the OAuth callback from Google
router.get('/google/callback',
  (req, res, next) => {
    console.log('[ROUTE] GET /auth/google/callback - Google OAuth callback received');
    next();
  },
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/?error=auth_failed`,
  }),
  (req, res) => {
    console.log('[ROUTE] Auth successful, session created for user:', req.user.name);
    console.log('[ROUTE] Session ID:', req.sessionID);
    res.redirect(`${process.env.CLIENT_URL}/result`);
  }
);

// GET /auth/logout — destroy session and redirect to client
router.get('/logout', (req, res) => {
  console.log('[ROUTE] GET /auth/logout - Destroying session for user:', req.user?.name);
  req.logout((err) => {
    if (err) {
      console.error('[ROUTE] Logout error:', err);
    }
    req.session.destroy(() => {
      console.log('[ROUTE] Session destroyed, redirecting to client');
      res.redirect(process.env.CLIENT_URL);
    });
  });
});

// GET /auth/me — check if user is authenticated
router.get('/me', (req, res) => {
  console.log('[ROUTE] GET /auth/me - Checking auth state');
  if (req.isAuthenticated()) {
    console.log('[ROUTE] User is authenticated:', req.user.name);
    res.json({ user: req.user });
  } else {
    console.log('[ROUTE] User is NOT authenticated');
    res.status(401).json({ user: null });
  }
});

module.exports = router;
