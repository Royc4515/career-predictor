// Lazy singleton — exported indirectly via getImageService() so process.env
// is read at first call (after dotenv.config()), not at module-import time.

const { ImageService } = require('./imageService');
const { resolveProviders } = require('./providers');
const { resolveBlobStore } = require('./storage');
const promptBuilder = require('./promptBuilder');

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

// Test-only: drop the singleton so a subsequent getImageService() rebuilds
// from a freshly-mutated process.env. Not used in production paths.
function _resetForTests() { instance = undefined; }

module.exports = { getImageService, _resetForTests, COVER_SIZE };
