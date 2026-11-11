import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { UI_EN } from './ui.en.js';
import { UI_HE } from './ui.he.js';

const COPY = { en: UI_EN, he: UI_HE };
export const LANGS = ['en', 'he'];
const STORAGE_KEY = 'lang';

/**
 * The reader's language: their saved choice, else Hebrew for a Hebrew
 * browser, else English. index.html runs the same rule before React loads,
 * so the page never paints left-to-right and then flips.
 */
export function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch {
    // Storage blocked (private mode): fall through to the browser language.
  }
  return typeof navigator !== 'undefined' && /^he\b|^iw\b/i.test(navigator.language || '') ? 'he' : 'en';
}

const LangContext = createContext({ lang: 'en', copy: UI_EN, setLang: () => {} });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = useCallback((next) => {
    if (!LANGS.includes(next)) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still holds for this visit.
    }
  }, []);

  const value = useMemo(() => ({ lang, copy: COPY[lang], setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/** { lang, copy, setLang }: copy is the UI text in the reader's language. */
export function useLang() {
  return useContext(LangContext);
}

/** The UI text in the reader's language (the shape of ui.en.js). */
export function useCopy() {
  return useContext(LangContext).copy;
}
