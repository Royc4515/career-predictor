// Portraits stored as BLOBs in the app's existing Turso (libSQL) database.
//
// Why here and not a bucket: Render's free disk is wiped on every deploy, and
// the object stores that need no credit card each had a deal-breaker for this
// app (Supabase pauses idle free projects, Cloudinary's free signed URLs never
// expire, Vercel Blob locks you out for 30 days past its quota). Turso is
// already connected, has 5 GB free, and keeps private images private because
// bytes only leave through our own routes. At WebP sizes (~40-60 KB) that is
// tens of thousands of portraits.
//
// Reads are by primary key only: Turso bills every row a query scans, so an
// unindexed lookup would cost a read per stored image.

const DEFAULT_CACHE_ITEMS = 200;

class TursoStore {
  /**
   * client: a @libsql/client instance (its own connection; the store does
   * not depend on db.js having been initialised first).
   */
  constructor({ client, cacheItems = DEFAULT_CACHE_ITEMS }) {
    if (!client) throw new Error('libsql client required');
    this.client = client;
    this.cacheItems = cacheItems;
    // The same few landing-page portraits are fetched by every visitor; keep
    // the hottest in memory so they cost no round trip after the first.
    this._cache = new Map();
    this._ready = null;
  }

  _ensureTable() {
    // Memoised promise, reset on failure so a transient network error at
    // startup doesn't leave the store broken until the next restart.
    if (!this._ready) {
      this._ready = this.client
        .execute(
          `CREATE TABLE IF NOT EXISTS images (
             id TEXT PRIMARY KEY,
             mime TEXT NOT NULL,
             bytes BLOB NOT NULL,
             created_at DATETIME DEFAULT CURRENT_TIMESTAMP
           )`,
        )
        .catch((err) => {
          this._ready = null;
          throw err;
        });
    }
    return this._ready;
  }

  _remember(id, blob) {
    this._cache.delete(id);
    this._cache.set(id, blob);
    if (this._cache.size > this.cacheItems) this._cache.delete(this._cache.keys().next().value);
  }

  async get(id) {
    const hit = this._cache.get(id);
    if (hit) {
      this._remember(id, hit); // refresh recency
      return hit;
    }
    await this._ensureTable();
    const result = await this.client.execute({ sql: 'SELECT mime, bytes FROM images WHERE id = ?', args: [id] });
    const row = result.rows[0];
    if (!row) return null; // not cached: it may still be generating
    // libsql returns BLOBs as ArrayBuffer; callers expect a Node Buffer.
    const blob = { buffer: Buffer.from(row.bytes), mimeType: row.mime };
    this._remember(id, blob);
    return blob;
  }

  async put(id, buffer, mimeType) {
    await this._ensureTable();
    await this.client.execute({
      sql: 'INSERT OR REPLACE INTO images (id, mime, bytes) VALUES (?, ?, ?)',
      args: [id, mimeType, buffer],
    });
    this._remember(id, { buffer, mimeType });
  }
}

module.exports = { TursoStore };
