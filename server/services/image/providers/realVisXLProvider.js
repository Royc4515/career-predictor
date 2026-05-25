const ENDPOINT = 'https://api-inference.huggingface.co/models/SG161222/RealVisXL_V4.0';

class RealVisXLProvider {
  constructor({ token, fetchImpl }) {
    if (!token) throw new Error('HUGGINGFACE_API_TOKEN required');
    this.token = token;
    this.fetch = fetchImpl ?? globalThis.fetch;
    this.name = 'realvisxl';
    this.dialect = 'sdxl';
  }

  async generate({ prompt, seed, width, height, negativePrompt }) {
    const res = await this.fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        // block until warm rather than 503 — RealVisXL isn't always in the warm pool
        'x-wait-for-model': 'true',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          seed, width, height,
          negative_prompt: negativePrompt,
          num_inference_steps: 30,
          guidance_scale: 7,
        },
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`RealVisXL ${res.status}: ${detail}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      buffer,
      mimeType: res.headers.get('content-type') || 'image/png',
      providerName: this.name,
    };
  }
}

module.exports = { RealVisXLProvider };
