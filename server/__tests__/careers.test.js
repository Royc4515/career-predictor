const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mapCareer, promptFor, CAREERS, FALLBACK, SAMPLE_ANSWERS, answersFromIds, sampleCareers } = require('../careers');
const { QUESTIONS, QUESTION_IDS, optionIdFor } = require('../quiz');

// Every possible submission: 4^5 = 1,024 answer sets, as the text the client sends.
function* allAnswerSets() {
  function* rec(i, acc) {
    if (i === QUESTIONS.length) {
      yield { ...acc };
      return;
    }
    for (const option of QUESTIONS[i].options) yield* rec(i + 1, { ...acc, [QUESTIONS[i].id]: option.text });
  }
  yield* rec(0, {});
}

function tally() {
  const counts = new Map(CAREERS.map((c) => [c.title, 0]));
  let total = 0;
  for (const answers of allAnswerSets()) {
    const { title } = mapCareer(answers);
    counts.set(title, (counts.get(title) ?? 0) + 1);
    total += 1;
  }
  return { counts, total };
}

test('every career in the table is reachable from the quiz', () => {
  const { counts } = tally();
  const unreachable = [...counts].filter(([, n]) => n === 0).map(([t]) => t);
  assert.deepEqual(unreachable, []);
  assert.equal(counts.has(FALLBACK.title), false, 'valid answers never fall back');
});

test('no career is picked for more than 4% or fewer than 1% of all answer sets', () => {
  const { counts, total } = tally();
  for (const [title, n] of counts) {
    assert.ok(n / total <= 0.04, `${title}: ${n}/${total}`);
    assert.ok(n / total >= 0.01, `${title}: ${n}/${total}`);
  }
});

test('the field answer picks the shelf: a career always belongs to the chosen field', () => {
  const fieldOf = new Map(CAREERS.map((c) => [c.title, c.field]));
  for (const answers of allAnswerSets()) {
    assert.equal(fieldOf.get(mapCareer(answers).title), optionIdFor('desired_field', answers.desired_field));
  }
});

test('evidence quotes two of the user\'s own answers', () => {
  for (const answers of allAnswerSets()) {
    const { evidence } = mapCareer(answers);
    assert.equal(evidence.length, 2);
    assert.equal(new Set(evidence).size, 2);
    for (const quote of evidence) assert.ok(Object.values(answers).includes(quote), quote);
  }
});

test('the mapping is deterministic: same answers, same career and evidence', () => {
  for (const answers of allAnswerSets()) assert.deepEqual(mapCareer(answers), mapCareer(answers));
});

test('the table is well formed', () => {
  const titles = CAREERS.map((c) => c.title);
  assert.equal(new Set(titles).size, titles.length, 'titles are unique');
  for (const key of ['salary', 'outlook', 'caption', 'prompt']) {
    const values = CAREERS.map((c) => c[key]);
    assert.equal(new Set(values).size, values.length, `${key} lines are unique`);
  }
  const cueIds = new Set(
    QUESTIONS.filter((q) => q.id !== 'desired_field').flatMap((q) => q.options.map((o) => o.id)),
  );
  const fields = new Map();
  for (const c of [...CAREERS, FALLBACK]) {
    for (const key of ['title', 'prompt', 'caption', 'salary', 'outlook']) {
      assert.equal(typeof c[key], 'string', `${c.title} ${key}`);
      assert.ok(c[key].length > 0, `${c.title} ${key}`);
    }
    assert.ok(Number.isInteger(c.happiness) && c.happiness >= 0 && c.happiness <= 100, c.title);
    if (c === FALLBACK) continue;
    assert.equal(c.cues.length, 2, c.title);
    for (const cue of c.cues) assert.ok(cueIds.has(cue), `${c.title}: unknown cue ${cue}`);
    fields.set(c.field, (fields.get(c.field) ?? 0) + 1);
  }
  assert.deepEqual([...fields.values()], [10, 10, 10, 10], 'ten careers per field');
});

test('routing data stays server-side: results carry no field or cues', () => {
  const result = mapCareer(answersFromIds(SAMPLE_ANSWERS[0][1]));
  assert.equal('field' in result, false);
  assert.equal('cues' in result, false);
});

test('unresolvable answers fall back instead of throwing', () => {
  assert.equal(mapCareer(undefined).title, FALLBACK.title);
  assert.equal(mapCareer({ strength: 'Strategic thinking' }).title, FALLBACK.title);
  assert.deepEqual(mapCareer({}).evidence, []);
});

test('each landing-page sample answer set produces the title it is labeled with', () => {
  for (const [title, ids] of SAMPLE_ANSWERS) {
    assert.equal(ids.length, QUESTION_IDS.length);
    assert.equal(mapCareer(answersFromIds(ids)).title, title);
  }
  const titles = sampleCareers().map((c) => c.title);
  assert.equal(new Set(titles).size, titles.length, 'samples must be distinct');
});

// --- the photographer's answer ---

const PHOTO = { woman: 'Shoot me as a woman', man: 'Shoot me as a man', surprise: 'Surprise me. The desk will cast someone' };

test('the photo choice never changes the career, the evidence or the stats', () => {
  for (const answers of allAnswerSets()) {
    const base = mapCareer(answers);
    for (const text of Object.values(PHOTO)) {
      const shot = mapCareer({ ...answers, portrait_subject: text });
      assert.equal(shot.title, base.title);
      assert.deepEqual(shot.evidence, base.evidence);
      assert.equal(shot.happiness, base.happiness);
    }
  }
});

test('surprise (or no choice) keeps the original prompt; a choice picks the matching version', () => {
  const career = { prompt: 'P', altPrompt: 'A', subject: 'woman' };
  assert.equal(promptFor(career, 'surprise'), 'P');
  assert.equal(promptFor(career, 'woman'), 'P');
  assert.equal(promptFor(career, 'man'), 'A');
  assert.equal(mapCareer(answersFromIds(SAMPLE_ANSWERS[0][1])).portraitSubject, 'surprise');
});
// The subject of a scene is named in its first clause ("A day trader in his
// forties, a Black man ..."), so the first standalone woman/man word says
// who the photographer shoots.
const firstGender = (prompt) => prompt.match(/\b(woman|man)\b/i)?.[1].toLowerCase();

test('every career has a woman and a man version, and each names the right subject first', () => {
  for (const c of CAREERS) {
    assert.ok(['woman', 'man'].includes(c.subject), `${c.title}: subject`);
    assert.equal(typeof c.altPrompt, 'string', `${c.title}: altPrompt`);
    assert.notEqual(c.altPrompt, c.prompt, `${c.title}: altPrompt differs`);
    assert.equal(firstGender(c.prompt), c.subject, `${c.title}: prompt subject`);
    assert.equal(firstGender(c.altPrompt), c.subject === 'woman' ? 'man' : 'woman', `${c.title}: altPrompt subject`);
    for (const p of [c.prompt, c.altPrompt]) {
      assert.doesNotMatch(p, /[—()]/, `${c.title}: no em dash or parentheses`);
    }
  }
});

test('choosing a photo gets every career shot as that person', () => {
  for (const answers of allAnswerSets()) {
    for (const who of ['woman', 'man']) {
      assert.equal(firstGender(mapCareer({ ...answers, portrait_subject: PHOTO[who] }).prompt), who);
    }
  }
});
