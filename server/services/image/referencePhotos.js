const crypto = require('node:crypto');

// The uploaded selfie, held only as long as the image model needs it.
//
// Why a public URL at all: the Pollinations API takes the reference photo as
// a URL and fetches it itself. So the photo is served at /api/ref/:token, a
// 128-bit random token that expires after a few minutes or a few fetches,
// whichever comes first, and is deleted as soon as generation finishes.
//
// Why memory and not the database: a face photo is the most sensitive thing
// this app touches (biometric data under Israel's Amendment 13). It never
// touches disk or Turso. A restart drops it, which is the point; the
// generation it served dies with the process too.

const TOKEN_RE = /^[0-9a-f]{32}$/;
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_FETCHES = 3;
// Hard cap on photos held at once (rate limits keep the real number small).
const DEFAULT_MAX_ITEMS = 50;

class ReferencePhotos {
  constructor({ ttlMs = DEFAULT_TTL_MS, maxFetches = DEFAULT_MAX_FETCHES, maxItems = DEFAULT_MAX_ITEMS, now = Date.now } = {}) {
    this.ttlMs = ttlMs;
    this.maxFetches = maxFetches;
    this.maxItems = maxItems;
    this.now = now;
    this._items = new Map();
  }

  _sweep() {
    const t = this.now();
    for (const [token, item] of this._items) if (item.expiresAt <= t) this._items.delete(token);
  }

  /** Hold a photo; returns its token. */
  put(buffer, mimeType) {
    this._sweep();
    if (this._items.size >= this.maxItems) {
      // Oldest first: Map keeps insertion order.
      this._items.delete(this._items.keys().next().value);
    }
    const token = crypto.randomBytes(16).toString('hex');
    this._items.set(token, { buffer, mimeType, expiresAt: this.now() + this.ttlMs, fetches: 0 });
    return token;
  }

  /** One fetch of a photo, or null if unknown, expired or used up. */
  take(token) {
    if (!TOKEN_RE.test(String(token))) return null;
    const item = this._items.get(token);
    if (!item) return null;
    if (item.expiresAt <= this.now() || item.fetches >= this.maxFetches) {
      this._items.delete(token);
      return null;
    }
    item.fetches += 1;
    return { buffer: item.buffer, mimeType: item.mimeType };
  }

  delete(token) {
    this._items.delete(token);
  }

  get size() {
    this._sweep();
    return this._items.size;
  }
}

module.exports = { ReferencePhotos, TOKEN_RE };
