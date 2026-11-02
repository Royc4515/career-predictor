import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COVER, coverFileName, headlineScale, wrapLines } from '../coverLayout.js';

// Monospace stand-in for ctx.measureText: one unit per character.
const mono = (s) => s.length;

test('wrapLines breaks greedily on spaces within the width', () => {
  assert.deepEqual(wrapLines('aa bb cc dd', 5, mono), ['aa bb', 'cc dd']);
});

test('wrapLines keeps an over-long word on its own line instead of splitting it', () => {
  assert.deepEqual(wrapLines('a supercalifragilistic b', 5, mono), ['a', 'supercalifragilistic', 'b']);
});

test('wrapLines always returns at least one line, even for empty input', () => {
  assert.deepEqual(wrapLines('', 10, mono), ['']);
  assert.deepEqual(wrapLines(null, 10, mono), ['']);
});

test('wrapLines collapses repeated whitespace', () => {
  assert.deepEqual(wrapLines('  a   b  ', 10, mono), ['a b']);
});

test('headlineScale never grows as titles get longer', () => {
  let prev = Infinity;
  for (let n = 0; n <= 80; n++) {
    const s = headlineScale('x'.repeat(n));
    assert.ok(s <= prev, `scale grew at length ${n}`);
    prev = s;
  }
});

test('the masthead fits between the side paddings (measured 6.17em wide)', () => {
  assert.ok(6.17 * COVER.mastheadSize <= 1 - 2 * COVER.pad);
});

test('coverFileName produces a safe, readable slug', () => {
  assert.equal(
    coverFileName('JIRA Ticket Archaeologist, Legacy Systems Division'),
    'careerpredict-jira-ticket-archaeologist-legacy-systems-division.png',
  );
  assert.equal(
    coverFileName('Night Shift Security Guard / Aspiring Novelist'),
    'careerpredict-night-shift-security-guard-aspiring-novelist.png',
  );
  assert.equal(coverFileName('!!!'), 'careerpredict-cover.png');
  assert.equal(coverFileName(undefined), 'careerpredict-cover.png');
  assert.ok(coverFileName('x'.repeat(500)).length < 90);
});
