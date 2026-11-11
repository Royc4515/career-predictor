#!/usr/bin/env node
// Likeness test for the planned "use my photo" feature (docs/personal-portrait.md).
// Renders a few career scenes with a reference face on the image models that
// accept an input image, and writes a side-by-side HTML sheet so a person can
// judge whether the result still looks like the reference. Run it before any
// of the feature is built: if no affordable model keeps the face, the feature
// is not worth its privacy cost.
//
//   npm run check:likeness
//   npm run check:likeness -- --models microsoft/mai-image-2.6,google/gemini-nano-banana-2.1
//   npm run check:likeness -- --ref https://example.com/face.jpg --scenes 1
//
// Defaults to two synthetic faces committed in scripts/fixtures/ (nobody's
// real face). Spends pollen: models x refs x scenes
// renders. Reads POLLINATIONS_API_KEY from the environment or server/.env and
// never prints it.

const path = require('path');
const fs = require('fs');
const os = require('os');
const { evaluateKey, maskKey } = require('./checkImageKey');

const API = 'https://gen.pollinations.ai';
const DEFAULT_MODELS = ['microsoft/mai-image-2.6', 'microsoft/mai-image-2.6-flash'];
const SIZE = { width: 896, height: 1120 };
const SEED = 4242;

// Identity comes from the photo, so the scene names no age, gender or
// background: anything the prompt says about the person competes with the
// reference and pulls the face away from it.
const { PERSONAL_IDENTITY: IDENTITY, personalPrompt } = require('../services/image/promptBuilder');

const SCENES = {
  founder:
    'standing alone in a coworking space after hours in a grey zip hoodie, holding a phone face-up in both hands at chest height and staring at it, waiting for a call that is not coming. A half-deflated silver party balloon droops on a ribbon beside their shoulder. Rows of empty desks fade into darkness behind them, one desk lamp the only light',
  archaeologist:
    'wearing a head torch and a grey work shirt in a dim server room, gently brushing dust off a beige 1990s computer tower held at chest height with a soft archaeologist\'s brush, completely absorbed. Dark server racks fill the background',
  falafel:
    'in a white hard hat and a white shirt at a plain kitchen counter, checking a chest-high tower of stacked falafel balls with a small spirit level held up at eye level, hummus spread between the layers like mortar, face serious and proud',
};

// Default reference faces: two synthetic people (made once with the keyless
// endpoint, watermark cropped), so no real person's face is sent anywhere.
// The model fetches the reference itself, so it needs a public URL; the repo
// is public, so the committed fixtures are served from GitHub. Pass --ref to
// try a face of your own (with that person's consent).
const FIXTURE_REFS = [1, 2].map(
  (n) => `https://raw.githubusercontent.com/Royc4515/career-predictor/main/server/scripts/fixtures/likeness-ref${n}.jpg`,
);

/** Request URL for one render. The key goes in a header, never in the URL. */
function buildLikenessUrl({ scene, model, ref, seed = SEED, width = SIZE.width, height = SIZE.height }) {
  const prompt = personalPrompt(scene);
  const params = new URLSearchParams({ model, width: String(width), height: String(height), seed: String(seed), image: ref });
  return `${API}/image/${encodeURIComponent(prompt)}?${params.toString()}`;
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : process.argv[i + 1];
}

function argAll(name) {
  return process.argv.flatMap((a, i) => (a === `--${name}` ? [process.argv[i + 1]] : [])).filter(Boolean);
}

function sheet({ refs, models, scenes, results }) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const rows = refs
    .map((ref, r) => {
      const cells = models
        .flatMap((model) =>
          scenes.map((scene) => {
            const hit = results.find((x) => x.r === r && x.model === model && x.scene === scene);
            const body = hit?.file
              ? `<img src="${esc(path.basename(hit.file))}"><figcaption>${esc(model)}<br>${esc(scene)}, ${hit.ms} ms</figcaption>`
              : `<div class="err">${esc(hit?.error || 'not run')}</div><figcaption>${esc(model)}<br>${esc(scene)}</figcaption>`;
            return `<figure>${body}</figure>`;
          }),
        )
        .join('');
      return `<section><figure class="ref"><img src="${esc(ref)}"><figcaption>Reference ${r + 1}</figcaption></figure>${cells}</section>`;
    })
    .join('');
  return `<!doctype html><meta charset="utf-8"><title>Likeness check</title>
<style>body{font:14px system-ui;margin:16px;background:#f3f4f1;color:#13203a}section{display:flex;gap:12px;overflow-x:auto;margin-bottom:24px}
figure{margin:0;width:220px;flex:none}img{width:100%;display:block}.ref img{outline:3px solid #13203a}.err{height:275px;background:#e5e6e1;padding:8px}</style>
<h1>Likeness check</h1><p>Does each portrait still look like the reference on the left?</p>${rows}`;
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const key = process.env.POLLINATIONS_API_KEY;
  console.log(`Key: ${maskKey(key)}`);
  if (!key || !key.startsWith('sk_')) {
    console.error('POLLINATIONS_API_KEY (an sk_ key) is required. Put it in the environment or server/.env.');
    process.exit(1);
  }
  const models = (arg('models') || DEFAULT_MODELS.join(',')).split(',').map((m) => m.trim()).filter(Boolean);
  const refs = argAll('ref').length ? argAll('ref') : FIXTURE_REFS;
  const scenes = Object.keys(SCENES).slice(0, Number(arg('scenes')) || Object.keys(SCENES).length);
  const out = arg('out') || fs.mkdtempSync(path.join(os.tmpdir(), 'careerpredict-likeness-'));
  fs.mkdirSync(out, { recursive: true });

  // Same checks as check:image, per model, so a key restricted to the default
  // model says so up front instead of failing every render.
  const [infoRes, catRes] = await Promise.all([
    fetch(`${API}/account/key`, { headers: { Authorization: `Bearer ${key}` } }),
    fetch(`${API}/image/models`),
  ]);
  const info = await infoRes.json().catch(() => null);
  const catalogue = await catRes.json().catch(() => []);
  if (!infoRes.ok) {
    console.error(`The API rejected the key (${infoRes.status}).`);
    process.exit(1);
  }
  const usable = [];
  for (const model of models) {
    const entry = catalogue.find((m) => m.name === model || (m.aliases || []).includes(model));
    const verdict = evaluateKey(info, entry, model);
    const takesImage = (entry?.input_modalities || []).includes('image');
    if (!takesImage) verdict.problems.push(`"${model}" does not accept an input image.`);
    for (const p of verdict.problems) console.error(`skip ${model}: ${p}`);
    if (verdict.problems.length === 0) usable.push(model);
  }
  if (!usable.length) {
    console.error('\nNo usable model. If the key is restricted to one model, allow the ones above in the key settings.');
    process.exit(1);
  }

  console.log(`\nRendering ${usable.length * refs.length * scenes.length} portraits into ${out}`);
  const results = [];
  for (const [r, ref] of refs.entries()) {
    for (const model of usable) {
      for (const scene of scenes) {
        const started = Date.now();
        const label = `ref${r + 1} ${model} ${scene}`;
        try {
          const res = await fetch(buildLikenessUrl({ scene: SCENES[scene], model, ref }), {
            headers: { Authorization: `Bearer ${key}` },
          });
          const type = res.headers.get('content-type') || '';
          if (!res.ok || !type.startsWith('image/')) {
            const detail = (await res.text().catch(() => '')).slice(0, 160);
            throw new Error(`${res.status} ${detail}`);
          }
          const file = path.join(out, `ref${r + 1}-${model.replace(/\W+/g, '_')}-${scene}.${type.split('/')[1] || 'img'}`);
          fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
          results.push({ r, model, scene, file, ms: Date.now() - started });
          console.log(`ok   ${label} (${Date.now() - started} ms)`);
        } catch (err) {
          results.push({ r, model, scene, error: err.message });
          console.log(`fail ${label}: ${err.message}`);
        }
      }
    }
  }
  const html = path.join(out, 'index.html');
  fs.writeFileSync(html, sheet({ refs, models: usable, scenes, results }));
  console.log(`\nSheet: ${html}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`Likeness check failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { buildLikenessUrl, FIXTURE_REFS, SCENES, IDENTITY };
