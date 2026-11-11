import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import { useAuth } from '../app/AuthContext';
import Masthead from '../components/Masthead';
import Cover from '../components/Cover';
import TiltCard from '../components/effects/TiltCard';
import Stamp from '../components/effects/Stamp';
import Odometer from '../components/effects/Odometer';
import Footer from '../components/Footer';
import PersonalPortrait from '../components/PersonalPortrait';
import { FINDINGS } from '../content';
import { useToast } from '../components/Toast';
import { useImageReady } from '../hooks/useImageReady';
import { authUrls, fetchResult } from '../lib/api';
import { analysisRows } from '../lib/analysis';
import { renderCoverBlob } from '../lib/coverCanvas';
import { coverFileName } from '../lib/coverLayout';
import { firstName } from '../lib/issue';
import { EASE_OUT, rise } from '../lib/motion';
import { setNavDirection } from '../lib/navDirection';
import { cachedResult, draftAnswers, stampSeen } from '../lib/storage';

const SAVED_LABEL_MS = 1600;

function useResult() {
  const navigate = useNavigate();
  const [result, setResult] = useState(() => cachedResult.get());
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (result) return undefined;
    let cancelled = false;
    setError(null);
    fetchResult()
      .then((data) => {
        if (cancelled) return;
        if (!data) return navigate('/onboarding', { replace: true });
        cachedResult.set(data);
        setResult(data);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [result, attempt, navigate]);

  return { result, error, retry: () => setAttempt((n) => n + 1) };
}

/** Button label that changes in place instead of jumping between states. */
function SwapLabel({ text }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <m.span
        key={text}
        initial={{ opacity: 0, transform: 'translateY(6px)', filter: 'blur(2px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)', filter: 'blur(0px)' }}
        exit={{ opacity: 0, transform: 'translateY(-6px)', filter: 'blur(2px)' }}
        transition={{ duration: 0.18, ease: EASE_OUT }}
      >
        {text}
      </m.span>
    </AnimatePresence>
  );
}

export default function Result() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { result, error, retry } = useResult();
  // The personal portrait (the user's own face), if any, and which portrait
  // the cover shows. Kept in state so an upload or removal updates the page
  // without refetching the result.
  const [personal, setPersonal] = useState(null);
  const [showing, setShowing] = useState('desk');
  useEffect(() => {
    const p = result?.personal ?? null;
    setPersonal(p);
    setShowing(p && p.status !== 'failed' ? 'mine' : 'desk');
  }, [result]);
  const showPersonal = showing === 'mine' && personal && personal.status !== 'failed';
  const coverUrl = showPersonal ? personal.imageUrl : result?.imageUrl;
  const imageStatus = useImageReady(coverUrl);
  const [coverBlob, setCoverBlob] = useState(null);
  const [justSaved, setJustSaved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  // Decided once per mount: slam the stamp only the first time this session.
  const [slam] = useState(() => !(result && stampSeen.has(result.careerTitle)));
  const savedTimer = useRef(null);
  const [toast, showToast] = useToast();
  const name = firstName(user?.name);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  // A cover without a portrait is still finished, so it gets its stamp too.
  const stamped = revealed || imageStatus === 'failed';
  useEffect(() => {
    if (stamped && result) stampSeen.mark(result.careerTitle);
  }, [stamped, result]);

  // Render the cover PNG as soon as the photo settles. Doing it ahead of the
  // click keeps navigator.share() inside the user gesture on iOS Safari,
  // which rejects shares that start after an async gap.
  useEffect(() => {
    if (!result || imageStatus === 'pending') return undefined;
    let cancelled = false;
    setCoverBlob(null);
    renderCoverBlob({
      title: result.careerTitle,
      imageUrl: imageStatus === 'ready' ? coverUrl : null,
      personName: name,
      happiness: result.stats.happiness,
    })
      .then((blob) => !cancelled && setCoverBlob(blob))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [result, imageStatus, name, coverUrl]);

  // Polling the personal portrait settles its status: the panel stops saying
  // "developing", or offers another try and the cover goes back to the desk.
  useEffect(() => {
    if (!showPersonal || personal.status !== 'generating' || imageStatus === 'pending') return;
    const next = { ...personal, status: imageStatus === 'ready' ? 'ready' : 'failed' };
    setPersonal(next);
    if (next.status === 'failed') setShowing('desk');
  }, [showPersonal, personal, imageStatus]);

  const changePersonal = useCallback(
    (next) => {
      setPersonal(next);
      if (result) cachedResult.set({ ...result, personal: next });
    },
    [result],
  );

  const download = useCallback(() => {
    if (!coverBlob || !result) return;
    const url = URL.createObjectURL(coverBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = coverFileName(result.careerTitle);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    // The confirmation lives on the button that was pressed, not in a toast
    // across the screen.
    setJustSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setJustSaved(false), SAVED_LABEL_MS);
  }, [coverBlob, result]);

  const share = useCallback(async () => {
    if (!result) return;
    const url = window.location.origin;
    const text = `The forecast desk has spoken. I am “${result.careerTitle}”. Get your own cover:`;
    try {
      const file = coverBlob ? new File([coverBlob], coverFileName(result.careerTitle), { type: 'image/png' }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${text} ${url}` });
      } else if (navigator.share) {
        await navigator.share({ text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        showToast('Link copied');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') showToast('This browser can’t share. Use Download cover instead.');
    }
  }, [coverBlob, result, showToast]);

  const retake = useCallback(() => {
    cachedResult.clear();
    draftAnswers.clear();
    setNavDirection('back');
    navigate('/onboarding', { viewTransition: true });
  }, [navigate]);

  const header = (
    <Masthead
      right={
        <a href={authUrls.logout} className="meta link-ink tap text-ink">
          Sign out
        </a>
      }
    />
  );

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col">
        {header}
        <main
          id="main"
          className="mx-auto flex w-full max-w-[40rem] flex-1 flex-col justify-center px-4 py-16"
          role="alert"
        >
          <h1 className="font-display text-title text-balance">Your cover didn&rsquo;t load</h1>
          <p className="mt-5 text-lede">{error}</p>
          <button type="button" onClick={retry} className="btn btn-primary mt-10 self-start">
            Load again
          </button>
        </main>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-dvh flex-col">
        {header}
        <main id="main" className="flex flex-1 items-center justify-center">
          <p className="meta animate-pulse" role="status">
            Loading your cover…
          </p>
        </main>
      </div>
    );
  }

  const { careerTitle, caption, stats } = result;
  // Results saved before the quiz redesign (and old cached ones) have none.
  const evidence = Array.isArray(result.evidence) ? result.evidence.filter((q) => typeof q === 'string') : [];
  const filed = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const downloadLabel = justSaved
    ? 'Saved to your device'
    : coverBlob
      ? 'Download cover'
      : imageStatus === 'pending'
        ? 'Developing portrait…'
        : 'Preparing cover…';

  return (
    <div className="min-h-dvh">
      {header}
      {toast}

      <main id="main" className="px-4 sm:px-8">
        <div className="mx-auto grid max-w-[1240px] gap-12 pt-8 pb-20 sm:pt-12 lg:grid-cols-12 lg:gap-10">
          {/* Short entrance: the darkroom develop is this page's moment, so
              nothing else should compete with it. */}
          <m.div className="lg:col-span-6" {...rise(10)} transition={{ duration: 0.45, ease: EASE_OUT }}>
            <div className="relative mx-auto max-w-[600px] lg:sticky lg:top-8">
              <TiltCard>
                <Cover
                  title={careerTitle}
                  imageUrl={coverUrl}
                  imageStatus={imageStatus}
                  personName={name}
                  happiness={stats.happiness}
                  reveal="press"
                  onRevealed={() => setRevealed(true)}
                />
              </TiltCard>
            </div>
          </m.div>

          <article className="lg:col-span-5 lg:col-start-8 lg:pt-2">
            <h1 className="font-display text-[clamp(1.75rem,2.8vw,2.5rem)] leading-[1.1] text-balance">
              {careerTitle}
            </h1>
            {caption && <p className="font-display mt-5 text-lede italic">{caption}</p>}
            <p className="meta mt-5">
              Forecast for {name || 'you'}, filed {filed}.
            </p>
            <Stamp ready={stamped} play={slam} className="mt-4 ml-1" />

            <section aria-label="Actions" className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={download}
                disabled={!coverBlob}
                className="btn btn-primary min-w-[14rem]"
                aria-live="polite"
              >
                <SwapLabel text={downloadLabel} />
              </button>
              <button type="button" onClick={share} className="btn btn-secondary">
                Share cover
              </button>
              <button type="button" onClick={retake} className="link-ink min-h-[44px] text-ink">
                Retake the questionnaire
              </button>
            </section>

            {imageStatus === 'failed' && (
              <p className="text-body mt-5" role="status">
                The portrait couldn&rsquo;t be generated, so the cover is printed without one. Retake the questionnaire
                later to try again.
              </p>
            )}

            <PersonalPortrait
              personal={personal}
              available={Boolean(result.personalAvailable)}
              showing={showing}
              onShow={setShowing}
              onChange={changePersonal}
            />

            {evidence.length > 0 && (
              <section aria-labelledby="evidence-heading" className="mt-12 border-t border-ink pt-6">
                <h2 id="evidence-heading" className="font-display text-section">
                  Evidence on file
                </h2>
                {/* Quote, then the analyst's conclusion: the satire is the
                    straight face between the two. */}
                <dl className="mt-5 space-y-5">
                  {evidence.map((quote) => (
                    <div key={quote} className="border-l-2 border-mark pl-4">
                      <dt className="text-body font-medium text-ink">&ldquo;{quote}&rdquo;</dt>
                      {FINDINGS[quote] && (
                        <dd className="font-display mt-1 text-[1.15rem] leading-snug text-ink-2 italic">
                          {FINDINGS[quote]}
                        </dd>
                      )}
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <section aria-labelledby="figures-heading" className="mt-12 border-t border-ink pt-6">
              <h2 id="figures-heading" className="font-display text-section">
                The figures
              </h2>
              <dl className="mt-5 grid gap-6 bg-paper-2 p-6 sm:grid-cols-[0.8fr_1.1fr_1.1fr] sm:gap-8">
                <div>
                  <dt className="meta">Happiness index</dt>
                  <dd className="mt-1">
                    <Odometer
                      value={stats.happiness}
                      delay={0.4}
                      className="font-display tabular text-[2.6rem] leading-none"
                    />
                    <span> / 100</span>
                  </dd>
                </div>
                <div>
                  <dt className="meta">Salary potential</dt>
                  <dd className="font-display mt-1 text-[1.3rem] leading-snug">{stats.salary}</dd>
                </div>
                <div>
                  <dt className="meta">Outlook</dt>
                  <dd className="font-display mt-1 text-[1.3rem] leading-snug">{stats.outlook}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="analysis-heading" className="mt-10 border-t border-ink pt-6">
              <h2 id="analysis-heading" className="font-display text-section">
                Detailed analysis
              </h2>
              <ul className="mt-4 space-y-5">
                {analysisRows(stats.happiness).map((row) => (
                  <li key={row.label}>
                    <div className="text-body flex items-baseline justify-between gap-4">
                      <span>{row.label}</span>
                      <span className="tabular font-medium">{row.value}%</span>
                    </div>
                    <span
                      className="mt-2 block h-[6px] origin-left bg-ink"
                      style={{ width: `${row.value}%` }}
                      aria-hidden="true"
                    />
                    <p className="font-display mt-2 text-[1.05rem] leading-snug text-ink-2 italic">{row.note}</p>
                  </li>
                ))}
              </ul>
            </section>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
