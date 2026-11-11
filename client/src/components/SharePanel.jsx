import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useLang } from '../i18n/LangContext';
import { createShare, setShareFace, stopShare } from '../lib/api';
import { localizeError } from '../lib/errors';
import { newShareToken, shareUrlFor } from '../lib/shareLink';
import { shareLinks } from '../lib/storage';

/**
 * One-tap sharing of the current issue: a public link to its own page (the
 * cover and the report, with a preview in chats).
 *
 * The browser names the link's token, so the share sheet (or, without one,
 * the clipboard) gets the finished link inside the tap, while the server
 * files it in parallel. Safari refuses a share that starts after a network
 * wait; this used to cost a second tap.
 *
 * WhatsApp gets its own link (wa.me with the text and the link), so the
 * most used chat is one tap from the result page, not two. Its href needs
 * the token before the tap: `spare` is one made ahead, and nothing is
 * public until a tap files it.
 *
 * key: the issue's English title (one live link per issue this session).
 * text: the line the share sheet sends with the link.
 */
export function useShareLink({ key, text, lang }) {
  const [link, setLink] = useState(() => shareLinks.get(key)); // { token, url, withFace, state }
  const [note, setNote] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null); // 'stopping' | 'face'
  const [spare, setSpare] = useState(newShareToken);

  useEffect(() => {
    setLink(shareLinks.get(key));
    setNote(null);
    setError(null);
  }, [key]);

  const update = useCallback(
    (next) => {
      setLink(next);
      // A link that ended never comes back: the next share gets a new one.
      if (!next) setSpare(newShareToken());
      // Only a link the server has filed is worth reusing after a reload.
      shareLinks.set(key, next && next.state === 'live' ? next : null);
    },
    [key],
  );

  const file = useCallback(
    (draft) =>
      createShare({ token: draft.token, withFace: draft.withFace, lang, keepalive: true })
        .then((made) => {
          update({ ...draft, url: made.url || draft.url, withFace: made.withFace, state: 'live' });
          return true;
        })
        .catch((err) => {
          setLink({ ...draft, state: 'failed' });
          setError(localizeError(lang, err.message));
          return false;
        }),
    [lang, update],
  );

  const copyLink = useCallback(async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setNote('copied');
    } catch {
      setNote(null);
    }
  }, []);

  const token = link?.token || spare;
  const url = shareUrlFor(token, window.location.origin);

  // The link this tap shares: the live one again, or a new one filed now.
  const begin = useCallback(() => {
    setError(null);
    setNote(null);
    const reused = link?.state === 'live';
    const draft = { token, url, withFace: Boolean(link?.withFace) };
    if (!reused) setLink({ ...draft, state: 'filing' });
    return { reused, draft, filed: reused ? Promise.resolve(true) : file(draft) };
  }, [link, token, url, file]);

  // don't touch / Nothing may be awaited before navigator.share or the
  // clipboard write below: either one has to start inside the tap.
  const share = useCallback(() => {
    const { reused, draft, filed } = begin();
    if (navigator.share) {
      navigator.share({ title: text, text, url: draft.url }).catch(async (err) => {
        if (err?.name === 'AbortError') {
          // Dismissed without sending: a link made for this tap goes again,
          // so nothing public is left behind that nobody chose to share.
          if (!reused && (await filed)) {
            await stopShare(token).catch(() => {});
            update(null);
          }
          return;
        }
        copyLink(draft.url);
      });
    } else {
      copyLink(draft.url);
    }
  }, [begin, text, token, copyLink, update]);

  // The anchor itself opens WhatsApp (app on a phone, WhatsApp Web on a
  // computer); this only files the link, with keepalive so the request
  // survives the page going to the background.
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const toWhatsApp = useCallback(() => {
    begin();
  }, [begin]);

  const retry = useCallback(() => {
    if (!link) return;
    setError(null);
    setLink({ ...link, state: 'filing' });
    file(link);
  }, [link, file]);

  const stop = useCallback(async () => {
    if (!link) return;
    setBusy('stopping');
    setError(null);
    try {
      if (link.state === 'live') await stopShare(link.token);
      update(null);
      setNote('stopped');
    } catch (err) {
      setError(localizeError(lang, err.message));
    } finally {
      setBusy(null);
    }
  }, [link, lang, update]);

  const setFace = useCallback(
    async (withFace) => {
      if (!link || link.state !== 'live') return;
      setBusy('face');
      setError(null);
      // The box answers the tap at once and goes back if the server says no;
      // waiting for the round trip left it looking unclicked.
      update({ ...link, withFace });
      try {
        const made = await setShareFace(link.token, withFace);
        update({ ...link, withFace: made.withFace });
      } catch (err) {
        update(link);
        setError(localizeError(lang, err.message));
      } finally {
        setBusy(null);
      }
    },
    [link, lang, update],
  );

  return {
    link,
    note,
    error,
    busy,
    share,
    whatsappHref,
    toWhatsApp,
    retry,
    stop,
    setFace,
    copy: () => link && copyLink(link.url),
  };
}

/**
 * What happens after Share: the link, its state, Copy and Stop sharing, and
 * (when the cover carries the reader's face) a box that shows or hides it on
 * the shared page, unticked by default. It opens right under the buttons and
 * scrolls itself into view, so nothing has to be scrolled to.
 *
 * hasFace: the cover carries the reader's own portrait.
 */
export default function ShareStrip({ share, hasFace }) {
  const { lang, copy } = useLang();
  const t = copy.share;
  const id = useId();
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { link, note, error, busy } = share;
  const visible = Boolean(link || note || error);

  // Again whenever the strip's content changes: "Making the link…" is one
  // line, and the longer "Shared…" that follows grew it past the screen.
  const phase = `${link?.state}|${note}|${error}|${Boolean(link?.withFace)}`;
  useEffect(() => {
    if (visible) ref.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [visible, phase, reduce]);

  if (!visible) return null;

  const status = error
    ? null
    : note === 'stopped'
      ? t.stopped
      : link?.state === 'filing'
        ? t.making
        : note === 'copied'
          ? t.copied
          : link
            ? t.live
            : null;

  return (
    <section ref={ref} aria-label={t.heading} className="mt-4 max-w-[36rem] scroll-mb-4 bg-paper-2 p-4 sm:p-5">
      {status && (
        <p className="text-[0.95rem] leading-normal text-ink sm:text-body" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="text-[0.95rem] leading-normal text-ink sm:text-body" role="alert">
          {error}
        </p>
      )}

      {link && (
        <>
          <input
            id={`${id}-url`}
            aria-label={t.linkLabel}
            readOnly
            dir="ltr"
            value={link.url}
            onFocus={(e) => e.target.select()}
            className="mt-3 w-full border border-rule bg-paper px-3 py-2 font-sans text-[0.9rem] text-ink"
          />
          {hasFace && link.state === 'live' && (
            <label htmlFor={`${id}-face`} className="mt-3 flex cursor-pointer items-start gap-3">
              <input
                id={`${id}-face`}
                type="checkbox"
                checked={link.withFace}
                disabled={busy === 'face'}
                onChange={(e) => share.setFace(e.target.checked)}
                className="mt-1 size-5 shrink-0 accent-[var(--color-ink)]"
              />
              <span>
                <span className="text-body">{t.withFace}</span>
                <span className="meta block">{t.withFaceNote}</span>
              </span>
            </label>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {link.state === 'failed' ? (
              <button type="button" onClick={share.retry} className="btn btn-secondary">
                {t.retry}
              </button>
            ) : (
              <button type="button" onClick={share.copy} className="btn btn-secondary">
                {t.copy}
              </button>
            )}
            <button
              type="button"
              onClick={share.stop}
              disabled={busy === 'stopping'}
              className="link-ink tap meta min-h-[44px] text-ink"
            >
              {busy === 'stopping' ? t.stopping : t.stop}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
