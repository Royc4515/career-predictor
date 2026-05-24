// Phase 3 stub.

class RealVisXLProvider {
  constructor({ token, fetchImpl }) {
    if (!token) throw new Error('HUGGINGFACE_API_TOKEN required');
    this.token = token;
    this.fetch = fetchImpl ?? globalThis.fetch;
    this.name = 'realvisxl';
    this.dialect = 'sdxl';
  }
  async generate(_input) { throw new Error('not implemented'); }
}

module.exports = { RealVisXLProvider };
