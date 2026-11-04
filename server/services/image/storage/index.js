const path = require('node:path');
const { createClient } = require('@libsql/client');
const { connectionConfig } = require('../../../db');
const { LocalDiskStore } = require('./localDiskStore');
const { R2Store } = require('./r2Store');
const { TursoStore } = require('./tursoStore');
const { WebpStore } = require('./webpStore');

const VALID = ['disk', 'r2', 'turso'];

/**
 * Which backend holds portraits. An explicit IMAGE_STORE wins. Otherwise a
 * deployment that already has a Turso database uses it, so production keeps
 * its images across Render deploys with no extra setting; local development
 * (no TURSO_DATABASE_URL) keeps the zero-config disk cache.
 */
function storeChoice(env) {
  if (env.IMAGE_STORE) return env.IMAGE_STORE.toLowerCase();
  return env.TURSO_DATABASE_URL ? 'turso' : 'disk';
}

function resolveBackend(env, choice) {
  if (choice === 'disk') {
    return new LocalDiskStore({ cacheDir: env.IMAGE_CACHE_DIR || path.resolve(process.cwd(), 'data', 'image-cache') });
  }
  if (choice === 'r2') {
    return new R2Store({
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucket: env.R2_BUCKET,
    });
  }
  if (choice === 'turso') {
    // Same database as the app (connectionConfig reads TURSO_DATABASE_URL /
    // TURSO_AUTH_TOKEN, or falls back to the local SQLite file).
    return new TursoStore({ client: createClient(connectionConfig(env)) });
  }
  throw new Error(`Unknown IMAGE_STORE: ${choice}. Valid: ${VALID.join(', ')}`);
}

function resolveBlobStore(env) {
  const choice = storeChoice(env);
  const backend = resolveBackend(env, choice);
  // IMAGE_WEBP=off stores provider output as-is (debugging a provider).
  const store = env.IMAGE_WEBP === 'off' ? backend : new WebpStore({ inner: backend });
  store.label = `${choice}${store === backend ? '' : '+webp'}`;
  return store;
}

module.exports = { resolveBlobStore, storeChoice };
