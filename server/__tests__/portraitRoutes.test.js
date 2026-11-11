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
  for (const googleId of ['g1', 'g2']) await db.upsertUser({ googleId, email: `${googleId}@x`, name: googleId });
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
    headers: { 'Content-Type': opts.type || 'image/jpeg', ...(opts.consent === false ? {} : { 'X-Portrait-Consent': 'yes' }) },
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

test('a retake deletes the personal portrait of the replaced result', async () => {
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
