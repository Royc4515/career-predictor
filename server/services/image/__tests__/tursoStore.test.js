const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createClient } = require('@libsql/client');
const { TursoStore } = require('../storage/tursoStore');

// A real SQLite file through libsql: the same client and SQL that talk to
// Turso in production, minus the network.
let dir;
let client;
before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'turso-store-'));
  client = createClient({ url: `file:${path.join(dir, 'images.db')}` });
});
after(() => {
  client.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('unknown id reads as null (still generating), and creates the table on demand', async () => {
  const store = new TursoStore({ client });
  assert.equal(await store.get('0000000000000000'), null);
});

test('round-trips bytes and mime type as a Node Buffer', async () => {
  const store = new TursoStore({ client });
  const bytes = Buffer.from([0, 1, 2, 250, 251, 255]);
  await store.put('aaaaaaaaaaaaaaaa', bytes, 'image/webp');
  // A fresh store has an empty cache, so this reads from the database.
  const fresh = new TursoStore({ client });
  const blob = await fresh.get('aaaaaaaaaaaaaaaa');
  assert.ok(Buffer.isBuffer(blob.buffer));
  assert.deepEqual(blob.buffer, bytes);
  assert.equal(blob.mimeType, 'image/webp');
});

test('a second put replaces the first', async () => {
  const store = new TursoStore({ client });
  await store.put('bbbbbbbbbbbbbbbb', Buffer.from([1]), 'image/jpeg');
  await store.put('bbbbbbbbbbbbbbbb', Buffer.from([2, 2]), 'image/webp');
  const blob = await new TursoStore({ client }).get('bbbbbbbbbbbbbbbb');
  assert.deepEqual(blob.buffer, Buffer.from([2, 2]));
  assert.equal(blob.mimeType, 'image/webp');
});

test('serves repeat reads from memory and evicts the least recently used', async () => {
  let selects = 0;
  const counting = {
    execute(stmt) {
      if (typeof stmt === 'object' && stmt.sql.startsWith('SELECT')) selects += 1;
      return client.execute(stmt);
    },
  };
  const store = new TursoStore({ client: counting, cacheItems: 2 });
  for (const id of ['c1c1c1c1c1c1c1c1', 'c2c2c2c2c2c2c2c2', 'c3c3c3c3c3c3c3c3']) {
    await new TursoStore({ client }).put(id, Buffer.from(id), 'image/webp');
  }
  await store.get('c1c1c1c1c1c1c1c1');
  await store.get('c1c1c1c1c1c1c1c1');
  assert.equal(selects, 1, 'second read is a cache hit');
  await store.get('c2c2c2c2c2c2c2c2');
  await store.get('c3c3c3c3c3c3c3c3'); // evicts c1
  await store.get('c1c1c1c1c1c1c1c1');
  assert.equal(selects, 4);
});

test('a failed table setup is retried on the next call', async () => {
  let fail = true;
  const flaky = {
    execute(stmt) {
      if (fail && typeof stmt === 'string') {
        fail = false;
        return Promise.reject(new Error('network blip'));
      }
      return client.execute(stmt);
    },
  };
  const store = new TursoStore({ client: flaky });
  await assert.rejects(store.get('dddddddddddddddd'), /network blip/);
  assert.equal(await store.get('dddddddddddddddd'), null);
});
