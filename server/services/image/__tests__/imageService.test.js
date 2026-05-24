const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ImageService } = require('../imageService');

// ── Test doubles ─────────────────────────────────────────────────────────────

function fakePromptBuilder() {
  return {
    titleToSeed: (title) => Math.abs(title.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)),
    imageIdFor: (prompt, seed) => `id_${prompt.length}_${seed}`.slice(0, 16).padEnd(16, '0'),
    enrichForSDXL: (s) => `SDXL:${s}`,
    enrichForFLUX: (s) => `FLUX:${s}`,
    NEGATIVE_PROMPT_SDXL: 'sdxl-neg',
    NEGATIVE_PROMPT_FLUX: 'flux-neg',
  };
}

function inMemoryBlobStore() {
  const map = new Map();
  return {
    map,
    async get(id) { return map.has(id) ? { ...map.get(id) } : null; },
    async put(id, buffer, mimeType) { map.set(id, { buffer, mimeType }); },
  };
}

function fakeProvider(name, dialect, behavior) {
  // behavior: { ok: { buffer, mimeType } } or { error: Error } or async fn
  const calls = [];
  return {
    name, dialect, calls,
    generate: async (input) => {
      calls.push(input);
      if (typeof behavior === 'function') return behavior(input);
      if (behavior.error) throw behavior.error;
      return { ...behavior.ok, providerName: name };
    },
  };
}

function silentLogger() {
  const lines = [];
  return {
    lines,
    log: (...a) => lines.push(['log', ...a]),
    warn: (...a) => lines.push(['warn', ...a]),
    error: (...a) => lines.push(['error', ...a]),
  };
}

// Helper: wait for in-flight background work to settle.
function microtaskFlush() { return new Promise((r) => setImmediate(r)); }

async function waitForBlob(blobStore, id, timeoutMs = 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await blobStore.get(id)) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(`blob ${id} not stored within ${timeoutMs}ms`);
}

// ── Synchronous-return contract (spec §2.kickoff.1) ──────────────────────────

test('kickoff(): returns synchronously in under 5ms even when providers are slow', () => {
  const slow = fakeProvider('slow', 'flux', () => new Promise((r) => setTimeout(() => r({
    buffer: Buffer.from('x'), mimeType: 'image/png', providerName: 'slow',
  }), 200)));
  const svc = new ImageService({
    providers: [slow],
    blobStore: inMemoryBlobStore(),
    promptBuilder: fakePromptBuilder(),
    logger: silentLogger(),
  });
  const t0 = Date.now();
  const result = svc.kickoff({ scenePrompt: 'a portrait', title: 'Botanist' });
  const elapsed = Date.now() - t0;
  assert.ok(result.id, 'kickoff returns an id');
  assert.ok(elapsed < 5, `kickoff must return in <5ms, took ${elapsed}ms`);
});

// ── Happy path ───────────────────────────────────────────────────────────────

test('kickoff() runs primary provider in background; bytes land in BlobStore', async () => {
  const primary = fakeProvider('primary', 'sdxl', { ok: { buffer: Buffer.from('primary-bytes'), mimeType: 'image/png' } });
  const blobStore = inMemoryBlobStore();
  const svc = new ImageService({
    providers: [primary], blobStore,
    promptBuilder: fakePromptBuilder(),
    logger: silentLogger(),
  });
  const { id } = svc.kickoff({ scenePrompt: 'a', title: 't' });
  await waitForBlob(blobStore, id);
  const out = await blobStore.get(id);
  assert.equal(out.buffer.toString(), 'primary-bytes');
  assert.equal(primary.calls.length, 1);
});

// ── Cache short-circuit (spec §2.kickoff.4) ─────────────────────────────────

test('kickoff() with already-cached id skips all providers', async () => {
  const primary = fakeProvider('primary', 'flux', { ok: { buffer: Buffer.from('p'), mimeType: 'image/png' } });
  const blobStore = inMemoryBlobStore();
  const pb = fakePromptBuilder();
  const id = pb.imageIdFor('a', pb.titleToSeed('t'));
  await blobStore.put(id, Buffer.from('cached'), 'image/png');

  const svc = new ImageService({ providers: [primary], blobStore, promptBuilder: pb, logger: silentLogger() });
  svc.kickoff({ scenePrompt: 'a', title: 't' });
  await microtaskFlush();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(primary.calls.length, 0, 'no provider should be called when cache is warm');
});

// ── Fallback cascade (spec §2.Fallback chain.1) ──────────────────────────────

test('kickoff() with [FAIL, FAIL, OK]: all three called in order; OK bytes stored', async () => {
  const a = fakeProvider('a', 'flux', { error: new Error('a-down') });
  const b = fakeProvider('b', 'sdxl', { error: new Error('b-down') });
  const c = fakeProvider('c', 'flux', { ok: { buffer: Buffer.from('c-bytes'), mimeType: 'image/png' } });
  const blobStore = inMemoryBlobStore();
  const svc = new ImageService({ providers: [a, b, c], blobStore, promptBuilder: fakePromptBuilder(), logger: silentLogger() });
  const { id } = svc.kickoff({ scenePrompt: 'a', title: 't' });
  await waitForBlob(blobStore, id);
  assert.equal(a.calls.length, 1);
  assert.equal(b.calls.length, 1);
  assert.equal(c.calls.length, 1);
  const out = await blobStore.get(id);
  assert.equal(out.buffer.toString(), 'c-bytes');
});

// ── All providers fail (spec §2.Fallback chain.3) ───────────────────────────

test('all providers failing: BlobStore not written; error logged; in-flight clears; retry restarts chain', async () => {
  const a = fakeProvider('a', 'flux', { error: new Error('down') });
  const b = fakeProvider('b', 'flux', { error: new Error('down') });
  const blobStore = inMemoryBlobStore();
  const logger = silentLogger();
  const svc = new ImageService({ providers: [a, b], blobStore, promptBuilder: fakePromptBuilder(), logger });

  const { id } = svc.kickoff({ scenePrompt: 'p', title: 't' });
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(await blobStore.get(id), null, 'no bytes stored on total failure');
  assert.ok(logger.lines.some((l) => l[0] === 'error'), 'terminal failure logs at error level');

  // Re-kickoff should retry — in-flight map must have been cleared.
  svc.kickoff({ scenePrompt: 'p', title: 't' });
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(a.calls.length, 2, 'after total failure, kickoff retries from chain start');
});

// ── In-flight dedup (spec §2.kickoff.3) ─────────────────────────────────────

test('in-flight dedup: two simultaneous kickoffs for the same id → only one provider call', async () => {
  let resolveOk;
  const provider = fakeProvider('slow', 'flux', () => new Promise((r) => { resolveOk = () => r({
    buffer: Buffer.from('once'), mimeType: 'image/png', providerName: 'slow',
  }); }));
  const blobStore = inMemoryBlobStore();
  const svc = new ImageService({ providers: [provider], blobStore, promptBuilder: fakePromptBuilder(), logger: silentLogger() });

  const r1 = svc.kickoff({ scenePrompt: 'p', title: 't' });
  const r2 = svc.kickoff({ scenePrompt: 'p', title: 't' });
  assert.equal(r1.id, r2.id, 'same input → same id');
  await microtaskFlush();
  assert.equal(provider.calls.length, 1, 'concurrent kickoffs collapse to one provider call');
  resolveOk();
  await waitForBlob(blobStore, r1.id);
});

// ── Dialect routing (spec §2.Dialect routing) ───────────────────────────────

test('dialect routing: SDXL provider receives enrichForSDXL + NEGATIVE_PROMPT_SDXL', async () => {
  const sdxl = fakeProvider('sdxl', 'sdxl', { ok: { buffer: Buffer.from('x'), mimeType: 'image/png' } });
  const blobStore = inMemoryBlobStore();
  const svc = new ImageService({ providers: [sdxl], blobStore, promptBuilder: fakePromptBuilder(), logger: silentLogger() });
  svc.kickoff({ scenePrompt: 'a portrait', title: 't' });
  await waitForBlob(blobStore, sdxl.calls[0] ? Object.keys(blobStore.map)[0] || '' : '').catch(() => {});
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(sdxl.calls[0].prompt, 'SDXL:a portrait');
  assert.equal(sdxl.calls[0].negativePrompt, 'sdxl-neg');
});

test('dialect routing: FLUX provider receives enrichForFLUX + NEGATIVE_PROMPT_FLUX', async () => {
  const flux = fakeProvider('flux', 'flux', { ok: { buffer: Buffer.from('x'), mimeType: 'image/png' } });
  const blobStore = inMemoryBlobStore();
  const svc = new ImageService({ providers: [flux], blobStore, promptBuilder: fakePromptBuilder(), logger: silentLogger() });
  svc.kickoff({ scenePrompt: 'a portrait', title: 't' });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(flux.calls[0].prompt, 'FLUX:a portrait');
  assert.equal(flux.calls[0].negativePrompt, 'flux-neg');
});

test('dialect routing across fallback: SDXL primary → FLUX fallback re-enriches the prompt', async () => {
  const sdxl = fakeProvider('sdxl', 'sdxl', { error: new Error('sdxl-down') });
  const flux = fakeProvider('flux', 'flux', { ok: { buffer: Buffer.from('x'), mimeType: 'image/png' } });
  const svc = new ImageService({ providers: [sdxl, flux], blobStore: inMemoryBlobStore(), promptBuilder: fakePromptBuilder(), logger: silentLogger() });
  svc.kickoff({ scenePrompt: 'a portrait', title: 't' });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(sdxl.calls[0].prompt, 'SDXL:a portrait');
  assert.equal(flux.calls[0].prompt, 'FLUX:a portrait');
});

// ── Provider input dimensions (spec defaults) ───────────────────────────────

test('orchestrator sends 768x768 dimensions to providers by default', async () => {
  const p = fakeProvider('p', 'flux', { ok: { buffer: Buffer.from('x'), mimeType: 'image/png' } });
  const svc = new ImageService({ providers: [p], blobStore: inMemoryBlobStore(), promptBuilder: fakePromptBuilder(), logger: silentLogger() });
  svc.kickoff({ scenePrompt: 'a', title: 't' });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(p.calls[0].width, 768);
  assert.equal(p.calls[0].height, 768);
});

// ── fetchIfReady (spec §2.fetchIfReady) ─────────────────────────────────────

test('fetchIfReady(): returns BlobStore.get() verbatim — does not call providers', async () => {
  const p = fakeProvider('p', 'flux', { error: new Error('should not be called') });
  const blobStore = inMemoryBlobStore();
  await blobStore.put('test_id_abcdef0', Buffer.from('preloaded'), 'image/png');
  const svc = new ImageService({ providers: [p], blobStore, promptBuilder: fakePromptBuilder(), logger: silentLogger() });
  const out = await svc.fetchIfReady('test_id_abcdef0');
  assert.equal(out.buffer.toString(), 'preloaded');
  assert.equal(p.calls.length, 0);
});

test('fetchIfReady(): returns null for missing id', async () => {
  const svc = new ImageService({ providers: [], blobStore: inMemoryBlobStore(), promptBuilder: fakePromptBuilder(), logger: silentLogger() });
  assert.equal(await svc.fetchIfReady('nonexistent'), null);
});
