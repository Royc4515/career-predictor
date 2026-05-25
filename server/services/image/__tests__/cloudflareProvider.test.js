const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CloudflareProvider } = require('../providers/cloudflareProvider');

test('constructor throws when accountId or token missing', () => {
  assert.throws(() => new CloudflareProvider({ token: 't' }), /CLOUDFLARE/);
  assert.throws(() => new CloudflareProvider({ accountId: 'a' }), /CLOUDFLARE/);
});

test('exposes name=cloudflare and dialect=flux', () => {
  const p = new CloudflareProvider({ accountId: 'a', token: 't' });
  assert.equal(p.name, 'cloudflare');
  assert.equal(p.dialect, 'flux');
});

test('generate(): POSTs to CF account-scoped flux-1-schnell endpoint with Bearer auth', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    return {
      ok: true,
      status: 200,
      json: async () => ({ result: { image: Buffer.from('flux-bytes').toString('base64') } }),
      text: async () => '',
      headers: { get: () => null },
    };
  };
  const p = new CloudflareProvider({ accountId: 'acc123', token: 'tok', fetchImpl });
  await p.generate({ prompt: 'a portrait', seed: 5, width: 768, height: 768, negativePrompt: 'blurry' });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/accounts\/acc123\/ai\/run\/@cf\/black-forest-labs\/flux-1-schnell$/);
  assert.equal(calls[0].opts.headers.Authorization, 'Bearer tok');
  const body = JSON.parse(calls[0].opts.body);
  assert.equal(body.prompt, 'a portrait');
  assert.equal(body.seed, 5);
  assert.equal(body.width, 768);
  assert.equal(body.negative_prompt, 'blurry');
});

test('generate(): base64-decodes result.image into a Buffer', async () => {
  const fetchImpl = async () => ({
    ok: true, status: 200,
    json: async () => ({ result: { image: Buffer.from('hello').toString('base64') } }),
    headers: { get: () => null }, text: async () => '',
  });
  const p = new CloudflareProvider({ accountId: 'a', token: 't', fetchImpl });
  const out = await p.generate({ prompt: 'x', seed: 1, width: 1, height: 1, negativePrompt: '' });
  assert.ok(Buffer.isBuffer(out.buffer));
  assert.equal(out.buffer.toString(), 'hello');
  assert.equal(out.mimeType, 'image/png');
  assert.equal(out.providerName, 'cloudflare');
});

test('generate(): throws on non-ok response with status code', async () => {
  const fetchImpl = async () => ({ ok: false, status: 429, text: async () => 'rate limited', headers: { get: () => null } });
  const p = new CloudflareProvider({ accountId: 'a', token: 't', fetchImpl });
  await assert.rejects(p.generate({ prompt: 'x', seed: 1, width: 1, height: 1, negativePrompt: '' }), /429/);
});
