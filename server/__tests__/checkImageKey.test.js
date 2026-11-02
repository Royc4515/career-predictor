const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateKey, maskKey } = require('../scripts/checkImageKey');

const ZIMAGE = { name: 'tongyi-mai/z-image-turbo', aliases: ['zimage', 'z-image'], paid_only: false, health: { status: 'healthy' } };
const PAID = { name: 'openai/gpt-image-2', aliases: ['gpt-image-2'], paid_only: true, health: { status: 'healthy' } };
const goodKey = { valid: true, type: 'secret', name: 'render', expiresAt: null, permissions: { models: null, account: null }, pollenBudget: null, questPollenOnly: false };

test('a valid secret key with unrestricted models passes', () => {
  assert.equal(evaluateKey(goodKey, ZIMAGE, 'tongyi-mai/z-image-turbo').ok, true);
});

test('model permission matches the id, an alias, or the image category', () => {
  for (const models of [['tongyi-mai/z-image-turbo'], ['zimage'], ['image']]) {
    const info = { ...goodKey, permissions: { models, account: null } };
    assert.equal(evaluateKey(info, ZIMAGE, 'zimage').ok, true, models.join());
  }
  const info = { ...goodKey, permissions: { models: ['text'], account: null } };
  const v = evaluateKey(info, ZIMAGE, 'zimage');
  assert.equal(v.ok, false);
  assert.match(v.problems[0], /not allowed/);
});

test('a paid-only model with a Quest-Pollen-only key is flagged before it fails in production', () => {
  const v = evaluateKey({ ...goodKey, questPollenOnly: true }, PAID, 'gpt-image-2');
  assert.equal(v.ok, false);
  assert.match(v.problems.join(), /paid-only/);
});

test('invalid, publishable and unknown-model cases each produce a clear problem', () => {
  assert.equal(evaluateKey({ ...goodKey, valid: false }, ZIMAGE, 'zimage').ok, false);
  assert.match(evaluateKey({ ...goodKey, type: 'publishable' }, ZIMAGE, 'zimage').problems.join(), /sk_/);
  assert.match(evaluateKey(goodKey, null, 'nope').problems.join(), /not in the live catalogue/);
});

test('budget, expiry and free-only status are reported as notes', () => {
  const v = evaluateKey({ ...goodKey, pollenBudget: 5, questPollenOnly: true, expiresAt: '2027-01-01T00:00:00Z' }, ZIMAGE, 'zimage');
  assert.equal(v.ok, true);
  assert.match(v.notes.join(' '), /5 pollen/);
  assert.match(v.notes.join(' '), /never charge/);
  assert.match(v.notes.join(' '), /Expires/);
});

test('maskKey never reveals the middle of a key', () => {
  assert.equal(maskKey('sk_abcdefghijklmnop'), 'sk_...mnop');
  assert.equal(maskKey(undefined), '(missing)');
  assert.equal(maskKey('sk_1'), '(missing)');
});
