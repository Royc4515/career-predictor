const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CloudflareFlux2Provider, MODEL } = require('../providers/cloudflareFlux2Provider');

function okJson(image = Buffer.from('flux2-bytes').toString('base64')) {
  return {
    ok: true, status: 200,
    json: async () => ({ result: { image }, success: true }),
    text: async () => '',
    headers: { get: () => 'application/json' },
  };
}

test('constructor throws when accountId or token missing', () => {
  assert.throws(() => new CloudflareFlux2Provider({ token: 't' }), /CLOUDFLARE/);
  assert.throws(() => new CloudflareFlux2Provider({ accountId: 'a' }), /CLOUDFLARE/);
});

test('exposes name=cloudflare_flux2 and dialect=flux', () => {
  const p = new CloudflareFlux2Provider({ accountId: 'a', token: 't' });
  assert.equal(p.name, 'cloudflare_flux2');
  assert.equal(p.dialect, 'flux');
  assert.equal(MODEL, '@cf/black-forest-labs/flux-2-klein-9b');
});

test('generate(): POSTs multipart form to the klein-9b endpoint without a hand-set Content-Type', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => { calls.push({ url, opts }); return okJson(); };
  const p = new CloudflareFlux2Provider({ accountId: 'acc123', token: 'tok', fetchImpl });
  await p.generate({ prompt: 'a portrait', seed: 5, width: 896, height: 1120, negativePrompt: 'blurry' });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/accounts\/acc123\/ai\/run\/@cf\/black-forest-labs\/flux-2-klein-9b$/);
  assert.equal(calls[0].opts.method, 'POST');
  assert.equal(calls[0].opts.headers.Authorization, 'Bearer tok');
  assert.equal(calls[0].opts.headers['Content-Type'], undefined);
  const form = calls[0].opts.body;
  assert.ok(form instanceof FormData);
  assert.equal(form.get('prompt'), 'a portrait');
  assert.equal(form.get('width'), '896');
  assert.equal(form.get('height'), '1120');
  assert.equal(form.get('seed'), '5');
  // klein is distilled to a fixed 4 steps; sending steps would be rejected.
  assert.equal(form.get('steps'), null);
});

test('generate(): base64-decodes result.image into a PNG buffer', async () => {
  const p = new CloudflareFlux2Provider({ accountId: 'a', token: 't', fetchImpl: async () => okJson(Buffer.from('hello').toString('base64')) });
  const out = await p.generate({ prompt: 'x', seed: 1, width: 896, height: 1120, negativePrompt: '' });
  assert.equal(out.buffer.toString(), 'hello');
  assert.equal(out.mimeType, 'image/png');
  assert.equal(out.providerName, 'cloudflare_flux2');
});

test('generate(): throws when the response has no image', async () => {
  const p = new CloudflareFlux2Provider({ accountId: 'a', token: 't', fetchImpl: async () => okJson('') });
  await assert.rejects(p.generate({ prompt: 'x', seed: 1, width: 896, height: 1120, negativePrompt: '' }), /no image/);
});

test('generate(): throws with status on non-ok response', async () => {
  const fetchImpl = async () => ({ ok: false, status: 429, text: async () => 'rate limited', headers: { get: () => null } });
  const p = new CloudflareFlux2Provider({ accountId: 'a', token: 't', fetchImpl });
  await assert.rejects(p.generate({ prompt: 'x', seed: 1, width: 896, height: 1120, negativePrompt: '' }), /429/);
});
