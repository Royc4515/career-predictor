const { test } = require('node:test');
const assert = require('node:assert/strict');
const promptBuilder = require('../promptBuilder');

test('titleToSeed: deterministic — same input yields same seed', () => {
  assert.equal(promptBuilder.titleToSeed('Software Engineer'), promptBuilder.titleToSeed('Software Engineer'));
});

test('titleToSeed: different inputs yield different seeds (no trivial collision)', () => {
  const a = promptBuilder.titleToSeed('Software Engineer');
  const b = promptBuilder.titleToSeed('Plumber');
  assert.notEqual(a, b);
});

test('titleToSeed: returns a non-negative int32', () => {
  const s = promptBuilder.titleToSeed('Botanist');
  assert.equal(typeof s, 'number');
  assert.ok(Number.isInteger(s));
  assert.ok(s >= 0 && s < 2_147_483_647);
});

test('imageIdFor: deterministic 16-hex-char id', () => {
  const id = promptBuilder.imageIdFor('a researcher in a lab', 42);
  assert.match(id, /^[0-9a-f]{16}$/);
  assert.equal(id, promptBuilder.imageIdFor('a researcher in a lab', 42));
});

test('imageIdFor: differs for different prompts and different seeds', () => {
  const a = promptBuilder.imageIdFor('a researcher', 1);
  const b = promptBuilder.imageIdFor('a researcher', 2);
  const c = promptBuilder.imageIdFor('a sculptor', 1);
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});

test('imageIdFor: null-byte separator prevents prompt/seed boundary collision', () => {
  // spec §2.2: id = sha256(scenePrompt + '\x00' + seed). Without the separator,
  // ("ab", 1) and ("a", "b1") could collide. We assert distinct ids for cases where
  // concatenation-without-separator would alias.
  const a = promptBuilder.imageIdFor('ab', 1);
  const b = promptBuilder.imageIdFor('a', 'b1'); // seed is intentionally a string-shaped value
  assert.notEqual(a, b);
});

test('enrichForSDXL returns a non-empty string containing the scene', () => {
  const out = promptBuilder.enrichForSDXL('a photo of a botanist');
  assert.equal(typeof out, 'string');
  assert.ok(out.length > 'a photo of a botanist'.length);
  assert.ok(out.includes('a photo of a botanist'));
});

test('enrichForFLUX returns a non-empty string containing the scene', () => {
  const out = promptBuilder.enrichForFLUX('a photo of a botanist');
  assert.equal(typeof out, 'string');
  assert.ok(out.length > 'a photo of a botanist'.length);
  assert.ok(out.includes('a photo of a botanist'));
});

test('enrichForSDXL and enrichForFLUX produce different output (different dialects)', () => {
  const scene = 'a photo of a botanist';
  assert.notEqual(promptBuilder.enrichForSDXL(scene), promptBuilder.enrichForFLUX(scene));
});

test('negative prompts are non-empty strings', () => {
  assert.equal(typeof promptBuilder.NEGATIVE_PROMPT_SDXL, 'string');
  assert.ok(promptBuilder.NEGATIVE_PROMPT_SDXL.length > 0);
  assert.equal(typeof promptBuilder.NEGATIVE_PROMPT_FLUX, 'string');
  assert.ok(promptBuilder.NEGATIVE_PROMPT_FLUX.length > 0);
});
