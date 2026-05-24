const path = require('node:path');
const { LocalDiskStore } = require('./localDiskStore');
const { R2Store } = require('./r2Store');

function resolveBlobStore(env) {
  const choice = (env.IMAGE_STORE || 'disk').toLowerCase();
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
  throw new Error(`Unknown IMAGE_STORE: ${choice}. Valid: disk, r2`);
}

module.exports = { resolveBlobStore };
