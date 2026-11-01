// Single source of truth for the cover's typographic proportions. Both the
// on-screen cover (CSS container units) and the downloadable PNG (canvas
// pixels) read from here, so the two can't drift apart. Every size is a
// fraction of the cover width.

export const COVER_RATIO = 4 / 5;

export const COVER = {
  pad: 0.055,
  // Measured in Chromium: 'CareerPredict' in Newsreader 600 with -0.045em
  // tracking is 6.17em wide, so 0.142 spans 0.876 of the cover, just inside
  // the 0.89 between the side paddings.
  mastheadSize: 0.142,
  mastheadTop: 0.045,
  issueSize: 0.022,
  kickerSize: 0.021,
  deckSize: 0.024,
  barcodeWidth: 0.15,
  barcodeHeight: 0.085,
};

// Titles run from 18 to 56 characters. Long titles drop a size so the
// headline stays within about three lines instead of swallowing the photo.
export function headlineScale(title = '') {
  const n = title.length;
  if (n <= 26) return 0.098;
  if (n <= 38) return 0.084;
  if (n <= 48) return 0.074;
  return 0.066;
}

/**
 * Greedy line breaking with a pluggable width measure, shared by canvas
 * (ctx.measureText) and tests. Returns at least one line; a single word wider
 * than maxWidth stays on its own line instead of being split mid-word.
 */
export function wrapLines(text, maxWidth, measure) {
  const words = String(text || '')
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line || lines.length === 0) lines.push(line);
  return lines;
}

/** File name for the downloaded cover, safe on every OS. */
export function coverFileName(title) {
  const slug = String(title || 'cover')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `careerpredict-${slug || 'cover'}.png`;
}
