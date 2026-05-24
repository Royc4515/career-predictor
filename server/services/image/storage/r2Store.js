// Phase 3 stub. R2Store is implementation-only; not covered by unit tests
// (requires live R2 credentials). Verified via §5 step 4 manual production smoke.

class R2Store {
  constructor(_opts) { /* Phase 5 */ }
  async get(_id) { throw new Error('not implemented'); }
  async put(_id, _buffer, _mimeType) { throw new Error('not implemented'); }
}

module.exports = { R2Store };
