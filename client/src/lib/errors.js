import { UI_HE } from '../i18n/ui.he.js';

// Messages that carry a number; matched by shape.
const PATTERNS = [
  [/^The newsroom returned an error \((\d+)\)/, (m) => `חדר החדשות החזיר שגיאה (${m[1]}). נסו שוב בעוד רגע.`],
  [/^Upload failed \((\d+)\)/, (m) => `ההעלאה נכשלה (${m[1]}). נסו שוב.`],
  [/^Answer "[\w-]+" (must be a string|is too long)$/, () => 'אחת התשובות לא תקינה. רעננו את העמוד ונסו שוב.'],
];

/**
 * An error message in the reader's language. The server and lib/ raise
 * English (one source of truth, and the logs stay English); the Hebrew page
 * translates at the point of display. An unknown message falls back to a
 * plain Hebrew "something went wrong" rather than English mid-page.
 */
export function localizeError(lang, message) {
  if (lang !== 'he' || !message) return message;
  const exact = UI_HE.errors[message];
  if (exact) return exact;
  for (const [re, render] of PATTERNS) {
    const m = message.match(re);
    if (m) return render(m);
  }
  return UI_HE.consent.unknownError;
}
