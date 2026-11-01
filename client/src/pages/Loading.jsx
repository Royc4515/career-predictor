import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { m, useReducedMotion } from 'motion/react';
import Masthead from '../components/Masthead';
import { PRESS_STEPS, QUESTIONS } from '../content';
import { submitAnswers } from '../lib/api';
import { cachedResult, draftAnswers } from '../lib/storage';

// The server answers in milliseconds; the pause is part of the bit. It is
// kept short enough that nobody waits on purpose for longer than a joke.
const MIN_DURATION_MS = 5200;

function hasRequiredAnswers(answers) {
  // desired_field is optional server-side (validateOnboardingAnswers).
  return QUESTIONS.filter((q) => q.id !== 'desired_field').every((q) => answers[q.id]);
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
    return <span className="block h-[2px] w-4 animate-pulse bg-ink" aria-hidden="true" />;
  }
  return <span className="block h-[1px] w-4 bg-rule" aria-hidden="true" />;
}

export default function Loading() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const [apiDone, setApiDone] = useState(false);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  // Held in a ref so React StrictMode's dev double-mount reuses the same
  // request instead of saving the result twice.
  const request = useRef(null);

  // don't touch / Snapshot once. Reading storage on every render let the
  // draft being cleared on success flip `ready` to false while the deferred
  // view-transition navigation was still pending, which bounced the reader
  // back to /onboarding instead of /result.
  const [answers] = useState(() => draftAnswers.get());
  const ready = hasRequiredAnswers(answers);

  useEffect(() => {
    if (!ready) navigate('/onboarding', { replace: true });
  }, [ready, navigate]);

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    if (!request.current) request.current = submitAnswers(answers);
    request.current
      .then((result) => {
        if (cancelled) return;
        cachedResult.set(result);
        // Saved server-side now; a later retake should start blank.
        draftAnswers.clear();
        setApiDone(true);
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

  useEffect(() => {
    if (error) return undefined;
    const started = performance.now();
    let frame;
    // Stops itself at the minimum duration so a slow server doesn't keep a
    // 60fps re-render loop running while we wait.
    const tick = () => {
      const now = performance.now() - started;
      setElapsed(now);
      if (now < MIN_DURATION_MS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [error, attempt]);

  const timeDone = elapsed >= MIN_DURATION_MS;
  useEffect(() => {
    if (!timeDone || !apiDone) return undefined;
    const t = setTimeout(() => {
      navigate('/result', { replace: true, viewTransition: true });
    }, 350);
    return () => clearTimeout(t);
  }, [timeDone, apiDone, navigate]);

  const retry = useCallback(() => {
    setError(null);
    setElapsed(0);
    setApiDone(false);
    setAttempt((n) => n + 1);
  }, []);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Masthead />
        <main id="main" className="flex flex-1 items-center px-4 sm:px-8">
          <div className="mx-auto w-full max-w-[40rem] py-16" role="alert">
            <h1 className="font-display text-[clamp(2.2rem,5vw,3.4rem)] leading-tight">
              Your answers weren&rsquo;t sent
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-2">{error}</p>
            <p className="mt-2 text-ink-2">
              They are still saved on this device, so you won&rsquo;t need to answer again.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <button
                type="button"
                onClick={retry}
                className="min-h-[52px] rounded-[3px] bg-ink px-6 text-paper transition-colors hover:bg-ink-2"
              >
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

  const progress = Math.min(elapsed / MIN_DURATION_MS, 1);
  // Hold short of the end until the server confirms, so the bar never
  // claims a finished cover that has not actually been saved.
  const shown = apiDone ? progress : Math.min(progress, 0.97);
  const activeStep = Math.min(Math.floor(progress * PRESS_STEPS.length), PRESS_STEPS.length - 1);
  const allDone = apiDone && progress >= 1;

  return (
    <div className="flex min-h-dvh flex-col">
      <Masthead />
      <main id="main" className="flex flex-1 items-center px-4 sm:px-8">
        <div className="mx-auto w-full max-w-[40rem] py-16">
          <h1 className="font-display text-[clamp(2.4rem,6vw,4.2rem)] leading-[1]">Printing your cover</h1>
          <div
            className="mt-8 h-[3px] bg-paper-3"
            role="progressbar"
            aria-label="Printing your cover"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(shown * 100)}
          >
            <div className="h-full origin-left bg-ink" style={{ transform: `scaleX(${shown})` }} />
          </div>
          <ol className="mt-10 space-y-4" aria-label="Steps">
            {PRESS_STEPS.map((label, i) => {
              const state = i < activeStep || allDone ? 'done' : i === activeStep ? 'active' : 'todo';
              return (
                <m.li
                  key={label}
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: state === 'todo' ? 0.45 : 1 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-4"
                  aria-current={state === 'active' ? 'step' : undefined}
                >
                  <span className="grid w-4 place-items-center">
                    <StepMark state={state} />
                  </span>
                  <span className={`text-[1.05rem] ${state === 'todo' ? 'text-ink-2' : 'text-ink'}`}>{label}</span>
                </m.li>
              );
            })}
          </ol>
          <p className="meta mt-10">Keep this tab open. It takes a few seconds.</p>
        </div>
      </main>
    </div>
  );
}
