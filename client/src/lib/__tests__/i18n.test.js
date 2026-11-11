import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UI_EN } from '../../i18n/ui.en.js';
import { UI_HE } from '../../i18n/ui.he.js';
import { localizeError } from '../errors.js';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..');

// Every key in one edition exists in the other, with the same kind of value:
// a string where the other has a string, a function (text that takes values)
// where the other has a function, and arrays of the same length.
function sameShape(a, b, path = 'UI') {
  if (typeof a === 'function' || typeof b === 'function') {
    assert.equal(typeof b, typeof a, `${path}: function in one edition only`);
    assert.equal(b.length, a.length, `${path}: different number of arguments`);
    return;
  }
  if (Array.isArray(a)) {
    assert.ok(Array.isArray(b), `${path}: array in one edition only`);
    assert.equal(b.length, a.length, `${path}: different length`);
    a.forEach((item, i) => sameShape(item, b[i], `${path}[${i}]`));
    return;
  }
  if (a && typeof a === 'object') {
    assert.ok(b && typeof b === 'object', `${path}: object in one edition only`);
    assert.deepEqual(Object.keys(b).sort(), Object.keys(a).sort(), `${path}: keys differ`);
    for (const key of Object.keys(a)) sameShape(a[key], b[key], `${path}.${key}`);
    return;
  }
  assert.equal(typeof b, typeof a, `${path}: type differs`);
}

test('the Hebrew UI copy has exactly the shape of the English', () => {
  const { errors: _en, ...en } = UI_EN;
  const { errors: _he, ...he } = UI_HE;
  sameShape(en, he);
});

test('no em dashes in either edition', () => {
  const walk = (v, path) => {
    if (typeof v === 'string') assert.doesNotMatch(v, /—/, path);
    else if (typeof v === 'function') assert.doesNotMatch(String(v), /—/, path);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  walk(UI_EN, 'en');
  walk(UI_HE, 'he');
});

// Messages are raised in English (server routes, browser-side helpers) and
// translated at display. A new message without a Hebrew entry would show
// the generic fallback on the Hebrew page; this lists every literal one.
function literalMessages() {
  const files = [
    ...readdirSync(join(repo, 'server', 'routes')).map((f) => join(repo, 'server', 'routes', f)),
    join(repo, 'server', 'userData.js'),
    join(repo, 'server', 'photoUpload.js'),
    ...readdirSync(join(repo, 'client', 'src', 'lib'))
      .filter((f) => f.endsWith('.js'))
      .map((f) => join(repo, 'client', 'src', 'lib', f)),
  ];
  const found = new Set();
  const patterns = [
    /(?:error|message): '([^'$]+)'/g,
    /ApiError\([^,]+, '([^']+)'\)/g,
    /PhotoInputError\('([^']+)'\)/g,
    /PhotoError\(\d+, '([^']+)'\)/g,
    /STALE_ANSWERS_ERROR = '([^']+)'/g,
    /\[limiter[^\]]*\]|'(That is three shoots[^']*|The darkroom is fully booked[^']*)'/g,
    /'(Could not read the upload[^']*|That photo is too large\. Try one under 8 MB\.)'/g,
  ];
  for (const file of files) {
    if (file.endsWith('errors.js')) continue;
    const text = readFileSync(file, 'utf8');
    for (const re of patterns) for (const m of text.matchAll(re)) if (m[1]) found.add(m[1]);
  }
  return [...found];
}

test('every error message the code raises has a Hebrew translation', () => {
  const messages = literalMessages();
  assert.ok(messages.length > 20, `found only ${messages.length} messages: the scan is broken`);
  const missing = messages.filter((m) => !UI_HE.errors[m]);
  assert.deepEqual(missing, []);
});

test('localizeError: English untouched, known messages and shaped ones translated, unknown gets a Hebrew fallback', () => {
  assert.equal(localizeError('en', 'Not found'), 'Not found');
  assert.equal(localizeError('he', 'Not found'), UI_HE.errors['Not found']);
  assert.match(localizeError('he', 'The newsroom returned an error (502). Try again in a moment.'), /502/);
  assert.equal(localizeError('he', 'Something nobody wrote down'), UI_HE.consent.unknownError);
  assert.equal(localizeError('he', null), null);
});
