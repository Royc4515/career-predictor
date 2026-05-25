const fs = require('node:fs/promises');
const path = require('node:path');

class LocalDiskStore {
  constructor({ cacheDir }) {
    if (!cacheDir) throw new Error('cacheDir required');
    this.cacheDir = cacheDir;
    this._ensured = false;
  }

  async _ensureDir() {
    if (this._ensured) return;
    await fs.mkdir(this.cacheDir, { recursive: true });
    this._ensured = true;
  }

  _paths(id) {
    return {
      data: path.join(this.cacheDir, `${id}.bin`),
      meta: path.join(this.cacheDir, `${id}.meta.json`),
    };
  }

  async get(id) {
    const { data, meta } = this._paths(id);
    try {
      const [buffer, metaText] = await Promise.all([fs.readFile(data), fs.readFile(meta, 'utf8')]);
      return { buffer, mimeType: JSON.parse(metaText).mimeType };
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async put(id, buffer, mimeType) {
    await this._ensureDir();
    const { data, meta } = this._paths(id);
    await Promise.all([
      fs.writeFile(data, buffer),
      fs.writeFile(meta, JSON.stringify({ mimeType })),
    ]);
  }
}

module.exports = { LocalDiskStore };
