const { RealVisXLProvider } = require('./realVisXLProvider');
const { CloudflareProvider } = require('./cloudflareProvider');
const { HuggingFaceFluxProvider } = require('./huggingFaceFluxProvider');
const { TogetherProvider } = require('./togetherProvider');
const { PollinationsProvider } = require('./pollinationsProvider');

const FACTORIES = {
  realvisxl: (env) => new RealVisXLProvider({ token: env.HUGGINGFACE_API_TOKEN }),
  cloudflare: (env) => new CloudflareProvider({ accountId: env.CLOUDFLARE_ACCOUNT_ID, token: env.CLOUDFLARE_API_TOKEN }),
  huggingface_flux: (env) => new HuggingFaceFluxProvider({ token: env.HUGGINGFACE_API_TOKEN }),
  together: (env) => new TogetherProvider({ apiKey: env.TOGETHER_API_KEY }),
  pollinations: () => new PollinationsProvider(),
};

// Default chain is just pollinations so a fresh install runs zero-config.
// To activate the quality+reliability chain, set IMAGE_PROVIDER_CHAIN
// explicitly and provide the corresponding API keys.
function resolveProviders(env) {
  const chain = (env.IMAGE_PROVIDER_CHAIN || 'pollinations')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return chain.map((name) => {
    const factory = FACTORIES[name];
    if (!factory) {
      throw new Error(`Unknown image provider: ${name}. Valid: ${Object.keys(FACTORIES).join(', ')}`);
    }
    return factory(env);
  });
}

module.exports = { resolveProviders };
