import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analysisRows } from '../analysis.js';
import { ANALYSIS_NOTES } from '../../content.js';

test('values keep the original formulas and stay on their track', () => {
  for (const h of [-20, 0, 18, 50, 94, 100, 250, NaN, undefined, '57']) {
    for (const row of analysisRows(h)) {
      assert.ok(row.value >= 0 && row.value <= 99, `${row.key} ${row.value}`);
    }
  }
  assert.deepEqual(
    analysisRows(50).map((r) => r.value),
    [97, 45, 70, 35],
  );
});

test('each row gets the note for its band', () => {
  const [, market, passion, stability] = analysisRows(18);
  assert.equal(market.note, ANALYSIS_NOTES.market.low); // 13
  assert.equal(passion.note, ANALYSIS_NOTES.passion.mid); // 38
  assert.equal(stability.note, ANALYSIS_NOTES.stability.low); // 5
  const high = analysisRows(94);
  assert.equal(high[1].note, ANALYSIS_NOTES.market.high); // 89
  assert.equal(high[2].note, ANALYSIS_NOTES.passion.high); // 99
});

test('every note exists, with no em dashes or exclamation marks', () => {
  for (const notes of Object.values(ANALYSIS_NOTES)) {
    for (const band of ['low', 'mid', 'high']) {
      assert.ok(notes[band], band);
      assert.doesNotMatch(notes[band], /[—!]/);
    }
  }
});
