const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PollinationsGenProvider, DEFAULT_MODEL } = require('../providers/pollinationsGenProvider');

// Slice to actual byte range - see note in pollinationsProvider.test.js.
const arrayBufferOf = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

function okResponse(bytes = 'gen-bytes', mime = 'image/jpeg') {
  return {
    ok: true, status: 200,
    arrayBuffer: async () => arrayBufferOf(Buffer.from(bytes)),
    headers: { get: () => mime },
    text: async () => '',
  };
}

test('constructor throws when apiKey is missing', () => {
  assert.throws(() => new PollinationsGenProvider({}), /POLLINATIONS_API_KEY/);
});

test('constructor rejects a publishable pk_ key', () => {
  assert.throws(() => new PollinationsGenProvider({ apiKey: 'pk_abc' }), /sk_/);
});

test('exposes name=pollinations_gen, dialect=flux and the documented default model', () => {
  const p = new PollinationsGenProvider({ apiKey: 'sk_x' });
  assert.equal(p.name, 'pollinations_gen');
  assert.equal(p.dialect, 'flux');
  assert.equal(p.model, DEFAULT_MODEL);
  assert.equal(DEFAULT_MODEL, 'tongyi-mai/z-image-turbo');
});

test('generate(): GETs gen.pollinations.ai with Bearer auth, encoded prompt, model, size and seed', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => { calls.push({ url, opts }); return okResponse(); };
  const p = new PollinationsGenProvider({ apiKey: 'sk_x', model: 'black-forest-labs/flux.1.1-pro', fetchImpl });
  await p.generate({ prompt: 'a portrait, at dusk', seed: 42, width: 896, height: 1120, negativePrompt: 'blurry' });

  assert.equal(calls.length, 1);
  const u = new URL(calls[0].url);
  assert.equal(u.origin, 'https://gen.pollinations.ai');
  assert.equal(decodeURIComponent(u.pathname), '/image/a portrait, at dusk');
  assert.equal(u.searchParams.get('model'), 'black-forest-labs/flux.1.1-pro');
  assert.equal(u.searchParams.get('width'), '896');
  assert.equal(u.searchParams.get('height'), '1120');
  assert.equal(u.searchParams.get('seed'), '42');
  // The key travels in the header, never in the URL (URLs end up in logs).
  assert.equal(u.searchParams.get('key'), null);
  assert.equal(calls[0].opts.headers.Authorization, 'Bearer sk_x');
});

test('generate(): returns Buffer + mime + providerName', async () => {
  const p = new PollinationsGenProvider({ apiKey: 'sk_x', fetchImpl: async () => okResponse('abc', 'image/png') });
  const out = await p.generate({ prompt: 'x', seed: 1, width: 896, height: 1120, negativePrompt: '' });
  assert.ok(Buffer.isBuffer(out.buffer));
  assert.equal(out.buffer.toString(), 'abc');
  assert.equal(out.mimeType, 'image/png');
  assert.equal(out.providerName, 'pollinations_gen');
});

test('generate(): throws with status on non-ok response', async () => {
  const fetchImpl = async () => ({ ok: false, status: 401, text: async () => '{"error":"key"}', headers: { get: () => 'application/json' } });
  const p = new PollinationsGenProvider({ apiKey: 'sk_x', fetchImpl });
  await assert.rejects(p.generate({ prompt: 'x', seed: 1, width: 896, height: 1120, negativePrompt: '' }), /401/);
});

test('generate(): rejects a 200 that is not an image so it is never cached', async () => {
  const p = new PollinationsGenProvider({ apiKey: 'sk_x', fetchImpl: async () => okResponse('{}', 'application/json') });
  await assert.rejects(p.generate({ prompt: 'x', seed: 1, width: 896, height: 1120, negativePrompt: '' }), /non-image/);
});

test('generate(): rejects an empty image body', async () => {
  const p = new PollinationsGenProvider({ apiKey: 'sk_x', fetchImpl: async () => okResponse('', 'image/jpeg') });
  await assert.rejects(p.generate({ prompt: 'x', seed: 1, width: 896, height: 1120, negativePrompt: '' }), /empty/);
});

test('a reference photo URL is sent as the image parameter, and only when given', async () => {
  const urls = [];
  const fetchImpl = async (url) => { urls.push(url); return okResponse(); };
  const p = new PollinationsGenProvider({ apiKey: 'sk_x', model: 'microsoft/mai-image-2.6-flash', fetchImpl });
  await p.generate({ prompt: 'a', seed: 1, width: 896, height: 1120, referenceUrl: 'https://example.com/api/ref/abc?x=1' });
  await p.generate({ prompt: 'a', seed: 1, width: 896, height: 1120 });
  assert.equal(new URL(urls[0]).searchParams.get('image'), 'https://example.com/api/ref/abc?x=1');
  assert.equal(new URL(urls[0]).searchParams.get('model'), 'microsoft/mai-image-2.6-flash');
  assert.equal(new URL(urls[1]).searchParams.has('image'), false);
});
