#!/usr/bin/env node
// Verifies a Pollinations key before it goes into Render, so a typo or a key
// without image permission is caught here instead of as silent fallbacks to
// the low-quality keyless model in production.
//
//   npm run check:image              key info + model access (free, no pollen)
//   npm run check:image -- --generate  also renders one real portrait (spends pollen)
//
// Reads POLLINATIONS_API_KEY / POLLINATIONS_IMAGE_MODEL from the environment
// or server/.env. Never prints the key itself.

const path = require('path');
const fs = require('fs');
const os = require('os');

const API = 'https://gen.pollinations.ai';

function maskKey(key) {
  if (!key || key.length < 8) return '(missing)';
  return `${key.slice(0, 3)}...${key.slice(-4)}`;
}

/**
 * Pure verdict on a /account/key response for one model catalogue entry.
 * Returns { ok, problems[], notes[] } so it can be unit tested offline.
 */
function evaluateKey(info, modelEntry, modelId) {
  const problems = [];
  const notes = [];
  if (!info || info.valid !== true) problems.push('The key is not valid or has been revoked.');
  if (info && info.type !== 'secret') problems.push(`This is a ${info.type} key; the server needs a secret sk_ key.`);
  if (info?.expiresAt) notes.push(`Expires at ${info.expiresAt}. Production will fall back to the keyless model after that.`);

  if (!modelEntry) {
    problems.push(`Model "${modelId}" is not in the live catalogue (${API}/image/models).`);
  } else {
    const allowed = info?.permissions?.models;
    const names = new Set([modelEntry.name, ...(modelEntry.aliases || []), 'image']);
    if (Array.isArray(allowed) && !allowed.some((m) => names.has(m))) {
      problems.push(`The key is not allowed to use "${modelEntry.name}". Allowed: ${allowed.join(', ') || 'none'}.`);
    }
    if (modelEntry.paid_only && info?.questPollenOnly) {
      problems.push(`"${modelEntry.name}" is paid-only but this key spends free Quest Pollen only, so every request would fail.`);
    }
    if (modelEntry.paid_only) notes.push(`"${modelEntry.name}" is paid-only: each portrait spends paid pollen.`);
    if (modelEntry.health && modelEntry.health.status !== 'healthy') {
      notes.push(`Model health is currently "${modelEntry.health.status}".`);
    }
  }
  if (info?.pollenBudget != null) notes.push(`Key budget remaining: ${info.pollenBudget} pollen.`);
  if (info?.questPollenOnly) notes.push('Spends free Quest Pollen only; it can never charge money.');
  return { ok: problems.length === 0, problems, notes };
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { DEFAULT_MODEL, PollinationsGenProvider } = require('../services/image/providers/pollinationsGenProvider');
  const key = process.env.POLLINATIONS_API_KEY;
  const model = process.env.POLLINATIONS_IMAGE_MODEL || DEFAULT_MODEL;
  const generate = process.argv.includes('--generate');

  console.log(`Key:   ${maskKey(key)}`);
  console.log(`Model: ${model}`);
  if (!key) {
    console.error('\nPOLLINATIONS_API_KEY is not set. Put it in server/.env or export it, then run again.');
    process.exit(1);
  }
  if (!key.startsWith('sk_')) {
    console.error('\nThe key must start with sk_ (a secret key). pk_ keys are app ids and are rejected by the API.');
    process.exit(1);
  }

  const [infoRes, catalogueRes] = await Promise.all([
    fetch(`${API}/account/key`, { headers: { Authorization: `Bearer ${key}` } }),
    fetch(`${API}/image/models`),
  ]);
  const info = await infoRes.json().catch(() => null);
  const catalogue = await catalogueRes.json().catch(() => []);
  if (!infoRes.ok) {
    console.error(`\nThe API rejected the key (${infoRes.status}): ${info?.error?.message || 'no details'}`);
    process.exit(1);
  }
  const entry = Array.isArray(catalogue)
    ? catalogue.find((m) => m.name === model || (m.aliases || []).includes(model))
    : null;

  const verdict = evaluateKey(info, entry, model);
  console.log(`Name:  ${info.name ?? '(unnamed)'}`);
  for (const n of verdict.notes) console.log(`note:  ${n}`);
  for (const p of verdict.problems) console.error(`FAIL:  ${p}`);
  if (!verdict.ok) process.exit(1);
  console.log('\nKey and model check passed.');

  if (!generate) {
    console.log('Run with --generate to render one real 896x1120 portrait (spends pollen).');
    return;
  }
  const provider = new PollinationsGenProvider({ apiKey: key, model });
  const started = Date.now();
  const out = await provider.generate({
    prompt: 'a calm editorial portrait of a lighthouse keeper at dusk. No text, no letters.',
    seed: 1234,
    width: 896,
    height: 1120,
    negativePrompt: '',
  });
  const file = path.join(os.tmpdir(), `careerpredict-check.${out.mimeType.split('/')[1] || 'img'}`);
  fs.writeFileSync(file, out.buffer);
  console.log(`Generated ${out.buffer.length} bytes (${out.mimeType}) in ${Date.now() - started} ms: ${file}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`\nCheck failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { evaluateKey, maskKey };
