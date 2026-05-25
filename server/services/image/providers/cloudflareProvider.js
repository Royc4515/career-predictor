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

  async generate({ prompt, seed, width, height, negativePrompt }) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
    const res = await this.fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt, seed, width, height,
        negative_prompt: negativePrompt,
        // CF Workers AI flux-1-schnell schema field is `steps`, not `num_steps`.
        steps: 8,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Cloudflare ${res.status}: ${detail}`);
    }
    const json = await res.json();
    // CF Workers AI returns the PNG as base64 in result.image
    const buffer = Buffer.from(json.result.image, 'base64');
    return { buffer, mimeType: 'image/png', providerName: this.name };
  }
}

module.exports = { CloudflareProvider };
