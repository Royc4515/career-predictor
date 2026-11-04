class PollinationsProvider {
  constructor({ fetchImpl } = {}) {
    this.fetch = fetchImpl ?? globalThis.fetch;
    this.name = 'pollinations';
    this.dialect = 'flux';
    // The keyless endpoint only serves its cheapest model, with a watermark.
    // As a fallback its output is a stopgap, not a portrait to keep forever:
    // ImageService holds it in memory and retries the better providers later.
    this.provisional = true;
  }

  async generate({ prompt, seed, width, height, negativePrompt }) {
    const url =
      'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) +
      `?model=flux-realism&width=${width}&height=${height}&nologo=true` +
      `&seed=${seed}&negative_prompt=${encodeURIComponent(negativePrompt)}`;
    const res = await this.fetch(url);
    if (!res.ok) throw new Error(`Pollinations ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      buffer,
      mimeType: res.headers.get('content-type') || 'image/png',
      providerName: this.name,
    };
  }
}

module.exports = { PollinationsProvider };
