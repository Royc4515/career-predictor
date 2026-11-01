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
    instance = new ImageService({
      providers: resolveProviders(process.env),
      blobStore: resolveBlobStore(process.env),
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
