// Route-level test of the personal portrait flow against a real SQLite file,
// with the image model replaced by a fake. Covers consent, validation,
// ownership (another user gets 404), polling, the result payload, retake
// cleanup and removal.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const sharp = require('sharp');

let dir;
let server;
let base;
let currentUser = 1;
let personal;
let images;
let releaseRender;

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portrait-routes-'));
  process.env.SERVER_URL = 'https://site.example';
  process.env.POLLINATIONS_API_KEY = 'sk_test';
  process.env.IMAGE_STORE = 'turso';
  process.env.TURSO_DATABASE_URL = `file:${path.join(dir, 'app.db')}`;
  const db = require('../db');
  await db.initDB({ url: process.env.TURSO_DATABASE_URL });
  for (const googleId of ['g1', 'g2', 'g3']) await db.upsertUser({ googleId, email: `${googleId}@x`, name: googleId });
  const instance = require('../services/image/instance');
  instance._resetForTests();
  images = instance.getImageService();
  images.providers = []; // never call a real model for shared portraits here
  personal = instance.getPersonalPortraitService();
  // A fake image-to-image model that waits until the test lets it finish.
  personal.providers = [{
    model: 'fake',
    generate: () => new Promise((resolve) => {
      releaseRender = () => resolve({ buffer: Buffer.from('rendered-face'), mimeType: 'image/webp' });
    }),
  }];

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.isAuthenticated = () => currentUser != null;
    req.user = currentUser ? { id: currentUser } : undefined;
    next();
  });
  app.use('/api/user', require('../routes/userRoutes'));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server?.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const ANSWERS = {
  strength: 'Present from memory. Slides were holding me back',
  monday_vibe: "Third coffee (it's 9:02)",
  coworker_desc: 'The one who can just quickly do it. Again.',
  five_year_goal: 'Ringing the bell at a stock exchange. Any stock exchange',
  desired_field: 'Pitch decks and an app that is 90% done',
};
const json = (method, url, body) =>
  fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const selfie = () => sharp({ create: { width: 800, height: 1000, channels: 3, background: '#b08060' } }).jpeg().toBuffer();
const upload = async (opts = {}) =>
  fetch(base + '/api/user/portrait', {
    method: 'POST',
    headers: { 'Content-Type': opts.type || 'image/jpeg', ...(opts.consent === false ? {} : { 'X-Portrait-Consent': opts.consent || 'yes' }) },
    body: opts.body || (await selfie()),
  });

test('the full personal portrait flow', async () => {
  currentUser = 1;
  assert.equal((await upload()).status, 409, 'no result yet');
  assert.equal((await json('POST', '/api/user/onboarding', ANSWERS)).status, 200);

  let res = await fetch(base + '/api/user/result');
  let body = await res.json();
  assert.equal(body.personal, null);
  assert.equal(body.personalAvailable, true);

  assert.equal((await upload({ consent: false })).status, 400, 'consent is required');
  assert.equal((await upload({ body: Buffer.from('not a photo') })).status, 415);
  assert.equal((await upload({ type: 'text/plain', body: Buffer.from('x') })).status, 400);

  res = await upload();
  assert.equal(res.status, 202);
  const { personal: started } = await res.json();
  assert.equal(started.status, 'generating');
  const id = started.imageUrl.split('/').pop();
  assert.match(started.imageUrl, /^https:\/\/site\.example\/api\/user\/portrait\/image\/[0-9a-f]{16}$/);

  // While rendering: the owner gets 404 + Retry-After, like /api/image/:id.
  res = await fetch(`${base}/api/user/portrait/image/${id}`, { method: 'HEAD' });
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('retry-after'), '8');

  releaseRender();
  await new Promise((r) => setTimeout(r, 50));

  res = await fetch(`${base}/api/user/portrait/image/${id}`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('cache-control'), /^private/);
  body = await (await fetch(base + '/api/user/result')).json();
  assert.equal(body.personal.status, 'ready');

  // Another signed-in user cannot see it, and is not told it exists.
  currentUser = 2;
  assert.equal((await fetch(`${base}/api/user/portrait/image/${id}`)).status, 404);
  currentUser = null;
  assert.equal((await fetch(`${base}/api/user/portrait/image/${id}`)).status, 401);
  currentUser = 1;

  // Removal deletes the image and the result goes back to the desk's portrait.
  assert.equal((await fetch(base + '/api/user/portrait', { method: 'DELETE' })).status, 204);
  assert.equal(await images.blobStore.get(id), null);
  body = await (await fetch(base + '/api/user/result')).json();
  assert.equal(body.personal, null);
});

test('a retake deletes a portrait shot under the v1 consent ("deleted on a retake")', async () => {
  currentUser = 1;
  const res = await upload();
  const id = (await res.json()).personal.imageUrl.split('/').pop();
  releaseRender();
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(await images.blobStore.get(id));
  assert.equal((await json('POST', '/api/user/onboarding', ANSWERS)).status, 200);
  assert.equal(await images.blobStore.get(id), null);
});

test('a stale "generating" row after a restart reads as failed', async () => {
  currentUser = 2;
  assert.equal((await json('POST', '/api/user/onboarding', ANSWERS)).status, 200);
  const db = require('../db');
  await db.setPersonalPortrait(2, { imageId: 'abcdefabcdefabcd', status: 'generating', consentAt: 'x' });
  const body = await (await fetch(base + '/api/user/result')).json();
  assert.equal(body.personal.status, 'failed');
  assert.equal((await fetch(`${base}/api/user/portrait/image/abcdefabcdefabcd`)).status, 410);
});

test('loading a saved result re-kicks its portrait and repoints a stale image id', async () => {
  currentUser = 1;
  assert.equal((await json('POST', '/api/user/onboarding', ANSWERS)).status, 200);
  const db = require('../db');
  // As if the prompt changed since the result was saved (or the bytes were lost).
  await db.updateImageId(1, '0000000000000000');
  const calls = [];
  const original = images.kickoff.bind(images);
  images.kickoff = (input) => { calls.push(input); return original(input); };
  try {
    const body = await (await fetch(base + '/api/user/result')).json();
    assert.equal(calls.length, 1, 'kickoff on every result load (idempotent)');
    const id = body.imageUrl.split('/').pop();
    assert.notEqual(id, '0000000000000000');
    assert.equal((await db.getOnboardingByUserId(1)).image_id, id, 'row repointed');
  } finally {
    images.kickoff = original;
  }
});

test('back issues: newest first with the current one marked, portraits are the career\'s current scene', async () => {
  currentUser = 1;
  const other = { ...ANSWERS, desired_field: 'My own comments section' };
  assert.equal((await json('POST', '/api/user/onboarding', other)).status, 200);
  const res = await fetch(base + '/api/user/covers');
  assert.equal(res.status, 200);
  const { covers } = await res.json();
  assert.ok(covers.length >= 2);
  assert.equal(covers[0].current, true);
  assert.equal(covers.filter((c) => c.current).length, 1);
  const result = await (await fetch(base + '/api/user/result')).json();
  assert.equal(covers[0].title, result.careerTitle);
  assert.equal(covers[0].imageUrl, result.imageUrl);
  for (const c of covers) assert.match(c.imageUrl, /\/api\/image\/[0-9a-f]{16}$/, 'shared portraits only');
});

test('back issues: delete your own, 404 for anyone else\'s, 400 for junk ids', async () => {
  currentUser = 1;
  const { covers } = await (await fetch(base + '/api/user/covers')).json();
  const last = covers.at(-1);
  currentUser = 2;
  assert.equal((await fetch(`${base}/api/user/covers/${last.id}`, { method: 'DELETE' })).status, 404);
  assert.equal((await fetch(`${base}/api/user/covers/1e3`, { method: 'DELETE' })).status, 400);
  currentUser = 1;
  assert.equal((await fetch(`${base}/api/user/covers/${last.id}`, { method: 'DELETE' })).status, 204);
  const after = (await (await fetch(base + '/api/user/covers')).json()).covers;
  assert.equal(after.length, covers.length - 1);
  currentUser = null;
  assert.equal((await fetch(base + '/api/user/covers')).status, 401);
});

test('a result says why a personal portrait is unavailable: an old issue', async () => {
  currentUser = 2;
  assert.equal((await json('POST', '/api/user/onboarding', ANSWERS)).status, 200);
  const db = require('../db');
  const row = await db.getOnboardingByUserId(2);
  await db.saveOnboarding({
    userId: 2, strength: 'a', mondayVibe: 'b', coworkerDesc: 'c', fiveYearGoal: 'd', desiredField: 'e',
    careerResult: JSON.stringify({ title: 'Corporate Optimism Evangelist', caption: 'old' }),
    imageId: row.image_id, portraitSubject: 'surprise',
  });
  const body = await (await fetch(base + '/api/user/result')).json();
  assert.equal(body.personalAvailable, false);
  assert.equal(body.personalBlocked, 'old-issue');
});

test('the quiz can choose "Use my own photo": accepted, shared portrait is the original scene', async () => {
  currentUser = 1;
  const res = await json('POST', '/api/user/onboarding', { ...ANSWERS, portrait_subject: 'Use my own photo' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.personalAvailable, true);
  assert.equal(body.personal, null);
  const db = require('../db');
  assert.equal((await db.getOnboardingByUserId(1)).portrait_subject, 'photo');
});

// --- Consent v2: the portrait is kept on its back issue ---

const idOf = (url) => url.split('/').pop();
async function shootV2() {
  const res = await upload({ consent: 'v2' });
  assert.equal(res.status, 202);
  const id = idOf((await res.json()).personal.imageUrl);
  releaseRender();
  await new Promise((r) => setTimeout(r, 50));
  return id;
}

test('a v2 portrait stays on its back issue after a retake, private to its owner', async () => {
  currentUser = 3;
  assert.equal((await json('POST', '/api/user/onboarding', ANSWERS)).status, 200);
  const id = await shootV2();
  let { covers } = await (await fetch(base + '/api/user/covers')).json();
  assert.equal(idOf(covers[0].personalImageUrl), id, 'the current issue shows it');

  assert.equal((await json('POST', '/api/user/onboarding', ANSWERS)).status, 200);
  assert.ok(await images.blobStore.get(id), 'a retake keeps it');
  ({ covers } = await (await fetch(base + '/api/user/covers')).json());
  assert.equal(covers[0].personalImageUrl, null, 'the new issue has none yet');
  assert.equal(idOf(covers[1].personalImageUrl), id, 'the earlier issue keeps it');
  assert.equal((await (await fetch(base + '/api/user/result')).json()).personal, null);

  assert.equal((await fetch(`${base}/api/user/portrait/image/${id}`)).status, 200, 'served to its owner');
  currentUser = 2;
  assert.equal((await fetch(`${base}/api/user/portrait/image/${id}`)).status, 404, 'and nobody else');
  currentUser = 3;

  assert.equal((await fetch(`${base}/api/user/covers/${covers[0].id}`, { method: 'DELETE' })).status, 409, 'the current issue stays');
  assert.equal((await fetch(`${base}/api/user/covers/${covers[1].id}`, { method: 'DELETE' })).status, 204);
  assert.equal(await images.blobStore.get(id), null, 'removing the issue deletes its portrait');
  assert.equal((await fetch(`${base}/api/user/portrait/image/${id}`)).status, 404);
});

test('"Remove my photo" on the result page removes a v2 portrait from the archive too', async () => {
  currentUser = 3;
  const id = await shootV2();
  assert.equal(idOf((await (await fetch(base + '/api/user/covers')).json()).covers[0].personalImageUrl), id);
  assert.equal((await fetch(base + '/api/user/portrait', { method: 'DELETE' })).status, 204);
  assert.equal((await (await fetch(base + '/api/user/covers')).json()).covers[0].personalImageUrl, null);
  assert.equal(await images.blobStore.get(id), null);
});
