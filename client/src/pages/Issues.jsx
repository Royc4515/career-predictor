import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'motion/react';
import Masthead from '../components/Masthead';
import Cover from '../components/Cover';
import Footer from '../components/Footer';
import { useImageReady } from '../hooks/useImageReady';
import { deleteCover, fetchCovers } from '../lib/api';
import { formatDate } from '../lib/issue';
import { useLang } from '../i18n/LangContext';
import { careerTitle } from '../i18n/content';
import { localizeError } from '../lib/errors';
import { EASE_OUT } from '../lib/motion';
import { setNavDirection } from '../lib/navDirection';

function filedOn(value, lang) {
  // SQLite CURRENT_TIMESTAMP is UTC without a zone marker.
  const date = new Date(typeof value === 'string' && !value.endsWith('Z') ? `${value.replace(' ', 'T')}Z` : value);
  return Number.isNaN(date.getTime()) ? null : formatDate(date, lang);
}

function BackIssue({ cover, number, onRemove, removing }) {
  // The reader's own portrait when they shot one for this issue; the desk's
  // shared portrait otherwise, or if theirs could not be made. The shared one
  // is only polled when it is needed.
  const personalStatus = useImageReady(cover.personalImageUrl);
  const mine = Boolean(cover.personalImageUrl) && personalStatus !== 'failed';
  const sharedStatus = useImageReady(mine ? null : cover.imageUrl);
  const imageUrl = mine ? cover.personalImageUrl : cover.imageUrl;
  const status = mine ? personalStatus : sharedStatus;
  const { lang, copy } = useLang();
  const t = copy.issues;
  const filed = filedOn(cover.filedAt, lang);
  const title = careerTitle(lang, cover.title, cover.coverGender);
  // Removing an issue with the reader's own face deletes that portrait for
  // good, so it asks first; a desk portrait can always be shot again.
  const [confirming, setConfirming] = useState(false);
  const removeRef = useRef(null);
  // "Keep it" unmounts the button that had focus: hand focus back to Remove
  // instead of letting it fall to <body>.
  function keep() {
    setConfirming(false);
    requestAnimationFrame(() => removeRef.current?.focus());
  }
  return (
    <li>
      <div className="relative">
        <Cover
          title={title}
          imageUrl={imageUrl}
          imageStatus={status}
          deck={filed ? t.filed(filed) : t.fromArchive}
          lazy
        />
        {/* The whole cover opens the issue's page, report and all; the
            current issue's page is the result page. A link laid over the
            cover, rather than one wrapping it, keeps the cover's markup valid
            and gives screen readers one clear name for the action. */}
        <Link
          to={cover.current ? '/result' : `/issues/${cover.id}`}
          viewTransition
          onClick={() => setNavDirection('forward')}
          aria-label={t.open(number, title)}
          className="absolute inset-0 cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="meta">
          {t.number(number)}
          {mine && <span className="text-ink-3">{t.you}</span>}
        </p>
        {cover.current ? (
          <span className="meta bg-mark px-1.5 text-ink">{copy.common.currentIssue}</span>
        ) : (
          !confirming && (
            <button
              ref={removeRef}
              type="button"
              onClick={() => (mine ? setConfirming(true) : onRemove(cover.id))}
              disabled={removing}
              className="link-ink tap meta text-ink disabled:opacity-50"
            >
              {removing ? t.removing : t.remove}
            </button>
          )
        )}
      </div>
      {confirming && (
        <div role="group" aria-label={t.removeGroup(number)} className="mt-2 bg-paper-2 p-3">
          <p className="meta text-ink">{t.deletesPhoto}</p>
          <div className="mt-1 flex flex-wrap gap-x-4">
            {/* Focus lands on the safe choice. */}
            <button type="button" autoFocus onClick={keep} className="link-ink tap meta text-ink">
              {t.keep}
            </button>
            <button
              type="button"
              onClick={() => onRemove(cover.id)}
              disabled={removing}
              className="link-ink tap meta text-alert disabled:opacity-50"
            >
              {removing ? t.removing : t.remove}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * "Your back issues": every cover the desk has printed for you, newest first,
 * each with your own portrait if you shot one for it. Tapping one opens its
 * page (IssuePage): the full report, "make it current", a reshoot with your
 * own face. Removing one deletes its portrait too.
 */
export default function Issues() {
  const { lang, copy } = useLang();
  const t = copy.issues;
  const [covers, setCovers] = useState(null);
  const [error, setError] = useState(null);
  const [removing, setRemoving] = useState(null);
  const headingRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchCovers()
      .then((list) => !cancelled && setCovers(list))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(id) {
    setRemoving(id);
    try {
      await deleteCover(id);
      setCovers((list) => list.filter((c) => c.id !== id));
      // The removed card took focus with it; land on the page heading.
      requestAnimationFrame(() => headingRef.current?.focus());
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(null);
    }
  }

  const back = (
    <Link to="/result" viewTransition onClick={() => setNavDirection('back')} className="meta link-ink tap text-ink">
      {copy.common.currentIssue}
    </Link>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <Masthead right={back} />
      <main id="main" className="flex-1 px-4 pt-8 pb-20 sm:px-8 sm:pt-12">
        <div className="mx-auto max-w-[1240px]">
          <m.h1
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-title text-balance outline-none"
            initial={{ opacity: 0, transform: 'translateY(8px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          >
            {t.title}
          </m.h1>
          {covers && (
            <p className="text-body mt-3 max-w-[36rem]">
              {covers.length === 0 ? t.empty : covers.length === 1 ? t.one : t.many(covers.length)}
            </p>
          )}
          {error && (
            <p className="text-body mt-4" role="alert">
              {localizeError(lang, error)}
            </p>
          )}
          {!covers && !error && (
            <p className="meta mt-6" role="status">
              {t.fetching}
            </p>
          )}

          {covers?.length > 0 && (
            <ol className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
              {covers.map((cover, i) => (
                <BackIssue
                  key={cover.id}
                  cover={cover}
                  number={covers.length - i}
                  onRemove={remove}
                  removing={removing === cover.id}
                />
              ))}
            </ol>
          )}

          <p className="mt-12">
            <Link
              to="/onboarding"
              viewTransition
              onClick={() => setNavDirection('forward')}
              className="link-ink tap text-ink"
            >
              {t.retake}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
