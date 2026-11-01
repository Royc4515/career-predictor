const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { mapCareer, SAMPLE_ANSWERS, sampleCareers } = require('../careers');

// The option strings the client sends (client/src/content.js). Kept in sync by
// hand on purpose: if the client copy changes, these tests should be updated
// in the same change, which is the point of the string coupling warning.
const OPTIONS = [
  ['Strategic thinking', 'Raw creativity', "I just don't quit", 'I know people who know people'],
  ['IV drip of coffee', 'Quiet suffering', 'Every day feels the same', 'I genuinely love Mondays (liar)'],
  ['The reliable one', 'A visionary (probably)', 'Wait, you have coworkers?', 'The one who orders food'],
  ['CEO or bust', 'Laptop from a beach', 'To still be employed', 'Plans are a social construct'],
  ['Tech & Startups', 'Creative Arts & Media', 'Finance & Business', 'I just want to go viral'],
];

function* allAnswerSets() {
  for (const a of OPTIONS[0]) for (const b of OPTIONS[1]) for (const c of OPTIONS[2])
    for (const d of OPTIONS[3]) for (const e of OPTIONS[4]) yield [a, b, c, d, e];
}

const FALLBACK = 'Professional Human Being (Specialization Pending)';

test('every career except the safety fallback is reachable from the quiz', () => {
  const reached = new Set();
  for (const answers of allAnswerSets()) reached.add(mapCareer(...answers).title);
  const src = fs.readFileSync(path.join(__dirname, '..', 'careers.js'), 'utf8');
  const declared = new Set([...src.matchAll(/title: (['"])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2].replace(/\\'/g, "'")));
  const unreachable = [...declared].filter((t) => !reached.has(t));
  assert.deepEqual(unreachable, [FALLBACK]);
});

test('the mapping is deterministic: same answers, same career', () => {
  for (const answers of allAnswerSets()) {
    assert.equal(mapCareer(...answers).title, mapCareer(...answers).title);
  }
});

test('no single career dominates the 1,024 possible answer sets', () => {
  const counts = new Map();
  for (const answers of allAnswerSets()) {
    const t = mapCareer(...answers).title;
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  // Before the tier fix one title owned 1/16 of all inputs and 32 had none.
  assert.ok(Math.max(...counts.values()) <= 100);
});

test('every career carries the fields the result page and image service need', () => {
  for (const answers of allAnswerSets()) {
    const c = mapCareer(...answers);
    for (const key of ['title', 'prompt', 'caption', 'salary', 'outlook']) {
      assert.equal(typeof c[key], 'string', key);
      assert.ok(c[key].length > 0, key);
    }
    assert.ok(Number.isInteger(c.happiness) && c.happiness >= 0 && c.happiness <= 100);
  }
});

test('missing desired_field (older clients) still maps to a career', () => {
  assert.ok(mapCareer('Raw creativity', 'Quiet suffering', 'The reliable one', 'CEO or bust', undefined).title);
});

test('each landing-page sample answer set produces the title it is labeled with', () => {
  for (const [title, answers] of SAMPLE_ANSWERS) {
    assert.equal(mapCareer(...answers).title, title);
  }
  const titles = sampleCareers().map((c) => c.title);
  assert.equal(new Set(titles).size, titles.length, 'samples must be distinct');
});
