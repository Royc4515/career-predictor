import { useEffect, useState } from 'react';
import { SAMPLE_TITLES } from '../content';
import { fetchSamples } from '../lib/api';

/**
 * Landing-page samples. Titles are available immediately (text-only covers);
 * portrait URLs arrive from /api/samples. If that call fails the covers stay
 * text-only, which is still a complete design.
 */
export function useSamples() {
  const [samples, setSamples] = useState(() => SAMPLE_TITLES.map((title) => ({ title })));

  useEffect(() => {
    let cancelled = false;
    fetchSamples().then((fromServer) => {
      if (cancelled || !fromServer?.length) return;
      const urls = new Map(fromServer.map((s) => [s.title, s.imageUrl]));
      setSamples((prev) => prev.map((s) => ({ ...s, imageUrl: urls.get(s.title) })));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return samples;
}
