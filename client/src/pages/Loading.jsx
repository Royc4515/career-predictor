import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Masthead from '../components/Masthead';
import Cover from '../components/Cover';
import { PRESS_STEPS } from '../content';
import { submitAnswers, uploadPortrait } from '../lib/api';
import { OWN_PHOTO_OPTION } from '../content';
import { pendingPhoto } from '../lib/pendingPhoto';
import { cachedResult, draftAnswers } from '../lib/storage';
import { setNavDirection } from '../lib/navDirection';
import { currentAnswers, isComplete } from '../lib/quiz';

// The server answers in milliseconds; the pause is part of the bit. It is
// kept short enough that nobody waits on purpose for longer than a joke.
const MIN_DURATION_MS = 5200;
const STEP_MS = MIN_DURATION_MS / PRESS_STEPS.length;
// The headline appears on the cover at this step ("Setting your headline").
const HEADLINE_STEP = PRESS_STEPS.length - 2;

/**
 * "Use my own photo": upload the selfie chosen on the last step now that the
 * result exists, so the first cover the reader sees is already theirs. A
 * failure never blocks the result; it travels to the result page as a note.
 */
async function withSelfie(data, answers) {
  if (answers.portrait_subject !== OWN_PHOTO_OPTION) return data;
  const photo = pendingPhoto.get();
  pendingPhoto.clear();
  if (!photo) {
    return { ...data, personalNotice: 'Your selfie did not survive the page reload. Add it again below.' };
  }
  try {
    return { ...data, personal: await uploadPortrait(photo) };
  } catch (err) {
    return { ...data, personalNotice: `Your selfie was not sent: ${err.message}` };
  }
}

function StepMark({ state }) {
  if (state === 'done') {
    return (
      <svg viewBox="0 0 16 16" className="size-4 text-ink" aria-hidden="true">
        <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
      </svg>
    );
  }
  if (state === 'active') {
    // One pulse cycle per step, so the pulse never cuts off mid-breath.
    return <span className="block h-[2px] w-4 animate-[pulse_0.9s_ease-in-out_infinite] bg-ink" aria-hidden="true" />;
  }
  return <span className="block h-[1px] w-4 bg-rule" aria-hidden="true" />;
}

export default function Loading() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [timeDone, setTimeDone] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const barRef = useRef(null);
  // Held in a ref so React StrictMode's dev double-mount reuses the same
  // request instead of saving the result twice.
  const request = useRef(null);

  // don't touch / Snapshot once. Reading storage on every render let the
  // draft being cleared on success flip `ready` to false while the deferred
  // view-transition navigation was still pending, which bounced the reader
  // back to /onboarding instead of /result.
  const [answers] = useState(() => currentAnswers(draftAnswers.get()));
  const ready = isComplete(answers);

  useEffect(() => {
    if (!ready) navigate('/onboarding', { replace: true });
  }, [ready, navigate]);

  useEffect(() => {
    import('./Result');
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    if (!request.current) request.current = submitAnswers(answers).then((data) => withSelfie(data, answers));
    request.current
      .then((data) => {
        if (cancelled) return;
        cachedResult.set(data);
        // Saved server-side now; a later retake should start blank.
        draftAnswers.clear();
        setResult(data);
      })
      .catch((err) => {
        if (cancelled) return;
        request.current = null;
        setError(err.message || 'Something went wrong at the printer.');
      });
    return () => {
      cancelled = true;
    };
    // answers is read once per attempt on purpose; retry bumps attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, attempt]);

  // Timeline: a few state updates (one per step) instead of a re-render per
  // frame. The bar itself is driven by the Web Animations API below.
  useEffect(() => {
    if (error) return undefined;
    setActiveStep(0);
    setTimeDone(false);
    const stepTimer = setInterval(() => setActiveStep((s) => Math.min(s + 1, PRESS_STEPS.length - 1)), STEP_MS);
    const doneTimer = setTimeout(() => setTimeDone(true), MIN_DURATION_MS);
    return () => {
      clearInterval(stepTimer);
      clearTimeout(doneTimer);
    };
  }, [error, attempt]);

  // Runs on the compositor and holds at 97% until the server confirms, so the
  // bar never claims a finished cover that has not been saved.
  useEffect(() => {
    const bar = barRef.current;
    if (error || !bar?.animate) return undefined;
    const anim = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(0.97)' }], {
      duration: MIN_DURATION_MS,
      easing: 'linear',
      fill: 'forwards',
    });
    return () => anim.cancel();
  }, [error, attempt]);

  const done = timeDone && Boolean(result);
  useEffect(() => {
    if (!done) return undefined;
    barRef.current?.animate?.([{ transform: 'scaleX(0.97)' }, { transform: 'scaleX(1)' }], {
      duration: 150,
      easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
      fill: 'forwards',
    });
    const t = setTimeout(() => {
      setNavDirection('forward');
      navigate('/result', { replace: true, viewTransition: true });
    }, 350);
    return () => clearTimeout(t);
  }, [done, navigate]);

  const retry = useCallback(() => {
    setError(null);
    setResult(null);
    setAttempt((n) => n + 1);
  }, []);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Masthead />
        <main id="main" className="flex flex-1 items-center px-4 sm:px-8">
          <div className="mx-auto w-full max-w-[40rem] py-16" role="alert">
            <h1 className="font-display text-title text-balance">Your answers weren&rsquo;t sent</h1>
            <p className="mt-5 text-lede">{error}</p>
            <p className="text-body mt-2">
              They are still saved on this device, so you won&rsquo;t need to answer again.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <button type="button" onClick={retry} className="btn btn-primary">
                Send again
              </button>
              <Link to="/onboarding" viewTransition className="link-ink">
                Review answers
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const percentLabel = done ? 100 : Math.min(Math.round(((activeStep + 1) / PRESS_STEPS.length) * 97), 97);
  const headline = result && activeStep >= HEADLINE_STEP ? result.careerTitle : 'Headline being set';

  return (
    <div className="flex min-h-dvh flex-col">
      <Masthead />
      <main id="main" className="flex flex-1 items-center px-4 sm:px-8">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-8 py-8 sm:py-16 lg:grid-cols-12 lg:gap-10">
          {/* Phones get the printing cover too, small and above the title, so
              the press effect isn't desktop-only. */}
          {/* Width on the wrapper: Cover sets w-full on itself. */}
          <div className="w-[min(52vw,220px)] lg:col-span-4 lg:w-full lg:max-w-[320px]">
            <Cover title={headline} imageStatus="pending" deck="Going to print." printing />
          </div>

          <div className="lg:col-span-6 lg:col-start-6">
            <h1 className="font-display text-title text-balance">Printing your cover…</h1>
            <div
              className="mt-6 h-[3px] bg-paper-3 sm:mt-8"
              role="progressbar"
              aria-label="Printing your cover"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentLabel}
            >
              <div ref={barRef} className="h-full origin-left bg-ink" style={{ transform: 'scaleX(0)' }} />
            </div>
            <ol className="mt-6 space-y-3 sm:mt-10 sm:space-y-4" aria-label="Steps">
              {PRESS_STEPS.map((label, i) => {
                const state = i < activeStep || done ? 'done' : i === activeStep ? 'active' : 'todo';
                return (
                  <li
                    key={label}
                    className="flex items-center gap-4"
                    aria-current={state === 'active' ? 'step' : undefined}
                  >
                    <span className="grid w-4 place-items-center">
                      <StepMark state={state} />
                    </span>
                    <span className={`text-body ${state === 'todo' ? 'text-ink-3' : 'text-ink'}`}>{label}</span>
                  </li>
                );
              })}
            </ol>
            <p className="meta mt-6 sm:mt-10">Keep this tab open. It takes a few seconds.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
