const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { upsertUser, findUserById } = require('./db');

// --- Serialize: store only user.id in the session cookie ---
passport.serializeUser((user, done) => {
  console.log('[AUTH] Serializing user ID:', user.id);
  done(null, user.id);
});

// --- Deserialize: fetch full user from DB on each request ---
passport.deserializeUser((id, done) => {
  console.log('[AUTH] Deserializing user ID:', id);
  try {
    const user = findUserById(id);
    done(null, user || false);
  } catch (err) {
    done(err, null);
  }
});

// --- Google OAuth 2.0 Strategy ---
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/auth/google/callback`,
    },
    (accessToken, refreshToken, profile, done) => {
      console.log('[AUTH] Google OAuth callback triggered');
      console.log('[AUTH] Google profile received:', profile.displayName, profile.emails[0].value);

      try {
        const user = upsertUser({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          avatarUrl: profile.photos[0]?.value || null,
        });

        console.log('[AUTH] User upserted in DB, ID:', user.id);
        done(null, user);
      } catch (err) {
        console.error('[AUTH] Error in Google strategy callback:', err);
        done(err, null);
      }
    }
  )
);

module.exports = passport;
