const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createSampleRouter } = require('../routes/sampleRoutes');
const { SAMPLE_ANSWERS } = require('../careers');

function serve(imageService) {
  const app = express();
  app.use(createSampleRouter(imageService));
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

test('GET /api/samples returns every sample with an image URL and kicks each off once', async () => {
  const calls = [];
  const fake = { kickoff: ({ title }) => (calls.push(title), { id: 'abcdef0123456789' }) };
  const server = await serve(fake);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/samples`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('cache-control'), /max-age=300/);
    const { samples } = await res.json();
    assert.deepEqual(samples.map((s) => s.title), SAMPLE_ANSWERS.map(([t]) => t));
    for (const s of samples) assert.match(s.imageUrl, /\/api\/image\/abcdef0123456789$/);
    assert.equal(calls.length, SAMPLE_ANSWERS.length);
  } finally {
    server.close();
  }
});

test('GET /api/samples answers 500 with JSON when the image service throws', async () => {
  const server = await serve({ kickoff: () => { throw new Error('boom'); } });
  const original = console.error;
  console.error = () => {};
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/samples`);
    assert.equal(res.status, 500);
    assert.ok((await res.json()).error);
  } finally {
    console.error = original;
    server.close();
  }
});
