// Phase 3 stub.

class HuggingFaceFluxProvider {
  constructor({ token, fetchImpl }) {
    if (!token) throw new Error('HUGGINGFACE_API_TOKEN required');
    this.token = token;
    this.fetch = fetchImpl ?? globalThis.fetch;
    this.name = 'huggingface_flux';
    this.dialect = 'flux';
  }
  async generate(_input) { throw new Error('not implemented'); }
}

module.exports = { HuggingFaceFluxProvider };
