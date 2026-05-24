const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { LocalDiskStore } = require('../storage/localDiskStore');

let tempDir;
let store;

before(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'localdisk-test-'));
  store = new LocalDiskStore({ cacheDir: tempDir });
});

after(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

test('constructor throws when cacheDir is missing', () => {
  assert.throws(() => new LocalDiskStore({}), /cacheDir/);
});

test('get(): returns null for a missing id (does not throw, per spec §5)', async () => {
  assert.equal(await store.get('0000000000000000'), null);
});

test('put() then get(): roundtrip preserves bytes and mimeType', async () => {
  const id = 'abcdef0123456789';
  const buf = Buffer.from('roundtrip-bytes');
  await store.put(id, buf, 'image/png');
  const out = await store.get(id);
  assert.ok(out);
  assert.equal(out.buffer.toString(), 'roundtrip-bytes');
  assert.equal(out.mimeType, 'image/png');
});

test('put(): idempotent — second put with same id is a harmless overwrite', async () => {
  const id = '1111222233334444';
  await store.put(id, Buffer.from('first'), 'image/png');
  await store.put(id, Buffer.from('first'), 'image/png');
  const out = await store.get(id);
  assert.equal(out.buffer.toString(), 'first');
});

test('different mimeTypes are persisted distinctly per id', async () => {
  const id = 'aaaabbbbccccdddd';
  await store.put(id, Buffer.from('xx'), 'image/jpeg');
  const out = await store.get(id);
  assert.equal(out.mimeType, 'image/jpeg');
});
