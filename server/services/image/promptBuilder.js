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
// don't touch / The framing line is load-bearing. The client covers the top
// ~20% with the masthead and the bottom ~40% with the headline over a dark
// gradient (client/src/components/Cover.jsx, client/src/lib/coverLayout.js),
// so the face and the gag must land in the middle band. "Subject in the lower
// two thirds" used to push the props the joke depends on under the headline.

// SDXL fine-tunes (RealVisXL) still respond best to comma-separated tags.
const SDXL_SUFFIX =
  'editorial magazine cover photograph, medium format camera, 80mm lens, ' +
  'soft natural window light, subtle film grain, muted true-to-life colors, ' +
  'medium shot, generous headroom, subject centred, top of head a third of the way down the frame, ' +
  'key props held at chest to shoulder height beside the face, nothing important near the bottom edge, ' +
  'face just above the middle, plain backdrop above head, deadpan expression, ' +
  'documentary realism, photorealistic, sharp focus, plain unmarked surfaces';

// FLUX-family and other current models follow natural-language direction.
// Turbo models (Z-Image Turbo, FLUX.2 klein) run without CFG and ignore the
// negative prompt, so everything that must stay out of the frame is said here.
// It is phrased positively first ("blank", "unmarked") because naming a thing,
// even to forbid it, can summon it; the closing "No text" line is kept because
// the LLM text encoders these models use do read negation.
const FLUX_SUFFIX =
  '. Shot as an editorial magazine cover photograph on a medium format camera with an 80mm lens at f/4. ' +
  'Soft natural light with one practical light source in the scene, subtle film grain, ' +
  'muted true-to-life colors, realistic skin texture. ' +
  'Vertical medium shot with generous headroom: one main subject near the horizontal centre, the top of their head about a third of the way down the frame ' +
  'and their face just above the middle, with calm, plain backdrop filling the space above them and the details that tell the story kept in the middle of the picture. ' +
  // don't touch / The bottom ~40% sits under the headline gradient: on the
  // live covers a cake held at waist height and a falafel tower on a counter
  // disappeared behind the title.
  'Any prop that carries the story is held or placed at chest to shoulder height, close beside the face, never down near the bottom edge of the frame. ' +
  'Played completely straight: sincere, deadpan expression, candid documentary realism. ' +
  'Screens show only soft blank light, and every paper, wall, garment and object is plain and unmarked. ' +
  'No text, no logos, no watermark anywhere in the image.';

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
