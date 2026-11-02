import { ANALYSIS_NOTES } from '../content.js';

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function band(value) {
  if (value < 35) return 'low';
  if (value >= 70) return 'high';
  return 'mid';
}

/**
 * The report's derived "analysis" rows. Same formulas as the original report
 * so existing results read the same; clamped so no bar can leave its track.
 * Each row carries the note for the band its value lands in.
 */
export function analysisRows(happiness) {
  const h = Number(happiness) || 0;
  return [
    { key: 'dna', label: 'Professional DNA match', value: 97 },
    { key: 'market', label: 'Market viability', value: clamp(h - 5, 10, 99) },
    { key: 'passion', label: 'Passion alignment', value: clamp(h + 20, 0, 99) },
    { key: 'stability', label: 'Long-term stability', value: clamp(h - 15, 5, 99) },
  ].map((row) => ({ ...row, note: ANALYSIS_NOTES[row.key][band(row.value)] }));
}
