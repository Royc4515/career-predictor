// Lazy singleton — exported indirectly via getImageService() so process.env
// is read at first call (after dotenv.config()), not at module-import time.

const { ImageService } = require('./imageService');
const { resolveProviders } = require('./providers');
const { resolveBlobStore } = require('./storage');
const promptBuilder = require('./promptBuilder');
const { PersonalPortraitService } = require('./personalPortraits');
const { ReferencePhotos } = require('./referencePhotos');
const { PollinationsGenProvider } = require('./providers/pollinationsGenProvider');

// Image-to-image models for personal portraits, tried in order. Both accept a
// reference photo and are not paid-only on Pollinations; both passed the
// likeness test (docs/personal-portrait.md). Flash first: half the price.
const DEFAULT_PERSONAL_MODELS = ['microsoft/mai-image-2.6-flash', 'microsoft/mai-image-2.6'];

// 4:5 portrait, the proportions of a magazine cover. 896 and 1120 are both
// multiples of 32 and the total (1.0 MP) fits every provider's pixel budget.
const COVER_SIZE = { width: 896, height: 1120 };

let instance;

function getImageService() {
  if (!instance) {
    const providers = resolveProviders(process.env);
    // Names only, never keys: lets the Render log confirm at a glance that a
    // newly added POLLINATIONS_API_KEY was picked up.
    console.log(`[IMAGE] provider chain: ${providers.map((p) => p.name).join(' -> ')}`);
    const blobStore = resolveBlobStore(process.env);
    // e.g. "turso+webp": confirms in the Render log that portraits persist.
    console.log(`[IMAGE] store: ${blobStore.label}`);
    instance = new ImageService({
      providers,
      blobStore,
      promptBuilder,
      size: COVER_SIZE,
    });
  }
  return instance;
}

let personal;
let refs;

/** The in-memory holder for uploaded reference photos (served at /api/ref/:token). */
function getReferencePhotos() {
  if (!refs) refs = new ReferencePhotos();
  return refs;
}

/**
 * Personal portraits share the durable store (WebP in Turso) with shared
 * portraits; ids never collide (random vs content hash). Unavailable without
 * POLLINATIONS_API_KEY or a public https SERVER_URL.
 */
function getPersonalPortraitService() {
  if (!personal) {
    const key = process.env.POLLINATIONS_API_KEY;
    const models = (process.env.PERSONAL_PORTRAIT_MODELS || DEFAULT_PERSONAL_MODELS.join(','))
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    const providers = key ? models.map((model) => new PollinationsGenProvider({ apiKey: key, model })) : [];
    personal = new PersonalPortraitService({
      providers,
      blobStore: getImageService().blobStore,
      refs: getReferencePhotos(),
      promptBuilder,
      size: COVER_SIZE,
      publicBaseUrl: process.env.SERVER_URL,
    });
    console.log(`[PORTRAIT] personal portraits: ${personal.available ? models.join(' -> ') : 'off (needs POLLINATIONS_API_KEY and an https SERVER_URL)'}`);
  }
  return personal;
}

// Test-only: drop the singletons so a subsequent call rebuilds from a
// freshly-mutated process.env. Not used in production paths.
function _resetForTests() {
  instance = undefined;
  personal = undefined;
  refs = undefined;
}

module.exports = { getImageService, getPersonalPortraitService, getReferencePhotos, _resetForTests, COVER_SIZE };
