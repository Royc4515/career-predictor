const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createImageRouter } = require('../routes/imageRoutes');

async function serve(blob) {
  const app = express();
  app.use(createImageRouter({ fetchIfReady: async () => blob }));
  const server = app.listen(0);
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/image/0123456789abcdef`);
  server.close();
  return res;
}

test('a durable portrait is cached as immutable', async () => {
  const res = await serve({ buffer: Buffer.from('x'), mimeType: 'image/webp' });
  assert.equal(res.headers.get('cache-control'), 'public, max-age=31536000, immutable');
});

test('a stopgap is never cached, so the good render replaces it in the browser', async () => {
  const res = await serve({ buffer: Buffer.from('x'), mimeType: 'image/jpeg', provisional: true });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('missing still means generating', async () => {
  const res = await serve(null);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('retry-after'), '8');
});
