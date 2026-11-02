const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { asyncRoute } = require('../asyncRoute');

async function call(handler) {
  const app = express();
  app.get('/x', asyncRoute(handler, { label: 'test', message: 'Nope.' }));
  const server = await new Promise((r) => {
    const s = app.listen(0, () => r(s));
  });
  const original = console.error;
  console.error = () => {};
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/x`);
    return { status: res.status, body: await res.json() };
  } finally {
    console.error = original;
    server.close();
  }
}

test('a resolved handler responds normally', async () => {
  assert.deepEqual(await call(async (req, res) => res.json({ ok: 1 })), { status: 200, body: { ok: 1 } });
});

test('a rejected promise becomes a JSON 500 instead of a hung request', async () => {
  const out = await call(async () => {
    throw new Error('db down');
  });
  assert.deepEqual(out, { status: 500, body: { error: 'Nope.' } });
});

test('a synchronous throw is caught too', async () => {
  const out = await call(() => {
    JSON.parse('{bad');
  });
  assert.equal(out.status, 500);
});
