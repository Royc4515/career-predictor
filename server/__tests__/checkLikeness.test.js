const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildLikenessUrl, FIXTURE_REFS, SCENES, IDENTITY } = require('../scripts/checkLikeness');

test('the reference image and model travel as query parameters; no key in the URL', () => {
  const ref = 'https://example.com/face.jpg?x=1&y=2';
  const url = new URL(buildLikenessUrl({ scene: SCENES.founder, model: 'microsoft/mai-image-2.6', ref }));
  assert.equal(url.origin, 'https://gen.pollinations.ai');
  assert.equal(url.searchParams.get('image'), ref);
  assert.equal(url.searchParams.get('model'), 'microsoft/mai-image-2.6');
  assert.equal(url.searchParams.get('width'), '896');
  assert.equal(url.searchParams.get('height'), '1120');
  assert.doesNotMatch(url.href, /sk_/);
});

test('scenes leave identity to the photo', () => {
  const prompt = decodeURIComponent(new URL(buildLikenessUrl({ scene: SCENES.falafel, model: 'm', ref: 'https://e.x/a.jpg' })).pathname);
  assert.ok(prompt.includes(IDENTITY.trim()));
  for (const scene of Object.values(SCENES)) {
    // Any stated age, gender or background would fight the reference face.
    assert.doesNotMatch(scene, /\b(man|woman|his|her|twenties|thirties|forties|fifties|sixties)\b/i);
  }
});

test('default references point at the committed synthetic fixtures', () => {
  assert.equal(FIXTURE_REFS.length, 2);
  for (const ref of FIXTURE_REFS) {
    assert.match(ref, /^https:\/\/raw\.githubusercontent\.com\/Royc4515\/career-predictor\/main\/server\/scripts\/fixtures\//);
    const local = path.join(__dirname, '..', 'scripts', 'fixtures', path.basename(ref));
    assert.ok(fs.statSync(local).size > 10_000, `${local} is committed`);
  }
});
