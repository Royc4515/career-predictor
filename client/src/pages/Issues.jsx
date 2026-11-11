import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { m } from 'motion/react';
import Masthead from '../components/Masthead';
import Cover from '../components/Cover';
import Footer from '../components/Footer';
import { useImageReady } from '../hooks/useImageReady';
import { useAuth } from '../app/AuthContext';
import { deleteCover, fetchCovers, makeCoverCurrent } from '../lib/api';
import { renderCoverBlob } from '../lib/coverCanvas';
import { coverFileName } from '../lib/coverLayout';
import { downloadBlob } from '../lib/download';
import { firstName } from '../lib/issue';
import { EASE_OUT } from '../lib/motion';
import { setNavDirection } from '../lib/navDirection';

function filedOn(value) {
  // SQLite CURRENT_TIMESTAMP is UTC without a zone marker.
  const date = new Date(typeof value === 'string' && !value.endsWith('Z') ? `${value.replace(' ', 'T')}Z` : value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function BackIssue({ cover, number, onRemove, removing, onOpen }) {
  // The reader's own portrait when they shot one for this issue; the desk's
  // shared portrait otherwise, or if theirs could not be made. The shared one
  // is only polled when it is needed.
  const personalStatus = useImageReady(cover.personalImageUrl);
  const mine = Boolean(cover.personalImageUrl) && personalStatus !== 'failed';
  const sharedStatus = useImageReady(mine ? null : cover.imageUrl);
  const imageUrl = mine ? cover.personalImageUrl : cover.imageUrl;
  const status = mine ? personalStatus : sharedStatus;
  const filed = filedOn(cover.filedAt);
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
          title={cover.title}
          imageUrl={imageUrl}
          imageStatus={status}
          deck={filed ? `Filed ${filed}.` : 'From the archive.'}
          lazy
        />
        {/* The whole cover opens the issue. A button laid over it, rather than
            one wrapping it, keeps the cover's markup valid and gives screen
            readers one clear name for the action. */}
        <button
          type="button"
          onClick={() => onOpen({ cover, number, imageUrl, status, mine, filed })}
          aria-label={`Open issue ${number}: ${cover.title}`}
          className="absolute inset-0 cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="meta">
          No. {number}
          {mine && <span className="text-ink-3"> · You</span>}
        </p>
        {cover.current ? (
          <span className="meta bg-mark px-1.5 text-ink">Current issue</span>
        ) : (
          !confirming && (
            <button
              ref={removeRef}
              type="button"
              onClick={() => (mine ? setConfirming(true) : onRemove(cover.id))}
              disabled={removing}
              className="link-ink tap meta text-ink disabled:opacity-50"
            >
              {removing ? 'Removing…' : 'Remove'}
            </button>
          )
        )}
      </div>
      {confirming && (
        <div role="group" aria-label={`Remove issue ${number}`} className="mt-2 bg-paper-2 p-3">
          <p className="meta text-ink">Your photo on this cover is deleted too.</p>
          <div className="mt-1 flex flex-wrap gap-x-4">
            {/* Focus lands on the safe choice. */}
            <button type="button" autoFocus onClick={keep} className="link-ink tap meta text-ink">
              Keep it
            </button>
            <button
              type="button"
              onClick={() => onRemove(cover.id)}
              disabled={removing}
              className="link-ink tap meta text-alert disabled:opacity-50"
            >
              {removing ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * One back issue, large, in a modal dialog (native <dialog>: focus is kept
 * inside, Esc closes, and focus returns to the cover that opened it). From
 * here the reader can make it their current issue again.
 */
function IssueDialog({ issue, onClose }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { cover, number, imageUrl, mine, filed } = issue;
  // Its own poll, so a portrait still developing when the dialog opened
  // still arrives here (the card's status was a snapshot).
  const status = useImageReady(imageUrl);
  const { user } = useAuth();
  const name = firstName(user?.name);
  const [blob, setBlob] = useState(null);

  // The PNG is rendered ahead of the click, as on the result page, so the
  // download starts inside the tap.
  useEffect(() => {
    if (status === 'pending') return undefined;
    let cancelled = false;
    renderCoverBlob({
      title: cover.title,
      imageUrl: status === 'ready' ? imageUrl : null,
      personName: name,
      happiness: cover.happiness,
    })
      .then((b) => !cancelled && setBlob(b))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status, imageUrl, cover.title, cover.happiness, name]);

  // don't touch / No close() in a cleanup: the close event fires a task later
  // and calls onClose, so under StrictMode's mount, unmount, mount the dialog
  // closed itself right after opening. Unmounting removes it from the top
  // layer anyway.
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);

  async function choose() {
    setBusy(true);
    setError(null);
    try {
      await makeCoverCurrent(cover.id);
      setNavDirection('forward');
      navigate('/result', { viewTransition: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  function openCurrent() {
    setNavDirection('forward');
    navigate('/result', { viewTransition: true });
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      aria-label={`Issue ${number}: ${cover.title}`}
      className="m-auto max-h-[100dvh] w-[min(100vw-2rem,28rem)] bg-paper p-0 text-ink backdrop:bg-ink/60"
    >
      <div className="p-4 sm:p-5">
        <div className="mx-auto w-[min(100%,max(12rem,calc((100dvh-13rem)*0.8)))]">
          <Cover
            title={cover.title}
            imageUrl={imageUrl}
            imageStatus={status}
            deck={filed ? `Filed ${filed}.` : 'From the archive.'}
          />
        </div>
        <p className="meta mt-3">
          No. {number}
          {mine && <span className="text-ink-3"> · You</span>}
          {cover.current && <span className="ml-2 bg-mark px-1.5 text-ink">Current issue</span>}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {cover.current ? (
            <button type="button" onClick={openCurrent} className="btn btn-primary">
              Open it
            </button>
          ) : (
            <button type="button" onClick={choose} disabled={busy} className="btn btn-primary">
              {busy ? 'Switching…' : 'Make this my current issue'}
            </button>
          )}
          <button
            type="button"
            onClick={() => downloadBlob(blob, coverFileName(cover.title))}
            disabled={!blob}
            className="btn btn-secondary"
          >
            {blob ? 'Download' : 'Preparing…'}
          </button>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="link-ink tap meta min-h-[44px] text-ink"
          >
            Close
          </button>
        </div>
        {error && (
          <p className="text-body mt-3" role="alert">
            {error}
          </p>
        )}
      </div>
    </dialog>
  );
}

/**
 * "Your back issues": every cover the desk has printed for you, newest first,
 * each with your own portrait if you shot one for it. Tapping one opens it
 * and lets you make it your current issue again; removing one deletes its
 * portrait too.
 */
export default function Issues() {
  const [covers, setCovers] = useState(null);
  const [error, setError] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [opened, setOpened] = useState(null);
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
      Current issue
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
                  onOpen={setOpened}
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
      {opened && <IssueDialog issue={opened} onClose={() => setOpened(null)} />}
      <Footer />
    </div>
  );
}
