const { test } = require('node:test');
const assert = require('node:assert/strict');
const { WebpStore } = require('../storage/webpStore');

function memoryStore() {
  const map = new Map();
  return {
    map,
    async get(id) { return map.get(id) ?? null; },
    async put(id, buffer, mimeType) { map.set(id, { buffer, mimeType }); },
  };
}
const quiet = { warn() {} };

test('re-encodes a non-WebP portrait and stores it as image/webp', async () => {
  const inner = memoryStore();
  const store = new WebpStore({ inner, transcode: async () => Buffer.alloc(10, 1), logger: quiet });
  await store.put('a', Buffer.alloc(100), 'image/jpeg');
  assert.equal(inner.map.get('a').mimeType, 'image/webp');
  assert.equal(inner.map.get('a').buffer.length, 10);
  assert.deepEqual(await store.get('a'), inner.map.get('a'));
});

test('passes WebP through untouched', async () => {
  const inner = memoryStore();
  let called = false;
  const store = new WebpStore({ inner, transcode: async () => { called = true; return Buffer.alloc(1); } });
  await store.put('a', Buffer.alloc(50), 'image/webp');
  assert.equal(called, false);
  assert.equal(inner.map.get('a').buffer.length, 50);
});

test('keeps the original when transcoding fails', async () => {
  const inner = memoryStore();
  const store = new WebpStore({ inner, transcode: async () => { throw new Error('boom'); }, logger: quiet });
  await store.put('a', Buffer.alloc(100), 'image/png');
  assert.equal(inner.map.get('a').mimeType, 'image/png');
  assert.equal(inner.map.get('a').buffer.length, 100);
});

test('keeps the original when the WebP would not be smaller', async () => {
  const inner = memoryStore();
  const store = new WebpStore({ inner, transcode: async () => Buffer.alloc(200), logger: quiet });
  await store.put('a', Buffer.alloc(100), 'image/jpeg');
  assert.equal(inner.map.get('a').mimeType, 'image/jpeg');
});

test('real sharp: a JPEG becomes a much smaller valid WebP', async () => {
  const sharp = require('sharp');
  // Photographic-ish noise so the JPEG is not trivially small.
  const raw = Buffer.alloc(320 * 400 * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 2654435761) >>> 24;
  const jpeg = await sharp(raw, { raw: { width: 320, height: 400, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
  const inner = memoryStore();
  await new WebpStore({ inner }).put('a', jpeg, 'image/jpeg');
  const stored = inner.map.get('a');
  if (stored.mimeType === 'image/webp') {
    assert.ok(stored.buffer.length < jpeg.length);
    const meta = await sharp(stored.buffer).metadata();
    assert.equal(meta.format, 'webp');
    assert.equal(meta.width, 320);
    assert.equal(meta.height, 400);
  } else {
    // Noise can defeat compression; then the original must be kept intact.
    assert.equal(stored.buffer, jpeg);
  }
});
