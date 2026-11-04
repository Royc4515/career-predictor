// Wraps any BlobStore and re-encodes portraits as WebP on the way in.
//
// Why: providers return 200-700 KB JPEGs and every visitor downloads them
// from our server. Render's free tier includes 5 GB of outbound bandwidth a
// month and, with no card on file, suspends the service for the rest of the
// month once it is used up. Measured on the live portraits, WebP at quality
// 80 is about 9% of the original size with no visible difference at cover
// size. Encoding once at write time costs ~0.2 s per image; the portrait
// itself takes 10-30 s to generate.
//
// Image ids are content hashes of the prompt, not of the bytes, so changing
// the encoding keeps every URL stable.

const WEBP = 'image/webp';
const DEFAULT_QUALITY = 80;
// Effort 4 of 6: most of the size win at a fraction of the CPU, which
// matters on Render's shared free-tier CPU.
const DEFAULT_EFFORT = 4;

function defaultTranscoder({ quality, effort }) {
  // Loaded lazily so the server still starts (storing originals) if the
  // native module failed to install on some platform.
  const sharp = require('sharp');
  return (buffer) => sharp(buffer).webp({ quality, effort }).toBuffer();
}

class WebpStore {
  constructor({ inner, quality = DEFAULT_QUALITY, effort = DEFAULT_EFFORT, transcode, logger = console }) {
    if (!inner) throw new Error('inner store required');
    this.inner = inner;
    this.logger = logger;
    this._transcode = transcode ?? null;
    this._options = { quality, effort };
  }

  _transcoder() {
    if (!this._transcode) this._transcode = defaultTranscoder(this._options);
    return this._transcode;
  }

  get(id) {
    return this.inner.get(id);
  }

  async put(id, buffer, mimeType) {
    if (mimeType === WEBP) return this.inner.put(id, buffer, mimeType);
    let webp;
    try {
      webp = await this._transcoder()(buffer);
    } catch (err) {
      // A portrait we can't shrink is still a portrait: keep the original
      // rather than lose an image that took a paid generation to make.
      this.logger.warn?.(`[IMAGE] webp transcode failed for ${id}, storing ${mimeType}: ${err.message}`);
      return this.inner.put(id, buffer, mimeType);
    }
    // don't touch / Never store a "smaller" image that is larger (a tiny or
    // already-compressed input can grow when re-encoded).
    if (!webp?.length || webp.length >= buffer.length) return this.inner.put(id, buffer, mimeType);
    return this.inner.put(id, webp, WEBP);
  }
}

module.exports = { WebpStore };
