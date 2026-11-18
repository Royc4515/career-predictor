import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'motion/react';
import Masthead from '../components/Masthead';
import Cover from '../components/Cover';
import Footer from '../components/Footer';
import { useUndoableRemove } from '../components/UndoToast';
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

function BackIssue({ cover, number, onRemove }) {
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
          // No "are you sure": the issue goes at once and the bar under the
          // page offers Undo until the delete is actually sent.
          <button
            type="button"
            onClick={() => onRemove(cover.id, number, mine)}
            className="link-ink tap meta text-ink"
          >
            {t.remove}
          </button>
        )}
      </div>
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
  const headingRef = useRef(null);
  const undoable = useUndoableRemove();

  useEffect(() => {
    let cancelled = false;
    fetchCovers()
      .then((list) => !cancelled && setCovers(list))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  function remove(id, number, withPhoto) {
    const cover = covers.find((c) => c.id === id);
    if (!cover) return;
    setError(null);
    setCovers((list) => list.filter((c) => c.id !== id));
    // The removed card took focus with it; land on the page heading.
    requestAnimationFrame(() => headingRef.current?.focus());
    undoable.remove(`cover:${id}`, {
      message: withPhoto ? t.removedWithPhoto(number) : t.removed(number),
      commit: (opts) => deleteCover(id, opts),
      // Back in its place: the list is newest first, by id.
      restore: () => setCovers((list) => (list.some((c) => c.id === id) ? list : [...list, cover].sort((a, b) => b.id - a.id))),
      onError: (err) => setError(err.message),
    });
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
      {undoable.toast}
    </div>
  );
}
