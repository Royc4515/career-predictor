// The masthead shows a live issue line. Numbering counts months since the
// first issue (January 2024) so it moves forward on its own and never needs
// a hand-edited constant.
const FIRST_ISSUE = { year: 2024, month: 0 };

const LOCALES = { en: 'en-US', he: 'he-IL' };

export function issueFor(date = new Date(), lang = 'en') {
  const number = (date.getFullYear() - FIRST_ISSUE.year) * 12 + (date.getMonth() - FIRST_ISSUE.month) + 1;
  const locale = LOCALES[lang] ?? LOCALES.en;
  const month = date.toLocaleString(locale, { month: 'long' });
  return {
    number: Math.max(1, number),
    label: `${month} ${date.getFullYear()}`,
    short: date.toLocaleString(locale, { month: 'short', year: 'numeric' }),
  };
}

/** A date in the reader's language, e.g. "Nov 9, 2026" / "9 בנוב׳ 2026". */
export function formatDate(date, lang = 'en', style = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return date.toLocaleDateString(LOCALES[lang] ?? LOCALES.en, style);
}

export function firstName(name) {
  if (!name || typeof name !== 'string') return null;
  const first = name.trim().split(/\s+/)[0];
  return first || null;
}

// Deterministic bar widths for the cover barcode, seeded from the title so the
// same career always prints the same code (screen and downloaded PNG match).
export function barcodeBars(seedText, count = 34) {
  let h = 2166136261;
  for (const ch of seedText || 'careerpredict') {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const bars = [];
  for (let i = 0; i < count; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    bars.push(1 + (Math.abs(h) % 3));
  }
  return bars;
}
