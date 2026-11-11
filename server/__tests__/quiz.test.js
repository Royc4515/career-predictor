const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { QUESTIONS, optionIdFor, optionText, resolveAnswers } = require('../quiz');
const { SAMPLE_ANSWERS } = require('../careers');

// The client renders the questionnaire from its own copy file and sends the
// option text. These tests make the two copies one contract: any difference
// in wording, order or punctuation fails here instead of silently sending
// answers the server no longer recognises.
const CLIENT_CONTENT = pathToFileURL(path.join(__dirname, '..', '..', 'client', 'src', 'content.js')).href;

test('client questions and options match the server catalog exactly', async () => {
  const client = await import(CLIENT_CONTENT);
  assert.deepEqual(
    client.QUESTIONS.map((q) => q.id),
    QUESTIONS.map((q) => q.id),
  );
  for (const [i, q] of QUESTIONS.entries()) {
    assert.deepEqual(client.QUESTIONS[i].options, q.options.map((o) => o.text), `options of ${q.id}`);
  }
});

test('client SAMPLE_TITLES lists the landing samples in the server order', async () => {
  const client = await import(CLIENT_CONTENT);
  assert.deepEqual(client.SAMPLE_TITLES, SAMPLE_ANSWERS.map(([title]) => title));
});

test('option ids and text are unique within each question', () => {
  for (const q of QUESTIONS) {
    assert.equal(new Set(q.options.map((o) => o.id)).size, q.options.length, q.id);
    assert.equal(new Set(q.options.map((o) => o.text)).size, q.options.length, q.id);
    for (const o of q.options) {
      // Quoted back on the report as evidence, inside quotation marks.
      assert.doesNotMatch(o.text, /["“”]/, `${q.id}.${o.id} must read well inside quotes`);
    }
  }
});

test('optionIdFor and optionText are inverses; unknown input is null', () => {
  for (const q of QUESTIONS) {
    for (const o of q.options) {
      assert.equal(optionIdFor(q.id, o.text), o.id);
      assert.equal(optionText(q.id, o.id), o.text);
    }
  }
  assert.equal(optionIdFor('strength', 'Strategic thinking'), null, 'old option text');
  assert.equal(optionIdFor('nope', "Third coffee (it's 9:02)"), null);
  assert.equal(optionText('strength', 'nope'), null);
});

test('resolveAnswers needs every question answered with a current option', () => {
  const full = Object.fromEntries(QUESTIONS.map((q) => [q.id, q.options[0].text]));
  assert.deepEqual(resolveAnswers(full), Object.fromEntries(QUESTIONS.map((q) => [q.id, q.options[0].id])));
  assert.equal(resolveAnswers({ ...full, desired_field: undefined }), null);
  assert.equal(resolveAnswers({ ...full, strength: 'Raw creativity' }), null);
  assert.equal(resolveAnswers(null), null);
});

test("the photographer's question matches the client copy exactly", async () => {
  const client = await import(CLIENT_CONTENT);
  const { PORTRAIT_QUESTION } = require('../quiz');
  assert.equal(client.PORTRAIT_STEP.id, PORTRAIT_QUESTION.id);
  assert.deepEqual(client.PORTRAIT_STEP.options, PORTRAIT_QUESTION.options.map((o) => o.text));
});

test('portraitIdFor maps the four answers and nothing else', () => {
  const { PORTRAIT_QUESTION, portraitIdFor } = require('../quiz');
  assert.deepEqual(PORTRAIT_QUESTION.options.map((o) => portraitIdFor(o.text)), ['woman', 'man', 'surprise', 'photo']);
  assert.equal(portraitIdFor('woman'), null, 'ids are not accepted as text');
  assert.equal(portraitIdFor(undefined), null);
});
