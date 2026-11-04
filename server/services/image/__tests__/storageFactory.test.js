const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const { resolveBlobStore, storeChoice } = require('../storage');
const { WebpStore } = require('../storage/webpStore');
const { TursoStore } = require('../storage/tursoStore');
const { LocalDiskStore } = require('../storage/localDiskStore');

test('a deployment with a Turso database stores portraits there by default', () => {
  assert.equal(storeChoice({ TURSO_DATABASE_URL: 'libsql://x.turso.io' }), 'turso');
  assert.equal(storeChoice({}), 'disk');
  assert.equal(storeChoice({ TURSO_DATABASE_URL: 'libsql://x', IMAGE_STORE: 'Disk' }), 'disk');
});

test('stores are wrapped with WebP unless IMAGE_WEBP=off', () => {
  const env = { IMAGE_STORE: 'disk', IMAGE_CACHE_DIR: os.tmpdir() };
  const wrapped = resolveBlobStore(env);
  assert.ok(wrapped instanceof WebpStore);
  assert.ok(wrapped.inner instanceof LocalDiskStore);
  assert.equal(wrapped.label, 'disk+webp');
  const plain = resolveBlobStore({ ...env, IMAGE_WEBP: 'off' });
  assert.ok(plain instanceof LocalDiskStore);
  assert.equal(plain.label, 'disk');
});

test('turso resolves to a TursoStore (local file without TURSO_DATABASE_URL)', () => {
  const store = resolveBlobStore({ IMAGE_STORE: 'turso' });
  assert.ok(store.inner instanceof TursoStore);
  assert.equal(store.label, 'turso+webp');
});

test('an unknown IMAGE_STORE fails loudly at startup', () => {
  assert.throws(() => resolveBlobStore({ IMAGE_STORE: 's3' }), /Valid: disk, r2, turso/);
});
