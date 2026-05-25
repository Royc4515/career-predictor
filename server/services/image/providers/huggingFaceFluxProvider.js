const ENDPOINT = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell';

class HuggingFaceFluxProvider {
  constructor({ token, fetchImpl }) {
    if (!token) throw new Error('HUGGINGFACE_API_TOKEN required');
    this.token = token;
    this.fetch = fetchImpl ?? globalThis.fetch;
    this.name = 'huggingface_flux';
    this.dialect = 'flux';
  }

  async generate({ prompt, seed, width, height, negativePrompt }) {
    const res = await this.fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'x-wait-for-model': 'true',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { seed, width, height, negative_prompt: negativePrompt },
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`HuggingFace ${res.status}: ${detail}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      buffer,
      mimeType: res.headers.get('content-type') || 'image/png',
      providerName: this.name,
    };
  }
}

module.exports = { HuggingFaceFluxProvider };
