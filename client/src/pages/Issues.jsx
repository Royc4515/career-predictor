import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'motion/react';
import Masthead from '../components/Masthead';
import Cover from '../components/Cover';
import Footer from '../components/Footer';
import { useImageReady } from '../hooks/useImageReady';
import { deleteCover, fetchCovers } from '../lib/api';
import { EASE_OUT } from '../lib/motion';
import { setNavDirection } from '../lib/navDirection';

function filedOn(value) {
  // SQLite CURRENT_TIMESTAMP is UTC without a zone marker.
  const date = new Date(typeof value === 'string' && !value.endsWith('Z') ? `${value.replace(' ', 'T')}Z` : value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function BackIssue({ cover, number, onRemove, removing }) {
  const status = useImageReady(cover.imageUrl);
  const filed = filedOn(cover.filedAt);
  return (
    <li>
      <Cover
        title={cover.title}
        imageUrl={cover.imageUrl}
        imageStatus={status}
        deck={filed ? `Filed ${filed}.` : 'From the archive.'}
        lazy
      />
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="meta">No. {number}</p>
        {cover.current ? (
          <span className="meta bg-mark px-1.5 text-ink">Current issue</span>
        ) : (
          <button
            type="button"
            onClick={() => onRemove(cover.id)}
            disabled={removing}
            className="link-ink tap meta text-ink disabled:opacity-50"
          >
            {removing ? 'Removing…' : 'Remove'}
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * "Your back issues": every cover the desk has printed for you, newest first.
 * Shared portraits only; a personal portrait belongs to the current issue and
 * is never archived (the consent screen promises a retake deletes it).
 */
export default function Issues() {
  const [covers, setCovers] = useState(null);
  const [error, setError] = useState(null);
  const [removing, setRemoving] = useState(null);

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
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(null);
    }
  }

  const back = (
    <Link to="/result" viewTransition onClick={() => setNavDirection('back')} className="meta link-ink tap text-ink">
      Current issue
    </Link>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <Masthead right={back} />
      <main id="main" className="flex-1 px-4 pt-8 pb-20 sm:px-8 sm:pt-12">
        <div className="mx-auto max-w-[1240px]">
          <m.h1
            className="font-display text-title text-balance"
            initial={{ opacity: 0, transform: 'translateY(8px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          >
            Your back issues
          </m.h1>
          {covers && (
            <p className="text-body mt-3 max-w-[36rem]">
              {covers.length === 0
                ? 'The archive is empty. Every cover the desk prints for you lands here.'
                : covers.length === 1
                  ? 'One issue on file. Retake the questionnaire and the archive starts to grow.'
                  : `${covers.length} issues on file, newest first. The desk keeps your last 30.`}
            </p>
          )}
          {error && (
            <p className="text-body mt-4" role="alert">
              {error}
            </p>
          )}
          {!covers && !error && (
            <p className="meta mt-6" role="status">
              Fetching the archive…
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
              Retake the questionnaire
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
