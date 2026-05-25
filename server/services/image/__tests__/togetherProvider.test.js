const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TogetherProvider } = require('../providers/togetherProvider');

// Slice to actual byte range — see note in pollinationsProvider.test.js.
const arrayBufferOf = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

test('constructor throws when apiKey is missing', () => {
  assert.throws(() => new TogetherProvider({}), /TOGETHER_API_KEY/);
});

test('exposes name=together and dialect=flux', () => {
  const p = new TogetherProvider({ apiKey: 'k' });
  assert.equal(p.name, 'together');
  assert.equal(p.dialect, 'flux');
});

test('generate(): POSTs to /v1/images/generations with FLUX.1-schnell-Free model, then re-fetches the returned URL', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    if (calls.length === 1) {
      return {
        ok: true, status: 200,
        json: async () => ({ data: [{ url: 'https://cdn.together.example/img.png' }] }),
        text: async () => '',
        headers: { get: () => null },
      };
    }
    // Second call: byte fetch
    return {
      ok: true, status: 200,
      arrayBuffer: async () => arrayBufferOf(Buffer.from('together-bytes')),
      headers: { get: () => 'image/png' },
      text: async () => '',
    };
  };
  const p = new TogetherProvider({ apiKey: 'tk', fetchImpl });
  const out = await p.generate({ prompt: 'a portrait', seed: 11, width: 768, height: 768, negativePrompt: '' });

  // First call: generation
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /api\.together\.xyz\/v1\/images\/generations$/);
  assert.equal(calls[0].opts.headers.Authorization, 'Bearer tk');
  const body = JSON.parse(calls[0].opts.body);
  assert.equal(body.model, 'black-forest-labs/FLUX.1-schnell-Free');
  assert.equal(body.prompt, 'a portrait');
  assert.equal(body.seed, 11);

  // Second call: download bytes from returned URL
  assert.equal(calls[1].url, 'https://cdn.together.example/img.png');
  assert.equal(out.buffer.toString(), 'together-bytes');
  assert.equal(out.providerName, 'together');
});

test('generate(): throws if response contains no image URL', async () => {
  const fetchImpl = async () => ({
    ok: true, status: 200,
    json: async () => ({ data: [] }),
    text: async () => '', headers: { get: () => null },
  });
  const p = new TogetherProvider({ apiKey: 'k', fetchImpl });
  await assert.rejects(p.generate({ prompt: 'x', seed: 1, width: 1, height: 1, negativePrompt: '' }), /no image URL/i);
});

test('generate(): throws on non-ok generation response', async () => {
  const fetchImpl = async () => ({ ok: false, status: 500, text: async () => 'oops', headers: { get: () => null } });
  const p = new TogetherProvider({ apiKey: 'k', fetchImpl });
  await assert.rejects(p.generate({ prompt: 'x', seed: 1, width: 1, height: 1, negativePrompt: '' }), /500/);
});
