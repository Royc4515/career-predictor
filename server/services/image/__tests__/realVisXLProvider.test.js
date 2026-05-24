const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RealVisXLProvider } = require('../providers/realVisXLProvider');

function mockOkFetch(buffer = Buffer.from('PNGDATA'), contentType = 'image/png') {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    return {
      ok: true,
      status: 200,
      headers: { get: (h) => (h.toLowerCase() === 'content-type' ? contentType : null) },
      arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      text: async () => '',
    };
  };
  return { fetchImpl, calls };
}

test('constructor throws when token is missing', () => {
  assert.throws(() => new RealVisXLProvider({}), /HUGGINGFACE_API_TOKEN/);
});

test('exposes name=realvisxl and dialect=sdxl per spec §1', () => {
  const p = new RealVisXLProvider({ token: 't' });
  assert.equal(p.name, 'realvisxl');
  assert.equal(p.dialect, 'sdxl');
});

test('generate(): POSTs to HF RealVisXL endpoint with Bearer auth and x-wait-for-model', async () => {
  const { fetchImpl, calls } = mockOkFetch();
  const p = new RealVisXLProvider({ token: 'hf_test', fetchImpl });
  await p.generate({ prompt: 'a portrait', seed: 7, width: 768, height: 768, negativePrompt: 'blurry' });

  assert.equal(calls.length, 1);
  const { url, opts } = calls[0];
  assert.match(url, /api-inference\.huggingface\.co\/models\/SG161222\/RealVisXL_V4\.0$/);
  assert.equal(opts.method, 'POST');
  assert.equal(opts.headers.Authorization, 'Bearer hf_test');
  assert.equal(opts.headers['x-wait-for-model'], 'true');
  const body = JSON.parse(opts.body);
  assert.equal(body.inputs, 'a portrait');
  assert.equal(body.parameters.seed, 7);
  assert.equal(body.parameters.width, 768);
  assert.equal(body.parameters.height, 768);
  assert.equal(body.parameters.negative_prompt, 'blurry');
});

test('generate(): returns {buffer, mimeType, providerName}', async () => {
  const { fetchImpl } = mockOkFetch(Buffer.from('imgbytes'), 'image/png');
  const p = new RealVisXLProvider({ token: 't', fetchImpl });
  const out = await p.generate({ prompt: 'x', seed: 1, width: 64, height: 64, negativePrompt: '' });
  assert.ok(Buffer.isBuffer(out.buffer));
  assert.equal(out.buffer.toString(), 'imgbytes');
  assert.equal(out.mimeType, 'image/png');
  assert.equal(out.providerName, 'realvisxl');
});

test('generate(): throws with status when response is not ok', async () => {
  const fetchImpl = async () => ({ ok: false, status: 503, text: async () => 'model loading', headers: { get: () => null } });
  const p = new RealVisXLProvider({ token: 't', fetchImpl });
  await assert.rejects(p.generate({ prompt: 'x', seed: 1, width: 64, height: 64, negativePrompt: '' }), /503/);
});
