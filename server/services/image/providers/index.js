const { RealVisXLProvider } = require('./realVisXLProvider');
const { CloudflareProvider } = require('./cloudflareProvider');
const { CloudflareFlux2Provider } = require('./cloudflareFlux2Provider');
const { HuggingFaceFluxProvider } = require('./huggingFaceFluxProvider');
const { TogetherProvider } = require('./togetherProvider');
const { PollinationsProvider } = require('./pollinationsProvider');
const { PollinationsGenProvider } = require('./pollinationsGenProvider');

const FACTORIES = {
  realvisxl: (env) => new RealVisXLProvider({ token: env.HUGGINGFACE_API_TOKEN }),
  cloudflare: (env) => new CloudflareProvider({ accountId: env.CLOUDFLARE_ACCOUNT_ID, token: env.CLOUDFLARE_API_TOKEN }),
  cloudflare_flux2: (env) => new CloudflareFlux2Provider({ accountId: env.CLOUDFLARE_ACCOUNT_ID, token: env.CLOUDFLARE_API_TOKEN }),
  huggingface_flux: (env) => new HuggingFaceFluxProvider({ token: env.HUGGINGFACE_API_TOKEN }),
  together: (env) => new TogetherProvider({ apiKey: env.TOGETHER_API_KEY }),
  pollinations_gen: (env) => new PollinationsGenProvider({
    apiKey: env.POLLINATIONS_API_KEY,
    model: env.POLLINATIONS_IMAGE_MODEL,
  }),
  pollinations: () => new PollinationsProvider(),
};

// Without an explicit chain, a fresh install still runs zero-config on the
// keyless endpoint. Setting POLLINATIONS_API_KEY alone is enough to move to a
// current model, with the keyless endpoint kept as a last resort.
function defaultChain(env) {
  return env.POLLINATIONS_API_KEY ? 'pollinations_gen,pollinations' : 'pollinations';
}

function resolveProviders(env) {
  const chain = (env.IMAGE_PROVIDER_CHAIN || defaultChain(env))
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
