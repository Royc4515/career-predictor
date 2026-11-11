import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitWithin } from '../photo.js';
import { isOwnImageUrl } from '../imageUrls.js';

test('fitWithin scales the long edge to 1024 and never upscales', () => {
  assert.deepEqual(fitWithin(4032, 3024), { width: 1024, height: 768 });
  assert.deepEqual(fitWithin(3024, 4032), { width: 768, height: 1024 });
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
  assert.throws(() => fitWithin(0, 100));
});

test('isOwnImageUrl recognises both our image routes, not third-party URLs', () => {
  assert.equal(isOwnImageUrl('https://site/api/image/0123456789abcdef'), true);
  assert.equal(isOwnImageUrl('/api/user/portrait/image/0123456789abcdef'), true);
  assert.equal(isOwnImageUrl('https://image.pollinations.ai/prompt/x'), false);
  assert.equal(isOwnImageUrl(undefined), false);
});
