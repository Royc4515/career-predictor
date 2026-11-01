import { useEffect, useState } from 'react';

// The image route answers 404 + Retry-After while a portrait is generating
// (docs/image-service-spec.md section 6). Polling with HEAD keeps a broken-
// image icon from ever flashing in an <img>, and lets the cover show a
// deliberate "developing" state instead.
const FIRST_DELAY_MS = 1200;
const MAX_DELAY_MS = 6000;
const GIVE_UP_AFTER_MS = 120_000;

export function useImageReady(url) {
  const [status, setStatus] = useState(url ? 'pending' : 'failed');

  useEffect(() => {
    if (!url) {
      setStatus('failed');
      return undefined;
    }
    // Legacy rows store an external CDN URL that has no HEAD contract with
    // us and may not allow CORS; let the <img> load it directly.
    if (!url.includes('/api/image/')) {
      setStatus('ready');
      return undefined;
    }

    let cancelled = false;
    let timer;
    const started = Date.now();
    setStatus('pending');

    async function poll(delay) {
      try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        if (cancelled) return;
        if (res.ok) return setStatus('ready');
        // 400 means a malformed id: waiting will never fix it.
        if (res.status === 400) return setStatus('failed');
      } catch {
        // Network blip or cold-starting host: keep polling until the deadline.
      }
      if (cancelled) return;
      if (Date.now() - started > GIVE_UP_AFTER_MS) return setStatus('failed');
      timer = setTimeout(() => poll(Math.min(delay * 1.4, MAX_DELAY_MS)), delay);
    }

    poll(FIRST_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url]);

  return status;
}
