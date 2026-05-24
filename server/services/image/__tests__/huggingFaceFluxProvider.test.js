const { test } = require('node:test');
const assert = require('node:assert/strict');
const { HuggingFaceFluxProvider } = require('../providers/huggingFaceFluxProvider');

// Slice to actual byte range — see note in pollinationsProvider.test.js.
const arrayBufferOf = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

test('constructor throws when token is missing', () => {
  assert.throws(() => new HuggingFaceFluxProvider({}), /HUGGINGFACE_API_TOKEN/);
});

test('exposes name=huggingface_flux and dialect=flux', () => {
  const p = new HuggingFaceFluxProvider({ token: 't' });
  assert.equal(p.name, 'huggingface_flux');
  assert.equal(p.dialect, 'flux');
});

test('generate(): POSTs to HF FLUX.1-schnell endpoint with Bearer auth and x-wait-for-model', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    return {
      ok: true, status: 200,
      arrayBuffer: async () => arrayBufferOf(Buffer.from('flux-bytes')),
      headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'image/png' : null) },
      text: async () => '',
    };
  };
  const p = new HuggingFaceFluxProvider({ token: 'hf', fetchImpl });
  await p.generate({ prompt: 'a portrait', seed: 9, width: 512, height: 512, negativePrompt: 'noisy' });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /api-inference\.huggingface\.co\/models\/black-forest-labs\/FLUX\.1-schnell$/);
  assert.equal(calls[0].opts.headers.Authorization, 'Bearer hf');
  assert.equal(calls[0].opts.headers['x-wait-for-model'], 'true');
  const body = JSON.parse(calls[0].opts.body);
  assert.equal(body.inputs, 'a portrait');
  assert.equal(body.parameters.seed, 9);
  assert.equal(body.parameters.negative_prompt, 'noisy');
});

test('generate(): returns Buffer + mime + providerName=huggingface_flux', async () => {
  const fetchImpl = async () => ({
    ok: true, status: 200,
    arrayBuffer: async () => arrayBufferOf(Buffer.from('hf-bytes')),
    headers: { get: () => 'image/jpeg' }, text: async () => '',
  });
  const p = new HuggingFaceFluxProvider({ token: 't', fetchImpl });
  const out = await p.generate({ prompt: 'x', seed: 1, width: 1, height: 1, negativePrompt: '' });
  assert.equal(out.buffer.toString(), 'hf-bytes');
  assert.equal(out.mimeType, 'image/jpeg');
  assert.equal(out.providerName, 'huggingface_flux');
});

test('generate(): throws on non-ok response with status code', async () => {
  const fetchImpl = async () => ({ ok: false, status: 401, text: async () => 'unauth', headers: { get: () => null } });
  const p = new HuggingFaceFluxProvider({ token: 't', fetchImpl });
  await assert.rejects(p.generate({ prompt: 'x', seed: 1, width: 1, height: 1, negativePrompt: '' }), /401/);
});
