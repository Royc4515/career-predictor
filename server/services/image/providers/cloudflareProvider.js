// Phase 3 stub.

class CloudflareProvider {
  constructor({ accountId, token, fetchImpl }) {
    if (!accountId || !token) {
      throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required');
    }
    this.accountId = accountId;
    this.token = token;
    this.fetch = fetchImpl ?? globalThis.fetch;
    this.name = 'cloudflare';
    this.dialect = 'flux';
  }
  async generate(_input) { throw new Error('not implemented'); }
}

module.exports = { CloudflareProvider };
