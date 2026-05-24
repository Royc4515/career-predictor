// Phase 3 stub.

class PollinationsProvider {
  constructor({ fetchImpl } = {}) {
    this.fetch = fetchImpl ?? globalThis.fetch;
    this.name = 'pollinations';
    this.dialect = 'flux';
  }
  async generate(_input) { throw new Error('not implemented'); }
}

module.exports = { PollinationsProvider };
