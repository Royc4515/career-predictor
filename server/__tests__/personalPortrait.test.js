const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { ReferencePhotos } = require('../services/image/referencePhotos');
const { PersonalPortraitService } = require('../services/image/personalPortraits');
const promptBuilder = require('../services/image/promptBuilder');
const { normalizePhoto, PhotoError } = require('../photoUpload');
const { SlidingWindowLimiter } = require('../rateLimit');
const { CAREERS, FALLBACK, personalSceneFor } = require('../careers');

const SIZE = { width: 896, height: 1120 };
const memoryStore = () => {
  const map = new Map();
  return {
    map,
    async get(id) { return map.get(id) ?? null; },
    async put(id, buffer, mimeType) { map.set(id, { buffer, mimeType }); },
    async delete(id) { map.delete(id); },
  };
};
const quiet = { log() {}, warn() {}, error() {} };
const settle = (ms = 20) => new Promise((r) => setTimeout(r, ms));

// --- ReferencePhotos ---

test('reference photos: random tokens, limited fetches, expiry and delete', () => {
  let clock = 0;
  const refs = new ReferencePhotos({ ttlMs: 100, maxFetches: 2, now: () => clock });
  const t = refs.put(Buffer.from('face'), 'image/jpeg');
  assert.match(t, /^[0-9a-f]{32}$/);
  assert.notEqual(refs.put(Buffer.from('x'), 'image/jpeg'), t);
  assert.equal(refs.take(t).buffer.toString(), 'face');
  assert.ok(refs.take(t));
  assert.equal(refs.take(t), null, 'third fetch refused');
  const t2 = refs.put(Buffer.from('face2'), 'image/jpeg');
  clock = 101;
  assert.equal(refs.take(t2), null, 'expired');
  const t3 = refs.put(Buffer.from('face3'), 'image/jpeg');
  refs.delete(t3);
  assert.equal(refs.take(t3), null);
  assert.equal(refs.take('../../etc/passwd'), null);
});

test('reference photos: a hard cap evicts the oldest', () => {
  const refs = new ReferencePhotos({ maxItems: 2 });
  const a = refs.put(Buffer.from('a'), 'image/jpeg');
  refs.put(Buffer.from('b'), 'image/jpeg');
  refs.put(Buffer.from('c'), 'image/jpeg');
  assert.equal(refs.take(a), null);
  assert.equal(refs.size, 2);
});

// --- PersonalPortraitService ---

function service({ providers, base = 'https://site.example', store = memoryStore(), refs = new ReferencePhotos() } = {}) {
  return { store, refs, svc: new PersonalPortraitService({ providers, blobStore: store, refs, promptBuilder, size: SIZE, publicBaseUrl: base, logger: quiet }) };
}

test('personal: unavailable without an image-to-image provider or a public https base URL', () => {
  assert.equal(service({ providers: [] }).svc.available, false);
  assert.equal(service({ providers: [{ generate() {} }], base: 'http://localhost:5000' }).svc.available, false);
  assert.equal(service({ providers: [{ generate() {} }] }).svc.available, true);
  assert.throws(() => service({ providers: [] }).svc.start({ photo: { buffer: Buffer.from('x') }, scene: 's', title: 't' }));
});

test('personal: sends a neutral prompt plus the reference URL, stores the result, deletes the photo', async () => {
  let input;
  let photoDuringRender;
  const { svc, store, refs } = service({
    providers: [{
      model: 'm1',
      async generate(i) {
        input = i;
        photoDuringRender = refs.take(new URL(i.referenceUrl).pathname.split('/').pop());
        return { buffer: Buffer.from('portrait'), mimeType: 'image/webp' };
      },
    }],
  });
  const statuses = [];
  const { id } = svc.start({ photo: { buffer: Buffer.from('face'), mimeType: 'image/jpeg' }, scene: 'holding a cake', title: 'T', onDone: (s) => statuses.push(s) });
  assert.match(id, /^[0-9a-f]{16}$/);
  assert.equal(svc.isGenerating(id), true);
  await settle();
  assert.deepEqual(statuses, ['ready']);
  assert.equal(svc.isGenerating(id), false);
  assert.equal(store.map.get(id).buffer.toString(), 'portrait');
  assert.match(input.referenceUrl, /^https:\/\/site\.example\/api\/ref\/[0-9a-f]{32}$/);
  assert.ok(input.prompt.startsWith(promptBuilder.PERSONAL_IDENTITY + 'holding a cake'));
  assert.equal(input.width, 896);
  assert.equal(photoDuringRender.buffer.toString(), 'face');
  assert.equal(refs.size, 0, 'photo deleted after generation');
});

test('personal: a refused model falls through to the next; all refused reports failed and still deletes the photo', async () => {
  const refused = { model: 'flash', async generate() { throw new Error('422 content moderation'); } };
  const ok = { model: 'full', async generate() { return { buffer: Buffer.from('p'), mimeType: 'image/webp' }; } };
  const a = service({ providers: [refused, ok] });
  const s1 = [];
  const { id } = a.svc.start({ photo: { buffer: Buffer.from('f'), mimeType: 'image/jpeg' }, scene: 's', title: 't', onDone: (s) => s1.push(s) });
  await settle();
  assert.deepEqual(s1, ['ready']);
  assert.ok(a.store.map.get(id));

  const b = service({ providers: [refused, refused] });
  const s2 = [];
  b.svc.start({ photo: { buffer: Buffer.from('f'), mimeType: 'image/jpeg' }, scene: 's', title: 't', onDone: (s) => s2.push(s) });
  await settle();
  assert.deepEqual(s2, ['failed']);
  assert.equal(b.store.map.size, 0);
  assert.equal(b.refs.size, 0);
});

// --- normalizePhoto ---

async function jpegWithGps(width, height) {
  return sharp({ create: { width, height, channels: 3, background: { r: 120, g: 80, b: 60 } } })
    .jpeg()
    .withExif({ IFD0: { Make: 'TestPhone' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '32/1 4/1 0/1' } })
    .toBuffer();
}

test('normalizePhoto: re-encodes to a JPEG of at most 1024 px with no metadata', async () => {
  const input = await jpegWithGps(2000, 1500);
  assert.ok((await sharp(input).metadata()).exif, 'fixture carries EXIF');
  const out = await normalizePhoto(input);
  const meta = await sharp(out.buffer).metadata();
  assert.equal(out.mimeType, 'image/jpeg');
  assert.equal(meta.format, 'jpeg');
  assert.equal(Math.max(meta.width, meta.height), 1024);
  assert.equal(meta.exif, undefined, 'EXIF (GPS, device) stripped');
});

test('normalizePhoto: rejects empty, non-image, unsupported and tiny uploads with a status', async () => {
  const expect = async (buf, status) => {
    await assert.rejects(normalizePhoto(buf), (err) => err instanceof PhotoError && err.status === status);
  };
  await expect(Buffer.alloc(0), 400);
  await expect(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 415);
  await expect(Buffer.from('not an image at all'), 415);
  await expect(await sharp({ create: { width: 300, height: 300, channels: 3, background: '#888' } }).gif().toBuffer(), 415);
  await expect(await jpegWithGps(200, 400), 422);
  await expect({}, 400);
});

// --- SlidingWindowLimiter ---

test('limiter: allows up to the limit per key, then reports when to retry', () => {
  let clock = 0;
  const l = new SlidingWindowLimiter({ limit: 2, windowMs: 1000, now: () => clock });
  for (let i = 0; i < 2; i++) { assert.equal(l.allows('a'), true); l.record('a'); clock += 100; }
  assert.equal(l.allows('a'), false);
  assert.equal(l.allows('b'), true, 'keys are independent');
  assert.equal(l.retryAfterMs('a'), 800);
  clock = 1001;
  assert.equal(l.allows('a'), true);
});

// --- Scenes ---

test('every career, and the fallback, has an identity-neutral personal scene', () => {
  const identityWords = /\b(he|him|his|she|her|hers|himself|herself|woman|man|male|female|beard|bearded|twenties|thirties|forties|fifties|sixties|elderly)\b/i;
  for (const c of [...CAREERS, FALLBACK]) {
    assert.equal(typeof c.personalScene, 'string', c.title);
    assert.match(c.personalScene, /^[a-z]/, `${c.title}: continues the identity sentence`);
    assert.doesNotMatch(c.personalScene, identityWords, `${c.title}: leaves identity to the photo`);
    assert.doesNotMatch(c.personalScene, /[—()]/, c.title);
    assert.equal(personalSceneFor(c.title), c.personalScene);
  }
  assert.equal(personalSceneFor('Corporate Optimism Evangelist'), null, 'a title from before the redesign has none');
});
