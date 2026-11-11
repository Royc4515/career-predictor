const crypto = require('node:crypto');

// Renders a career scene with the user's own face (opt-in, from the result
// page). Kept apart from ImageService on purpose: that one is built around
// shared, content-addressed portraits that every user with a title sees;
// these are private, one per user, and must never land under a shared id.
//
// Flow: start() returns at once with a random id, generation runs in the
// background through the providers in order (MAI Image flash, then MAI
// Image 2.6: the likeness test passed with both, and a content-moderation
// false positive on one usually passes on the other), the result goes to
// the durable store under that id, and onDone reports 'ready' or 'failed'.
// The reference photo is deleted when generation ends, whatever the outcome.

class PersonalPortraitService {
  constructor({ providers, blobStore, refs, promptBuilder, size, publicBaseUrl, logger = console }) {
    if (!blobStore || !refs || !promptBuilder || !size) throw new Error('blobStore, refs, promptBuilder and size required');
    this.providers = providers || [];
    this.blobStore = blobStore;
    this.refs = refs;
    this.promptBuilder = promptBuilder;
    this.size = size;
    this.publicBaseUrl = (publicBaseUrl || '').replace(/\/$/, '');
    this.logger = logger;
    this.inFlight = new Map();
    this.tokens = new Map(); // id -> reference-photo token, while running
    this.cancelled = new Set();
  }

  /**
   * Available only with an image-to-image provider and a public base URL the
   * model can fetch the reference photo from (a localhost URL can't work).
   */
  get available() {
    return this.providers.length > 0 && /^https:\/\//.test(this.publicBaseUrl);
  }

  isGenerating(id) {
    return this.inFlight.has(id);
  }

  /**
   * Withdraw a portrait that is still being made (the reader removed it, or
   * the issue it belonged to). The reference photo goes at once, and the
   * job will not keep what the model returns: a removal answered 204 must
   * not be followed by the face landing in the store. True if a job was
   * running.
   */
  cancel(id) {
    if (!this.inFlight.has(id)) return false;
    this.cancelled.add(id);
    const token = this.tokens.get(id);
    if (token) this.refs.delete(token);
    return true;
  }

  /**
   * photo: { buffer, mimeType } (already normalised). scene: the career's
   * identity-neutral scene. onDone(status, error) is called once.
   * Returns { id } synchronously.
   */
  start({ photo, scene, title, onDone = () => {} }) {
    if (!this.available) throw new Error('personal portraits are not configured');
    const id = crypto.randomBytes(8).toString('hex');
    const token = this.refs.put(photo.buffer, photo.mimeType);
    this.tokens.set(id, token);
    const run = this._generate({ id, token, scene, title })
      .then((outcome) => onDone(outcome))
      .catch((err) => {
        this.logger.error(`[PORTRAIT] failed id=${id}: ${err.message}`);
        onDone('failed', err);
      })
      .finally(() => {
        this.refs.delete(token);
        this.inFlight.delete(id);
        this.tokens.delete(id);
        this.cancelled.delete(id);
      });
    this.inFlight.set(id, run);
    return { id };
  }

  async _generate({ id, token, scene, title }) {
    const input = {
      prompt: this.promptBuilder.personalPrompt(scene),
      // The career's seed, so a retry of the same photo and career is stable.
      seed: this.promptBuilder.titleToSeed(title),
      width: this.size.width,
      height: this.size.height,
      referenceUrl: `${this.publicBaseUrl}/api/ref/${token}`,
    };
    let lastErr;
    for (const provider of this.providers) {
      if (this.cancelled.has(id)) return 'cancelled';
      const t0 = Date.now();
      try {
        const out = await provider.generate(input);
        if (this.cancelled.has(id)) return 'cancelled';
        await this.blobStore.put(id, out.buffer, out.mimeType);
        // don't touch / Cancelled while the write was in flight: the delete
        // that came with the cancel ran before these bytes existed.
        if (this.cancelled.has(id)) {
          await this.blobStore.delete(id);
          return 'cancelled';
        }
        this.logger.log(`[PORTRAIT] ok model=${provider.model || provider.name} durationMs=${Date.now() - t0} id=${id}`);
        return 'ready';
      } catch (err) {
        lastErr = err;
        this.logger.warn(`[PORTRAIT] error model=${provider.model || provider.name} durationMs=${Date.now() - t0} message=${err.message}`);
      }
    }
    throw new Error(`All personal-portrait models failed: ${lastErr?.message}`);
  }
}

module.exports = { PersonalPortraitService };
