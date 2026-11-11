import { useId, useState } from 'react';
import { useLang } from '../i18n/LangContext';
import { createShare, stopShare } from '../lib/api';
import { localizeError } from '../lib/errors';

/**
 * "Share": a public link to this issue (its own page with the cover and the
 * report, and a preview with the cover when pasted into a chat), created
 * only when the reader asks. Two steps on purpose: Safari refuses a native
 * share that starts after a network wait, so the link is made first and
 * the share sheet opens from a second, fresh tap.
 *
 * hasFace: the cover carries the reader's own portrait; then a box (unticked
 * by default) decides whether the public page shows it.
 */
export default function SharePanel({ title, hasFace, onClose }) {
  const { lang, copy } = useLang();
  const t = copy.share;
  const faceId = useId();
  const [withFace, setWithFace] = useState(false);
  const [link, setLink] = useState(null); // { url, token }
  const [busy, setBusy] = useState(null); // 'creating' | 'stopping'
  const [note, setNote] = useState(null);
  const [error, setError] = useState(null);

  async function create() {
    setBusy('creating');
    setError(null);
    setNote(null);
    try {
      setLink(await createShare({ withFace, lang }));
    } catch (err) {
      setError(localizeError(lang, err.message));
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    const text = copy.result.shareText(title);
    try {
      if (navigator.share) await navigator.share({ title, text, url: link.url });
      else await copyLink();
    } catch (err) {
      if (err?.name !== 'AbortError') await copyLink();
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link.url);
      setNote(t.copied);
    } catch {
      setNote(null);
    }
  }

  async function stop() {
    setBusy('stopping');
    setError(null);
    try {
      await stopShare(link.token);
      setLink(null);
      setNote(t.stopped);
    } catch (err) {
      setError(localizeError(lang, err.message));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="share-heading" className="mt-5 max-w-[36rem] bg-paper-2 p-5 sm:p-6">
      <h2 id="share-heading" className="font-display text-[1.25rem] leading-tight">
        {t.heading}
      </h2>
      <p className="mt-2 text-[0.95rem] leading-normal sm:text-body">{t.explain}</p>

      {hasFace && (
        <label htmlFor={faceId} className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            id={faceId}
            type="checkbox"
            checked={withFace}
            onChange={(e) => {
              setWithFace(e.target.checked);
              // A link made for the other choice would show the wrong portrait.
              setLink(null);
            }}
            className="mt-1 size-5 shrink-0 accent-[var(--color-ink)]"
          />
          <span>
            <span className="text-body">{t.withFace}</span>
            <span className="meta block">{t.withFaceNote}</span>
          </span>
        </label>
      )}

      {link ? (
        <>
          <label className="meta mt-4 block" htmlFor={`${faceId}-url`}>
            {t.linkLabel}
          </label>
          <input
            id={`${faceId}-url`}
            readOnly
            dir="ltr"
            value={link.url}
            onFocus={(e) => e.target.select()}
            className="mt-1 w-full border border-rule bg-paper px-3 py-2 font-sans text-[0.9rem] text-ink"
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <button type="button" onClick={send} className="btn btn-primary">
              {t.send}
            </button>
            <button type="button" onClick={copyLink} className="btn btn-secondary">
              {t.copy}
            </button>
            <button
              type="button"
              onClick={stop}
              disabled={busy === 'stopping'}
              className="link-ink tap meta min-h-[44px] text-ink"
            >
              {busy === 'stopping' ? t.stopping : t.stop}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          <button type="button" onClick={create} disabled={busy === 'creating'} className="btn btn-primary">
            {busy === 'creating' ? t.creating : t.create}
          </button>
          <button type="button" onClick={onClose} className="link-ink tap meta min-h-[44px] text-ink">
            {t.close}
          </button>
        </div>
      )}

      {(note || error) && (
        <p className="meta mt-3 text-ink" role={error ? 'alert' : 'status'}>
          {error || note}
        </p>
      )}
    </section>
  );
}
