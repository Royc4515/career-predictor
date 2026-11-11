// A small sliding-window limiter for personal portraits. Each one costs real
// pollen (about 0.025 on MAI Image, six times a shared portrait), so both a
// per-user and a site-wide cap apply.
//
// In memory on purpose: one Render instance, and a restart forgetting the
// counts is an acceptable worst case for a portfolio site. If the app ever
// runs more than one instance, move this to the database.

class SlidingWindowLimiter {
  constructor({ limit, windowMs, now = Date.now }) {
    if (!(limit > 0) || !(windowMs > 0)) throw new Error('limit and windowMs must be positive');
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    this._hits = new Map();
  }

  _recent(key) {
    const since = this.now() - this.windowMs;
    const hits = (this._hits.get(key) || []).filter((t) => t > since);
    this._hits.set(key, hits);
    return hits;
  }

  /** True when another hit is allowed right now (does not record one). */
  allows(key) {
    return this._recent(key).length < this.limit;
  }

  record(key) {
    this._recent(key).push(this.now());
  }

  /** Milliseconds until the oldest hit leaves the window (0 when allowed). */
  retryAfterMs(key) {
    const hits = this._recent(key);
    if (hits.length < this.limit) return 0;
    return Math.max(0, hits[0] + this.windowMs - this.now());
  }
}

module.exports = { SlidingWindowLimiter };
