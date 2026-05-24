// Phase 3 stub.

class LocalDiskStore {
  constructor({ cacheDir }) {
    if (!cacheDir) throw new Error('cacheDir required');
    this.cacheDir = cacheDir;
  }
  async get(_id) { throw new Error('not implemented'); }
  async put(_id, _buffer, _mimeType) { throw new Error('not implemented'); }
}

module.exports = { LocalDiskStore };
