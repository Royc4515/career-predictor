import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, useReducedMotion } from 'motion/react';
import { useAuth } from '../app/AuthContext';
import Masthead from '../components/Masthead';
import Cover from '../components/Cover';
import Footer from '../components/Footer';
import { useToast } from '../components/Toast';
import { useImageReady } from '../hooks/useImageReady';
import { authUrls, fetchResult } from '../lib/api';
import { renderCoverBlob } from '../lib/coverCanvas';
import { coverFileName } from '../lib/coverLayout';
import { firstName } from '../lib/issue';
import { cachedResult, draftAnswers } from '../lib/storage';

const EASE = [0.22, 1, 0.36, 1];
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// Derived "analysis" rows. Same formulas as the original report so existing
// results read the same; clamped so no bar can leave its track.
function analysisRows(happiness) {
  const h = Number(happiness) || 0;
  return [
    { label: 'Professional DNA match', value: 97 },
    { label: 'Market viability', value: clamp(h - 5, 10, 99) },
    { label: 'Passion alignment', value: clamp(h + 20, 0, 99) },
    { label: 'Long-term stability', value: clamp(h - 15, 5, 99) },
  ];
}

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

export default function Result() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { user } = useAuth();
  const { result, error, retry } = useResult();
  const imageStatus = useImageReady(result?.imageUrl);
  const [coverBlob, setCoverBlob] = useState(null);
  const [toast, showToast] = useToast();
  const name = firstName(user?.name);

  // Render the cover PNG as soon as the photo settles. Doing it ahead of the
  // click keeps navigator.share() inside the user gesture on iOS Safari,
  // which rejects shares that start after an async gap.
  useEffect(() => {
    if (!result || imageStatus === 'pending') return undefined;
    let cancelled = false;
    setCoverBlob(null);
    renderCoverBlob({
      title: result.careerTitle,
      imageUrl: imageStatus === 'ready' ? result.imageUrl : null,
      personName: name,
      happiness: result.stats.happiness,
    })
      .then((blob) => !cancelled && setCoverBlob(blob))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [result, imageStatus, name]);

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
    showToast('Cover downloaded');
  }, [coverBlob, result, showToast]);

  const share = useCallback(async () => {
    if (!result) return;
    const url = window.location.origin;
    const text = `The forecast desk has spoken. I am "${result.careerTitle}". Get your own cover:`;
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
      if (err?.name !== 'AbortError') showToast('This browser can\u2019t share. Use Download cover instead.');
    }
  }, [coverBlob, result, showToast]);

  const retake = useCallback(() => {
    cachedResult.clear();
    draftAnswers.clear();
    navigate('/onboarding', { viewTransition: true });
  }, [navigate]);

  const header = (
    <Masthead
      right={
        <a href={authUrls.logout} className="meta link-ink text-ink">
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
          <h1 className="font-display text-[clamp(2.2rem,5vw,3.4rem)] leading-tight">Your cover didn&rsquo;t load</h1>
          <p className="mt-5 text-lg text-ink-2">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-10 min-h-[52px] self-start rounded-[3px] bg-ink px-6 text-paper hover:bg-ink-2"
          >
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
            Loading your cover
          </p>
        </main>
      </div>
    );
  }

  const { careerTitle, caption, stats } = result;

  return (
    <div className="min-h-dvh">
      {header}
      {toast}

      <main id="main" className="px-4 sm:px-8">
        <div className="mx-auto grid max-w-[1240px] gap-12 pt-8 pb-20 sm:pt-12 lg:grid-cols-12 lg:gap-10">
          <m.div
            className="lg:col-span-5"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <div className="lg:sticky lg:top-8">
              <Cover
                title={careerTitle}
                imageUrl={result.imageUrl}
                imageStatus={imageStatus}
                personName={name}
                happiness={stats.happiness}
                className="mx-auto max-w-[520px]"
              />
            </div>
          </m.div>

          <article className="lg:col-span-6 lg:col-start-7 lg:pt-2">
            <h1 className="font-display text-[clamp(2.3rem,4.6vw,4.2rem)] leading-[1.02] [text-wrap:balance]">
              {careerTitle}
            </h1>
            {caption && (
              <p className="font-display mt-6 max-w-[36rem] text-[1.4rem] leading-[1.45] text-ink-2 italic">
                {caption}
              </p>
            )}
            <p className="meta mt-6">Forecast for {name || 'you'}. Five answers, one lookup table, one image model.</p>

            <section aria-labelledby="figures-heading" className="mt-12 border-t border-ink pt-6">
              <h2 id="figures-heading" className="font-display text-[1.6rem]">
                The figures
              </h2>
              <dl className="mt-4 grid divide-rule sm:grid-cols-3 sm:divide-x">
                <div className="border-b border-rule py-4 sm:border-b-0 sm:pr-6">
                  <dt className="meta">Happiness index</dt>
                  <dd className="mt-1">
                    <span className="font-display tabular text-[2.6rem] leading-none">{stats.happiness}</span>
                    <span className="text-ink-2"> / 100</span>
                  </dd>
                </div>
                <div className="border-b border-rule py-4 sm:border-b-0 sm:px-6">
                  <dt className="meta">Salary potential</dt>
                  <dd className="font-display mt-1 text-[1.4rem] leading-snug">{stats.salary}</dd>
                </div>
                <div className="py-4 sm:pl-6">
                  <dt className="meta">Outlook</dt>
                  <dd className="font-display mt-1 text-[1.4rem] leading-snug">{stats.outlook}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="analysis-heading" className="mt-10 border-t border-ink pt-6">
              <h2 id="analysis-heading" className="font-display text-[1.6rem]">
                Detailed analysis
              </h2>
              <ul className="mt-2 divide-y divide-rule">
                {analysisRows(stats.happiness).map((row) => (
                  <li
                    key={row.label}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-4 sm:grid-cols-[13rem_1fr_3rem]"
                  >
                    <span className="text-ink-2">{row.label}</span>
                    <span
                      className="order-3 col-span-2 h-[3px] bg-paper-3 sm:order-none sm:col-span-1"
                      aria-hidden="true"
                    >
                      <span
                        className="block h-full origin-left bg-ink"
                        style={{ transform: `scaleX(${row.value / 100})` }}
                      />
                    </span>
                    <span className="tabular text-right font-medium">{row.value}%</span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Actions" className="mt-12 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={download}
                disabled={!coverBlob}
                className="inline-flex min-h-[52px] items-center rounded-[3px] bg-ink px-6 text-paper transition-colors hover:bg-ink-2 disabled:cursor-wait disabled:opacity-60"
              >
                {coverBlob ? 'Download cover' : imageStatus === 'pending' ? 'Developing portrait' : 'Preparing cover'}
              </button>
              <button
                type="button"
                onClick={share}
                className="inline-flex min-h-[52px] items-center rounded-[3px] border border-ink px-6 transition-colors hover:bg-paper-2"
              >
                Share cover
              </button>
              <button type="button" onClick={retake} className="link-ink ml-2 min-h-[44px] text-ink-2 hover:text-ink">
                Retake the questionnaire
              </button>
            </section>

            {imageStatus === 'failed' && (
              <p className="mt-6 max-w-[36rem] text-sm text-ink-2" role="status">
                The portrait couldn&rsquo;t be generated, so the cover is printed without one. Retake the questionnaire
                later to try again.
              </p>
            )}
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
