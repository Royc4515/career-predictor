const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createFeatureRouter } = require('../routes/featureRoutes');

test('GET /api/features reports booleans only', async () => {
  for (const available of [true, false]) {
    const app = express();
    app.use(createFeatureRouter({ personalPortraits: () => ({ available, providers: ['secret'] }) }));
    const server = app.listen(0);
    const body = await (await fetch(`http://127.0.0.1:${server.address().port}/api/features`)).json();
    server.close();
    assert.deepEqual(body, { personalPortraits: available });
  }
});
