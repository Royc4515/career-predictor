const crypto = require('node:crypto');

// titleToSeed preserves the algorithm from the legacy route handler so any
// previously-cached career → image mappings remain reachable post-migration.
function titleToSeed(title) {
  return Math.abs(
    title.split('').reduce((acc, c) => (Math.imul(acc, 31) + c.charCodeAt(0)) | 0, 0)
  ) % 2_147_483_647;
}

// Null-byte separator prevents ("ab", 1) from aliasing ("a", "b1").
function imageIdFor(scenePrompt, seed) {
  return crypto.createHash('sha256').update(scenePrompt + '\x00' + seed).digest('hex').slice(0, 16);
}

// House style. Every career shares one art direction so results read as a
// series from the same magazine, not as unrelated AI images. The wording is
// deliberately plain: "8K, award-winning, hyperdetailed" tag soup is what
// makes output look synthetic on current models, and it adds nothing.
// The empty space above the subject is load-bearing: the client sets the
// masthead and headline there (see client/src/lib/cover.js).

// SDXL fine-tunes (RealVisXL) still respond best to comma-separated tags.
const SDXL_SUFFIX =
  'editorial magazine cover photograph, medium format camera, 80mm lens, ' +
  'soft natural window light, subtle film grain, muted true-to-life colors, ' +
  'subject in lower two thirds, clean empty space above head, deadpan expression, ' +
  'documentary realism, photorealistic, sharp focus';

// FLUX-family and other current models follow natural-language direction.
const FLUX_SUFFIX =
  '. Shot as an editorial magazine cover photograph on a medium format camera with an 80mm lens. ' +
  'Soft natural light with one practical light source in the scene, subtle film grain, ' +
  'muted true-to-life colors, realistic skin texture. ' +
  'The subject sits in the lower two thirds of a vertical frame with calm, uncluttered space above their head. ' +
  'Deadpan, candid expression, documentary realism, not staged. ' +
  'No text, no letters, no logos, no watermark anywhere in the image.';

function enrichForSDXL(scene) {
  return scene + ', ' + SDXL_SUFFIX;
}

function enrichForFLUX(scene) {
  return scene + FLUX_SUFFIX;
}

// Lettering is listed explicitly because image models hallucinate fake words
// on screens and signs, and the client already sets real type over the photo.
const NEGATIVE_PROMPT_SDXL = [
  '(deformed:1.3)', '(disfigured:1.3)', '(bad anatomy:1.2)', '(bad hands:1.2)',
  'extra limbs', 'missing limbs', 'fused fingers', 'mutated', 'duplicate',
  'watermark', 'text', 'letters', 'typography', 'signature', 'logo',
  'cartoon', 'anime', 'illustration', '3D render', 'plastic skin', 'airbrushed',
  'oversaturated', 'blurry', 'low quality', 'jpeg artifacts', 'overexposed', 'underexposed',
].join(', ');

const NEGATIVE_PROMPT_FLUX = [
  'deformed', 'blurry', 'low quality', 'bad anatomy', 'bad hands', 'extra limbs',
  'missing limbs', 'fused fingers', 'watermark', 'text', 'letters', 'typography',
  'signature', 'logo', 'cartoon', 'anime', 'illustration', 'painting', '3D render',
  'plastic skin', 'airbrushed', 'oversaturated', 'HDR', 'disfigured', 'duplicate',
  'jpeg artifacts', 'cross-eyed',
].join(', ');

module.exports = {
  titleToSeed,
  imageIdFor,
  enrichForSDXL,
  enrichForFLUX,
  NEGATIVE_PROMPT_SDXL,
  NEGATIVE_PROMPT_FLUX,
};
