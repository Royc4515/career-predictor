#!/usr/bin/env node
/**
 * Deployment reliability test for career-predictor.
 * Usage: node scripts/test-deployment.js https://career-predictor-cnvg.onrender.com
 */

const BASE_URL = process.argv[2];

if (!BASE_URL) {
  console.error('Usage: node scripts/test-deployment.js <url>');
  console.error('Example: node scripts/test-deployment.js https://career-predictor-cnvg.onrender.com');
  process.exit(1);
}

const COLD_START_THRESHOLD_MS = 10_000;
const SLOW_REQUEST_THRESHOLD_MS = 3_000;

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  \x1b[32m✔\x1b[0m ${label}`);
  passed++;
}

function fail(label, detail) {
  console.log(`  \x1b[31m✘\x1b[0m ${label}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

function warn(label) {
  console.log(`  \x1b[33m⚠\x1b[0m ${label}`);
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const start = Date.now();
  let status, body, redirected, finalUrl;

  try {
    const res = await fetch(url, { redirect: 'manual', ...options });
    status = res.status;
    redirected = res.headers.get('location');
    try { body = await res.json(); } catch { body = null; }
    finalUrl = url;
  } catch (err) {
    return { error: err.message, ms: Date.now() - start };
  }

  return { status, body, redirected, ms: Date.now() - start, url: finalUrl };
}

async function runSuite(label) {
  console.log(`\n\x1b[1m${label}\x1b[0m`);

  // --- Health check ---
  {
    const r = await request('/api/health');
    if (r.error) {
      fail('GET /api/health', r.error);
    } else if (r.status !== 200) {
      fail('GET /api/health', `expected 200, got ${r.status}`);
    } else if (r.body?.status !== 'ok') {
      fail('GET /api/health', `expected {status:"ok"}, got ${JSON.stringify(r.body)}`);
    } else {
      ok(`GET /api/health → 200 {status:"ok"} (${r.ms}ms)`);
    }

    if (r.ms > COLD_START_THRESHOLD_MS) {
      warn(`Cold start detected: ${r.ms}ms (service was sleeping)`);
    } else if (r.ms > SLOW_REQUEST_THRESHOLD_MS) {
      warn(`Slow response: ${r.ms}ms — may be warming up`);
    }
  }

  // --- Auth/me unauthenticated ---
  {
    const r = await request('/auth/me');
    if (r.error) {
      fail('GET /auth/me (unauthed)', r.error);
    } else if (r.status !== 401) {
      fail('GET /auth/me (unauthed)', `expected 401, got ${r.status}`);
    } else {
      ok(`GET /auth/me → 401 (not logged in, correct) (${r.ms}ms)`);
    }
  }

  // --- /api/user/result unauthenticated ---
  {
    const r = await request('/api/user/result');
    if (r.error) {
      fail('GET /api/user/result (unauthed)', r.error);
    } else if (r.status !== 401) {
      fail('GET /api/user/result (unauthed)', `expected 401, got ${r.status}`);
    } else {
      ok(`GET /api/user/result → 401 (not logged in, correct) (${r.ms}ms)`);
    }
  }

  // --- Google OAuth redirect ---
  {
    const r = await request('/auth/google');
    if (r.error) {
      fail('GET /auth/google', r.error);
    } else if (r.status !== 302) {
      fail('GET /auth/google', `expected 302 redirect, got ${r.status}`);
    } else if (!r.redirected?.includes('accounts.google.com')) {
      fail('GET /auth/google', `redirect target is not Google: ${r.redirected}`);
    } else {
      ok(`GET /auth/google → 302 → accounts.google.com (${r.ms}ms)`);
    }
  }

  // --- React app served (catch-all route) ---
  {
    const r = await request('/some-nonexistent-page-xyz');
    if (r.error) {
      fail('GET /* (React catch-all)', r.error);
    } else if (r.status !== 200) {
      fail('GET /* (React catch-all)', `expected 200, got ${r.status}`);
    } else {
      ok(`GET /* (React catch-all) → 200 (${r.ms}ms)`);
    }
  }
}

async function runRepeatability(rounds = 3) {
  console.log(`\n\x1b[1mRepeatability — ${rounds} rounds of health check\x1b[0m`);
  const times = [];

  for (let i = 1; i <= rounds; i++) {
    const r = await request('/api/health');
    if (r.error || r.status !== 200 || r.body?.status !== 'ok') {
      fail(`Round ${i}`, r.error || `status ${r.status}`);
    } else {
      ok(`Round ${i} — ${r.ms}ms`);
      times.push(r.ms);
    }
  }

  if (times.length) {
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const max = Math.max(...times);
    console.log(`  avg ${avg}ms  /  max ${max}ms`);
  }
}

async function main() {
  console.log(`\x1b[1mTesting: ${BASE_URL}\x1b[0m`);
  console.log('(First request may be slow if the service is sleeping)\n');

  await runSuite('Endpoint checks');
  await runRepeatability(3);

  console.log(`\n${'─'.repeat(44)}`);
  const total = passed + failed;
  if (failed === 0) {
    console.log(`\x1b[32m All ${total} checks passed\x1b[0m`);
  } else {
    console.log(`\x1b[31m ${failed}/${total} checks failed\x1b[0m`);
    process.exit(1);
  }
}

main();
