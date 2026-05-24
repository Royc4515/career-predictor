// Phase 3 stub.

class TogetherProvider {
  constructor({ apiKey, fetchImpl }) {
    if (!apiKey) throw new Error('TOGETHER_API_KEY required');
    this.apiKey = apiKey;
    this.fetch = fetchImpl ?? globalThis.fetch;
    this.name = 'together';
    this.dialect = 'flux';
  }
  async generate(_input) { throw new Error('not implemented'); }
}

module.exports = { TogetherProvider };
