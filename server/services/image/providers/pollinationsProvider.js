class PollinationsProvider {
  constructor({ fetchImpl } = {}) {
    this.fetch = fetchImpl ?? globalThis.fetch;
    this.name = 'pollinations';
    this.dialect = 'flux';
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
