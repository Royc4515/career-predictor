const ENDPOINT = 'https://api.together.xyz/v1/images/generations';

class TogetherProvider {
  constructor({ apiKey, fetchImpl }) {
    if (!apiKey) throw new Error('TOGETHER_API_KEY required');
    this.apiKey = apiKey;
    this.fetch = fetchImpl ?? globalThis.fetch;
    this.name = 'together';
    this.dialect = 'flux';
  }

  async generate({ prompt, seed, width, height }) {
    const res = await this.fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell-Free',
        prompt, seed, width, height,
        steps: 4,
        n: 1,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Together ${res.status}: ${detail}`);
    }
    const json = await res.json();
    const url = json?.data?.[0]?.url;
    if (!url) throw new Error('Together returned no image URL');
    const img = await this.fetch(url);
    if (!img.ok) throw new Error(`Together image fetch ${img.status}`);
    const buffer = Buffer.from(await img.arrayBuffer());
    return {
      buffer,
      mimeType: img.headers.get('content-type') || 'image/png',
      providerName: this.name,
    };
  }
}

module.exports = { TogetherProvider };
