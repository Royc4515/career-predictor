const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PollinationsProvider } = require('../providers/pollinationsProvider');

// Buffer.from('...').buffer returns the *pool* ArrayBuffer, often 8KB. Slice
// to the actual byte range so consumers' Buffer.from(arrayBuffer) sees only
// the relevant bytes — matches what fetch() returns from a real HTTP response.
const arrayBufferOf = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

test('exposes name=pollinations and dialect=flux', () => {
  const p = new PollinationsProvider();
  assert.equal(p.name, 'pollinations');
  assert.equal(p.dialect, 'flux');
});

test('generate(): GETs image.pollinations.ai with URL-encoded prompt and the expected query params', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return {
      ok: true, status: 200,
      arrayBuffer: async () => arrayBufferOf(Buffer.from('poll-bytes')),
      headers: { get: () => 'image/png' },
    };
  };
  const p = new PollinationsProvider({ fetchImpl });
  await p.generate({ prompt: 'a portrait', seed: 13, width: 768, height: 768, negativePrompt: 'blurry, ugly' });

  assert.equal(calls.length, 1);
  const url = calls[0];
  assert.ok(url.startsWith('https://image.pollinations.ai/prompt/'));
  assert.ok(url.includes(encodeURIComponent('a portrait')));
  assert.ok(url.includes('model=flux-realism'));
  assert.ok(url.includes('width=768'));
  assert.ok(url.includes('height=768'));
  assert.ok(url.includes('nologo=true'));
  assert.ok(url.includes('seed=13'));
  assert.ok(url.includes('negative_prompt=' + encodeURIComponent('blurry, ugly')));
});

test('generate(): returns Buffer + mime + providerName=pollinations', async () => {
  const fetchImpl = async () => ({
    ok: true, status: 200,
    arrayBuffer: async () => Buffer.from('poll-bytes').buffer,
    headers: { get: () => 'image/png' },
  });
  const p = new PollinationsProvider({ fetchImpl });
  const out = await p.generate({ prompt: 'x', seed: 1, width: 1, height: 1, negativePrompt: '' });
  assert.equal(out.buffer.toString(), 'poll-bytes');
  assert.equal(out.mimeType, 'image/png');
  assert.equal(out.providerName, 'pollinations');
});

test('generate(): throws on non-ok response', async () => {
  const fetchImpl = async () => ({ ok: false, status: 502, headers: { get: () => null } });
  const p = new PollinationsProvider({ fetchImpl });
  await assert.rejects(p.generate({ prompt: 'x', seed: 1, width: 1, height: 1, negativePrompt: '' }), /502/);
});
