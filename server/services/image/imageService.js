const DEFAULT_SIZE = Object.freeze({ width: 768, height: 768 });

// Every provider in the chain has its own limits (FLUX.1.1 pro: multiples of
// 32, MAI: multiples of 16 and >= 768). Reject sizes no provider is guaranteed
// to accept at construction time instead of failing one provider at a time.
function validateSize(size) {
  const { width, height } = size || {};
  const ok = (n) => Number.isInteger(n) && n >= 256 && n <= 1440 && n % 32 === 0;
  if (!ok(width) || !ok(height)) {
    throw new Error(`size must have integer width/height in [256, 1440] divisible by 32, got ${JSON.stringify(size)}`);
  }
  return Object.freeze({ width, height });
}

class ImageService {
  // size is optional so the spec default (768x768) still holds for callers that
  // don't care; production passes a 4:5 portrait for the magazine-cover layout.
  constructor({ providers, blobStore, promptBuilder, logger = console, size = DEFAULT_SIZE }) {
    if (!Array.isArray(providers)) throw new Error('providers must be an array');
    if (!blobStore) throw new Error('blobStore required');
    if (!promptBuilder) throw new Error('promptBuilder required');
    // An empty providers list is allowed: only kickoff fails (caught in the
    // wrapper); fetchIfReady remains usable as a pure BlobStore reader.
    this.providers = providers;
    this.blobStore = blobStore;
    this.promptBuilder = promptBuilder;
    this.logger = logger;
    this.size = validateSize(size);
    this.inFlight = new Map();
  }

  // Sync return per spec §2.kickoff.1. No await on the path from entry to return.
  kickoff({ scenePrompt, title }) {
    const seed = this.promptBuilder.titleToSeed(title);
    const id = this.promptBuilder.imageIdFor(scenePrompt, seed);

    if (!this.inFlight.has(id)) {
      // The wrapper promise stored in the map never rejects: errors are caught
      // and logged; finally clears the entry so the next kickoff can retry.
      const wrapper = this._generateAndStore({ id, scenePrompt, seed })
        .catch((err) => this.logger.error(`[IMAGE] generation failed (id=${id}): ${err.message}`))
        .finally(() => this.inFlight.delete(id));
      this.inFlight.set(id, wrapper);
    }
    return { id };
  }

  // Pure BlobStore lookup. Spec §2.fetchIfReady — never calls providers.
  async fetchIfReady(id) {
    return this.blobStore.get(id);
  }

  async _generateAndStore({ id, scenePrompt, seed }) {
    // Cache short-circuit lives here, not in kickoff (kickoff cannot await).
    if (await this.blobStore.get(id)) return;

    const totalT0 = Date.now();
    let lastErr;
    for (const provider of this.providers) {
      const t0 = Date.now();
      try {
        const dialect = provider.dialect;
        const input = {
          prompt: dialect === 'sdxl'
            ? this.promptBuilder.enrichForSDXL(scenePrompt)
            : this.promptBuilder.enrichForFLUX(scenePrompt),
          seed,
          width: this.size.width,
          height: this.size.height,
          negativePrompt: dialect === 'sdxl'
            ? this.promptBuilder.NEGATIVE_PROMPT_SDXL
            : this.promptBuilder.NEGATIVE_PROMPT_FLUX,
        };
        const out = await provider.generate(input);
        await this.blobStore.put(id, out.buffer, out.mimeType);
        this.logger.log(`[IMAGE] ok provider=${provider.name} durationMs=${Date.now() - t0} id=${id} totalMs=${Date.now() - totalT0}`);
        return;
      } catch (err) {
        lastErr = err;
        this.logger.warn(`[IMAGE] error provider=${provider.name} durationMs=${Date.now() - t0} message=${err.message}`);
      }
    }
    throw new Error(`All image providers failed: ${lastErr?.message}`);
  }
}

module.exports = { ImageService, DEFAULT_SIZE };
