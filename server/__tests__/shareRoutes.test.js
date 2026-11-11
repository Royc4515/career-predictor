// Public share links against a real SQLite file, with the image models
// replaced by fakes: creating and reusing a link, what the public payload
// holds (and leaves out), the face only on opt-in, removal and revoking,
// and the link-preview tags written into /s/:token.
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
let currentUser = null;
let images;
let personal;
let releaseRender;

const INDEX = `<!doctype html><html lang="en"><head>
    <meta charset="UTF-8" />
    <title>CareerPredict | The Forecast Issue</title>
    <meta property="og:type" content="website" />
    <meta property="og:title" content="CareerPredict | The Forecast Issue" />
  </head><body><div id="root"></div></body></html>`;

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'share-routes-'));
  process.env.SERVER_URL = 'https://site.example';
  process.env.POLLINATIONS_API_KEY = 'sk_test';
  process.env.IMAGE_STORE = 'turso';
  process.env.TURSO_DATABASE_URL = `file:${path.join(dir, 'app.db')}`;
  const db = require('../db');
  await db.initDB({ url: process.env.TURSO_DATABASE_URL });
  for (const googleId of ['s1', 's2']) await db.upsertUser({ googleId, email: `${googleId}@x`, name: googleId === 's1' ? 'Roy Carmelli' : 'Other' });
  const instance = require('../services/image/instance');
  instance._resetForTests();
  images = instance.getImageService();
  const jpeg = await sharp({ create: { width: 64, height: 80, channels: 3, background: '#556677' } }).jpeg().toBuffer();
  images.providers = [{ name: 'fake', dialect: 'flux', generate: async () => ({ buffer: jpeg, mimeType: 'image/jpeg' }) }];
  personal = instance.getPersonalPortraitService();
  personal.providers = [{ model: 'fake', generate: () => new Promise((resolve) => { releaseRender = () => resolve({ buffer: jpeg, mimeType: 'image/jpeg' }); }) }];

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.isAuthenticated = () => currentUser != null;
    req.user = currentUser ? { id: currentUser, name: currentUser === 1 ? 'Roy Carmelli' : 'Other' } : undefined;
    next();
  });
  app.use('/api/user', require('../routes/userRoutes'));
  app.use(require('../routes/shareRoutes').createShareRouter({ imageService: images, indexHtml: INDEX }));
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
  fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
const settle = () => new Promise((r) => setTimeout(r, 80));

test('creating a share: signed in only, needs a result, reused for the same snapshot', async () => {
  currentUser = null;
  assert.equal((await json('POST', '/api/user/share', {})).status, 401);
  currentUser = 1;
  assert.equal((await json('POST', '/api/user/share', {})).status, 409, 'no result yet');
  assert.equal((await json('POST', '/api/user/onboarding', ANSWERS)).status, 200);
  const first = await json('POST', '/api/user/share', { lang: 'he' });
  assert.equal(first.status, 201);
  const a = await first.json();
  assert.match(a.url, /^https:\/\/site\.example\/s\/[A-Za-z0-9_-]{12}$/);
  assert.equal(a.withFace, false);
  const again = await (await json('POST', '/api/user/share', { lang: 'he' })).json();
  assert.equal(again.token, a.token, 'same snapshot, same link');
});

test('the public payload: the issue and first name, nothing private', async () => {
  currentUser = 1;
  const { token } = await (await json('POST', '/api/user/share', {})).json();
  currentUser = null; // anyone with the link
  const res = await fetch(`${base}/api/share/${token}`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(typeof body.title, 'string');
  assert.equal(body.personName, 'Roy');
  assert.equal(body.evidence.length, 2);
  assert.match(body.imageUrl, /\/api\/image\/[0-9a-f]{16}$/, 'the shared portrait, not a face');
  assert.equal(body.withFace, false);
  const text = JSON.stringify(body);
  for (const secret of ['s1@x', 'Carmelli', ANSWERS.monday_vibe.slice(0, 12)]) {
    if (!body.evidence.some((e) => e.includes(secret))) assert.ok(!text.includes(secret), `leaks ${secret}`);
  }
  assert.equal((await fetch(`${base}/api/share/nope`)).status, 404);
});

test('the face is shared only on opt-in, and removing the photo takes it off the link', async () => {
  currentUser = 1;
  assert.equal((await json('POST', '/api/user/share', { withFace: true })).status, 409, 'no photo yet');
  const up = await fetch(base + '/api/user/portrait', {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg', 'X-Portrait-Consent': 'v2' },
    body: await sharp({ create: { width: 800, height: 1000, channels: 3, background: '#b08060' } }).jpeg().toBuffer(),
  });
  assert.equal(up.status, 202);
  releaseRender();
  await settle();
  const plainShare = await (await json('POST', '/api/user/share', {})).json();
  assert.equal(plainShare.withFace, false, 'unticked: no face');
  const faceShare = await (await json('POST', '/api/user/share', { withFace: true })).json();
  assert.equal(faceShare.withFace, true);
  assert.notEqual(faceShare.token, plainShare.token);

  currentUser = null;
  let body = await (await fetch(`${base}/api/share/${faceShare.token}`)).json();
  assert.match(body.imageUrl, new RegExp(`/api/share/${faceShare.token}/image$`));
  assert.equal((await fetch(`${base}/api/share/${faceShare.token}/image`)).status, 200);
  assert.equal((await fetch(`${base}/api/share/${plainShare.token}/image`)).status, 404, 'no face on the plain link');

  currentUser = 1;
  assert.equal((await fetch(base + '/api/user/portrait', { method: 'DELETE' })).status, 204);
  currentUser = null;
  body = await (await fetch(`${base}/api/share/${faceShare.token}`)).json();
  assert.equal(body.withFace, false, 'removing the photo removes it from shared links');
  assert.equal((await fetch(`${base}/api/share/${faceShare.token}/image`)).status, 404);
});

test('stop sharing: only the owner, and the link ends at once', async () => {
  currentUser = 1;
  const { token } = await (await json('POST', '/api/user/share', {})).json();
  currentUser = 2;
  assert.equal((await fetch(`${base}/api/user/share/${token}`, { method: 'DELETE' })).status, 404, "not someone else's");
  currentUser = 1;
  assert.equal((await fetch(`${base}/api/user/share/${token}`, { method: 'DELETE' })).status, 204);
  currentUser = null;
  assert.equal((await fetch(`${base}/api/share/${token}`)).status, 404);
  const page = await (await fetch(`${base}/s/${token}`)).text();
  assert.doesNotMatch(page, /og:image/, 'an ended link gets the plain app');
});

test('/s/:token carries the link-preview tags, in the language it was shared in', async () => {
  currentUser = 1;
  const { token } = await (await json('POST', '/api/user/share', { lang: 'he' })).json();
  // A fresh snapshot (the previous one was revoked above), shared in Hebrew.
  currentUser = null;
  await settle();
  const res = await fetch(`${base}/s/${token}`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<meta property="og:image" content="https:\/\/site\.example\/api\/share\/[A-Za-z0-9_-]{12}\/og\.jpg"/);
  assert.match(html, /<meta property="og:title" content="Roy על השער: [^"]+"/);
  assert.match(html, /name="robots" content="noindex"/);
  assert.equal((html.match(/og:title/g) || []).length, 1, 'the generic og:title is replaced, not duplicated');
  assert.match(html, /<div id="root">/, 'still the app');
  const og = await fetch(`${base}/api/share/${token}/og.jpg`);
  assert.equal(og.status, 200);
  assert.equal(og.headers.get('content-type'), 'image/jpeg');
  const meta = await sharp(Buffer.from(await og.arrayBuffer())).metadata();
  assert.deepEqual([meta.width, meta.height], [600, 750]);
});

test('a link named by the browser: idempotent, the face switched on the same link, stop ends every link of the issue', async () => {
  currentUser = 2;
  assert.equal((await json('POST', '/api/user/onboarding', ANSWERS)).status, 200);
  const token = 'AbC_def-1234';
  assert.equal((await json('POST', '/api/user/share', { token: 'short' })).status, 400);
  assert.equal((await json('POST', '/api/user/share', { token: 42 })).status, 400);
  const made = await json('POST', '/api/user/share', { token, lang: 'en' });
  assert.equal(made.status, 201);
  assert.equal((await made.json()).url, `https://site.example/s/${token}`, 'the link the share sheet already holds');
  const retry = await json('POST', '/api/user/share', { token });
  assert.equal(retry.status, 200, 'a retry of the same token is the same link');
  currentUser = 1;
  assert.equal((await json('POST', '/api/user/share', { token })).status, 409, "someone else's token");
  assert.equal((await json('PATCH', `/api/user/share/${token}`, { withFace: false })).status, 404);

  currentUser = 2;
  assert.equal((await json('PATCH', `/api/user/share/${token}`, { withFace: true })).status, 409, 'no photo yet');
  const up = await fetch(base + '/api/user/portrait', {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg', 'X-Portrait-Consent': 'v2' },
    body: await sharp({ create: { width: 800, height: 1000, channels: 3, background: '#b08060' } }).jpeg().toBuffer(),
  });
  assert.equal(up.status, 202);
  releaseRender();
  await settle();
  const on = await json('PATCH', `/api/user/share/${token}`, { withFace: true });
  assert.equal(on.status, 200);
  assert.equal((await on.json()).withFace, true);
  currentUser = null;
  let body = await (await fetch(`${base}/api/share/${token}`)).json();
  assert.match(body.imageUrl, new RegExp(`/api/share/${token}/image$`), 'the same link now shows the face');
  currentUser = 2;
  assert.equal((await (await json('PATCH', `/api/user/share/${token}`, { withFace: false })).json()).withFace, false);
  currentUser = null;
  body = await (await fetch(`${base}/api/share/${token}`)).json();
  assert.equal(body.withFace, false);
  assert.equal((await fetch(`${base}/api/share/${token}/image`)).status, 404);

  currentUser = 2;
  const other = await (await json('POST', '/api/user/share', { token: 'Zz9_otherlnk' })).json();
  assert.equal((await fetch(`${base}/api/user/share/${token}`, { method: 'DELETE' })).status, 204);
  currentUser = null;
  assert.equal((await fetch(`${base}/api/share/${token}`)).status, 404);
  assert.equal((await fetch(`${base}/api/share/${other.token}`)).status, 404, 'stopping ends every link of the issue');
  currentUser = 2;
  assert.equal((await json('POST', '/api/user/share', { token })).status, 409, 'an ended token is not reused');
});
