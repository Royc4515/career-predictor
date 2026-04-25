const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { upsertUser, findUserById } = require('./db');

passport.serializeUser((user, done) => {
  console.log('[AUTH] Serializing user ID:', user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  console.log('[AUTH] Deserializing user ID:', id);
  try {
    const user = await findUserById(id);
    done(null, user || false);
  } catch (err) {
    done(err, null);
  }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.SERVER_URL}/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        console.log('[AUTH] Google OAuth callback triggered');
        console.log('[AUTH] Google profile received:', profile.displayName, profile.emails[0].value);

        try {
          const user = await upsertUser({
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
  console.log('[AUTH] Google OAuth strategy configured');
} else {
  console.warn('[AUTH] Google OAuth credentials not found — skipping OAuth setup');
}

module.exports = passport;
