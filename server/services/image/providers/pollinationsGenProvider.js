// Keyed Pollinations API (gen.pollinations.ai). The keyless image.pollinations.ai
// endpoint used by PollinationsProvider now answers every request with the
// cheapest model ("sana") regardless of the `model` param, so this provider is
// the one that actually reaches current models (Z-Image, FLUX.1.1 pro, FLUX.2,
// MAI Image, GPT Image...).

const BASE = 'https://gen.pollinations.ai/image/';
const DEFAULT_MODEL = 'tongyi-mai/z-image-turbo';

class PollinationsGenProvider {
  constructor({ apiKey, model, fetchImpl } = {}) {
    if (!apiKey) throw new Error('POLLINATIONS_API_KEY required');
    // A pk_ key is a public OAuth client id; the API rejects it with 401 on
    // every call. Fail at startup instead of on the first user's portrait.
    if (apiKey.startsWith('pk_')) {
      throw new Error('POLLINATIONS_API_KEY must be a secret sk_ key, not a publishable pk_ key');
    }
    this.apiKey = apiKey;
    this.model = model || DEFAULT_MODEL;
    this.fetch = fetchImpl ?? globalThis.fetch;
    this.name = 'pollinations_gen';
    this.dialect = 'flux';
  }

  async generate({ prompt, seed, width, height }) {
    // negativePrompt is intentionally not sent: the image endpoint has no such
    // parameter for current models, and they follow positive phrasing anyway.
    const params = new URLSearchParams({
      model: this.model,
      width: String(width),
      height: String(height),
      seed: String(seed),
    });
    const url = BASE + encodeURIComponent(prompt) + '?' + params.toString();
    const res = await this.fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`PollinationsGen ${res.status}: ${detail.slice(0, 200)}`);
    }
    const mimeType = res.headers.get('content-type') || 'image/jpeg';
    // A JSON body with 200 would otherwise be cached forever as an "image".
    if (!mimeType.startsWith('image/')) {
      throw new Error(`PollinationsGen returned non-image content-type ${mimeType}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) throw new Error('PollinationsGen returned an empty body');
    return { buffer, mimeType, providerName: this.name };
  }
}

module.exports = { PollinationsGenProvider, DEFAULT_MODEL };
