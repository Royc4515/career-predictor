import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import { useAuth } from '../app/AuthContext';
import Masthead from '../components/Masthead';
import Cover from '../components/Cover';
import TiltCard from '../components/effects/TiltCard';
import Stamp from '../components/effects/Stamp';
import Footer from '../components/Footer';
import PersonalPortrait from '../components/PersonalPortrait';
import Report from '../components/Report';
import ShareStrip, { useShareLink } from '../components/SharePanel';
import { useImageReady } from '../hooks/useImageReady';
import { authUrls, fetchResult } from '../lib/api';
import { renderCoverBlob } from '../lib/coverCanvas';
import { coverFileName } from '../lib/coverLayout';
import { downloadBlob } from '../lib/download';
import { firstName } from '../lib/issue';
import { EASE_OUT, rise } from '../lib/motion';
import { setNavDirection } from '../lib/navDirection';
import { cachedResult, draftAnswers, stampSeen } from '../lib/storage';
import { useLang } from '../i18n/LangContext';
import { careerCopy } from '../i18n/content';
import { formatDate } from '../lib/issue';
import { localizeError } from '../lib/errors';

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
  const name = firstName(user?.name);
  const { lang, copy } = useLang();
  const t = copy.result;
  // The career in the reader's language; the English title stays the key
  // for the stamp, the file name and the share text's fallback.
  const career = result
    ? careerCopy(
        lang,
        {
          title: result.careerTitle,
          caption: result.caption,
          salary: result.stats.salary,
          outlook: result.stats.outlook,
        },
        result.coverGender,
      )
    : null;

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  // One tap: the share sheet opens with the issue's public link already in
  // it (SharePanel). Hooks run before the early returns below.
  const shareLink = useShareLink({
    key: result?.careerTitle ?? '',
    text: career ? t.shareText(career.title) : '',
    lang,
  });

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
      title: career.title,
      imageUrl: imageStatus === 'ready' ? coverUrl : null,
      personName: name,
      happiness: result.stats.happiness,
      lang,
    })
      .then((blob) => !cancelled && setCoverBlob(blob))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-style note: career is derived from result + lang, both listed.
  }, [result, imageStatus, name, coverUrl, lang, career?.title]);

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
    downloadBlob(coverBlob, coverFileName(result.careerTitle));
    // The confirmation lives on the button that was pressed, not in a toast
    // across the screen.
    setJustSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setJustSaved(false), SAVED_LABEL_MS);
  }, [coverBlob, result]);

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
          {copy.common.signOut}
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
          <h1 className="font-display text-title text-balance">{t.loadErrorTitle}</h1>
          <p className="mt-5 text-lede">{localizeError(lang, error)}</p>
          <button type="button" onClick={retry} className="btn btn-primary mt-10 self-start">
            {t.loadAgain}
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
            {t.loading}
          </p>
        </main>
      </div>
    );
  }

  const { stats } = result;
  const { title: careerTitle, caption } = career;
  // Results saved before the quiz redesign (and old cached ones) have none.
  const evidence = Array.isArray(result.evidence) ? result.evidence.filter((q) => typeof q === 'string') : [];
  const filed = formatDate(new Date(), lang, { month: 'long', day: 'numeric', year: 'numeric' });
  const downloadLabel = justSaved
    ? t.saved
    : coverBlob
      ? t.download
      : imageStatus === 'pending'
        ? t.developing
        : t.preparing;

  return (
    <div className="min-h-dvh">
      {header}

      <main id="main" className="px-4 sm:px-8">
        <div className="mx-auto grid max-w-[1240px] gap-5 pt-4 pb-20 sm:gap-12 sm:pt-12 lg:grid-cols-12 lg:gap-10">
          {/* Short entrance: the darkroom develop is this page's moment, so
              nothing else should compete with it. */}
          <m.div className="lg:col-span-6" {...rise(10)} transition={{ duration: 0.45, ease: EASE_OUT }}>
            <div className="cover-fit relative lg:sticky lg:top-8">
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
            {/* On a phone the caption moves below the actions: captions run one
                to four lines, and above the row they pushed Download / Share
                under the first screen for most careers. The cover is sized so
                the headline and this row fit (cover-fit in index.css). From
                sm up there is room, and the caption leads as before. */}
            <div className="flex flex-col">
              <h1 className="font-display text-[clamp(1.6rem,2.8vw,2.5rem)] leading-[1.1] text-balance">
                {careerTitle}
              </h1>
              {caption && (
                <p className="font-display max-sm:order-last mt-4 text-[1.2rem] leading-snug italic sm:mt-5 sm:text-lede">
                  {caption}
                </p>
              )}
              <section
                aria-label={t.actions}
                className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mt-8 sm:gap-3"
              >
                <button
                  type="button"
                  onClick={download}
                  disabled={!coverBlob}
                  className="btn btn-primary sm:min-w-[14rem]"
                  aria-live="polite"
                >
                  <SwapLabel text={downloadLabel} />
                </button>
                <button type="button" onClick={shareLink.share} className="btn btn-secondary">
                  {t.share}
                </button>
                <button type="button" onClick={retake} className="link-ink min-h-[44px] text-ink">
                  {t.retake}
                </button>
                <Link
                  to="/issues"
                  viewTransition
                  onClick={() => setNavDirection('forward')}
                  className="link-ink tap min-h-[44px] content-center text-ink"
                >
                  {t.backIssues}
                </Link>
              </section>
            </div>

            <ShareStrip share={shareLink} hasFace={personal?.status === 'ready'} />

            {imageStatus === 'failed' && (
              <p className="text-body mt-5" role="status">
                {t.portraitFailed}
              </p>
            )}

            <p className="meta mt-6">{t.filed(name, filed)}</p>
            <Stamp ready={stamped} play={slam} className="mt-4 ms-1" />

            <PersonalPortrait
              personal={personal}
              available={Boolean(result.personalAvailable)}
              blocked={result.personalBlocked}
              notice={result.personalNotice}
              showing={showing}
              onShow={setShowing}
              onChange={changePersonal}
            />

            <Report evidence={evidence} stats={stats} career={career} />
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
