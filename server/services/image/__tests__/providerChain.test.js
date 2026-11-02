const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveProviders } = require('../providers');

const names = (env) => resolveProviders(env).map((p) => p.name);

test('no env: keyless pollinations only, so a fresh install runs zero-config', () => {
  assert.deepEqual(names({}), ['pollinations']);
});

test('POLLINATIONS_API_KEY alone upgrades the default chain and keeps keyless as fallback', () => {
  assert.deepEqual(names({ POLLINATIONS_API_KEY: 'sk_x' }), ['pollinations_gen', 'pollinations']);
});

test('explicit IMAGE_PROVIDER_CHAIN wins over the key-based default', () => {
  assert.deepEqual(names({ POLLINATIONS_API_KEY: 'sk_x', IMAGE_PROVIDER_CHAIN: 'pollinations' }), ['pollinations']);
});

test('POLLINATIONS_IMAGE_MODEL is passed through to the provider', () => {
  const [p] = resolveProviders({ IMAGE_PROVIDER_CHAIN: 'pollinations_gen', POLLINATIONS_API_KEY: 'sk_x', POLLINATIONS_IMAGE_MODEL: 'microsoft/mai-image-2.6' });
  assert.equal(p.model, 'microsoft/mai-image-2.6');
});

test('cloudflare_flux2 is registered and needs the Cloudflare credentials', () => {
  assert.deepEqual(names({ IMAGE_PROVIDER_CHAIN: 'cloudflare_flux2', CLOUDFLARE_ACCOUNT_ID: 'a', CLOUDFLARE_API_TOKEN: 't' }), ['cloudflare_flux2']);
  assert.throws(() => resolveProviders({ IMAGE_PROVIDER_CHAIN: 'cloudflare_flux2' }), /CLOUDFLARE/);
});

test('unknown provider name fails fast and lists the valid names', () => {
  assert.throws(() => resolveProviders({ IMAGE_PROVIDER_CHAIN: 'midjourney' }), /pollinations_gen/);
});
