const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveKeepAliveUrl, startKeepAlive } = require('../keepAlive');

const prod = { NODE_ENV: 'production', RENDER_EXTERNAL_URL: 'https://x.onrender.com' };

test('resolves the health url from RENDER_EXTERNAL_URL in production', () => {
  assert.equal(resolveKeepAliveUrl(prod), 'https://x.onrender.com/api/health');
});

test('KEEP_ALIVE_URL overrides RENDER_EXTERNAL_URL', () => {
  assert.equal(
    resolveKeepAliveUrl({ ...prod, KEEP_ALIVE_URL: 'https://y.example' }),
    'https://y.example/api/health',
  );
});

test('disabled outside production, when opted out, or when the url is missing or bad', () => {
  assert.equal(resolveKeepAliveUrl({ ...prod, NODE_ENV: 'development' }), null);
  assert.equal(resolveKeepAliveUrl({ ...prod, KEEP_ALIVE_DISABLED: 'true' }), null);
  assert.equal(resolveKeepAliveUrl({ NODE_ENV: 'production' }), null);
  assert.equal(resolveKeepAliveUrl({ ...prod, RENDER_EXTERNAL_URL: 'not a url' }), null);
  assert.equal(resolveKeepAliveUrl({ ...prod, RENDER_EXTERNAL_URL: 'ftp://x.com' }), null);
});

test('startKeepAlive pings on the interval and survives failures', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (calls.length === 1) throw new Error('boom');
    return { ok: true };
  };
  const quiet = { log() {}, warn() {} };
  const stop = startKeepAlive({ env: prod, fetchImpl, intervalMs: 10, log: quiet });
  assert.equal(typeof stop, 'function');
  await new Promise((r) => setTimeout(r, 60));
  stop();
  assert.ok(calls.length >= 2, 'kept pinging after the first failure');
  assert.equal(calls[0], 'https://x.onrender.com/api/health');
});

test('startKeepAlive returns null when disabled', () => {
  assert.equal(startKeepAlive({ env: { NODE_ENV: 'development' } }), null);
});
