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

// SDXL fine-tunes (RealVisXL) respond best to comma-separated tags with weights.
const SDXL_SUFFIX =
  '(photorealistic:1.2), (highly detailed skin:1.1), Canon EOS R5, 85mm f/1.4, ' +
  'shallow depth of field, cinematic lighting, chiaroscuro, hyperdetailed, ' +
  '8k UHD, sharp focus, editorial portrait, award-winning';

// FLUX prefers natural-language descriptions over tag soup.
const FLUX_SUFFIX =
  ', cinematic composition, dramatic chiaroscuro lighting, shallow depth of field, ' +
  'Canon EOS R5 85mm f/1.4 lens, photorealistic, 8K UHD, hyperdetailed textures, ' +
  'subsurface skin scattering, volumetric light rays, film grain, professionally color graded, ' +
  'editorial photography, award-winning shot';

function enrichForSDXL(scene) {
  return scene + ', ' + SDXL_SUFFIX;
}

function enrichForFLUX(scene) {
  return scene + FLUX_SUFFIX;
}

const NEGATIVE_PROMPT_SDXL = [
  '(deformed:1.3)', '(disfigured:1.3)', '(bad anatomy:1.2)', '(bad hands:1.2)',
  'extra limbs', 'missing limbs', 'fused fingers', 'mutated', 'duplicate',
  'watermark', 'text', 'signature', 'logo',
  'cartoon', 'anime', 'illustration', '3D render', 'plastic skin',
  'blurry', 'low quality', 'jpeg artifacts', 'overexposed', 'underexposed', 'flat lighting',
].join(', ');

const NEGATIVE_PROMPT_FLUX = [
  'ugly', 'deformed', 'noisy', 'blurry', 'low quality', 'worst quality',
  'bad anatomy', 'bad hands', 'extra limbs', 'missing limbs', 'fused fingers',
  'watermark', 'text overlay', 'signature', 'logo',
  'cartoon', 'anime', 'illustration', 'painting', 'sketch', '3D render',
  'plastic skin', 'overexposed', 'underexposed', 'washed out', 'flat lighting',
  'disfigured', 'mutated', 'duplicate', 'jpeg artifacts', 'cross-eyed',
].join(', ');

module.exports = {
  titleToSeed,
  imageIdFor,
  enrichForSDXL,
  enrichForFLUX,
  NEGATIVE_PROMPT_SDXL,
  NEGATIVE_PROMPT_FLUX,
};
