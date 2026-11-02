// FLUX.2 [klein] 9B on Cloudflare Workers AI. Unlike flux-1-schnell (JSON body),
// FLUX.2 models on Workers AI only accept multipart/form-data, even for a
// prompt-only request.

const MODEL = '@cf/black-forest-labs/flux-2-klein-9b';

class CloudflareFlux2Provider {
  constructor({ accountId, token, fetchImpl }) {
    if (!accountId || !token) {
      throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required');
    }
    this.accountId = accountId;
    this.token = token;
    this.fetch = fetchImpl ?? globalThis.fetch;
    this.name = 'cloudflare_flux2';
    this.dialect = 'flux';
  }

  async generate({ prompt, seed, width, height }) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${MODEL}`;
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('width', String(width));
    form.append('height', String(height));
    form.append('seed', String(seed));
    // don't touch / No Content-Type header here: fetch must generate it so the
    // multipart boundary is included. A hand-written value breaks parsing.
    const res = await this.fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`CloudflareFlux2 ${res.status}: ${detail.slice(0, 200)}`);
    }
    const json = await res.json();
    const b64 = json?.result?.image;
    if (!b64) throw new Error('CloudflareFlux2 returned no image');
    return { buffer: Buffer.from(b64, 'base64'), mimeType: 'image/png', providerName: this.name };
  }
}

module.exports = { CloudflareFlux2Provider, MODEL };
