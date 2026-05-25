// Lazy singleton — exported indirectly via getImageService() so process.env
// is read at first call (after dotenv.config()), not at module-import time.

const { ImageService } = require('./imageService');
const { resolveProviders } = require('./providers');
const { resolveBlobStore } = require('./storage');
const promptBuilder = require('./promptBuilder');

let instance;

function getImageService() {
  if (!instance) {
    instance = new ImageService({
      providers: resolveProviders(process.env),
      blobStore: resolveBlobStore(process.env),
      promptBuilder,
    });
  }
  return instance;
}

// Test-only: drop the singleton so a subsequent getImageService() rebuilds
// from a freshly-mutated process.env. Not used in production paths.
function _resetForTests() { instance = undefined; }

module.exports = { getImageService, _resetForTests };
