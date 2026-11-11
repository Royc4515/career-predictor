import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useAuth } from '../app/AuthContext';
import Masthead from '../components/Masthead';
import { OWN_PHOTO_OPTION, QUESTIONS, QUIZ_STEPS } from '../content';
import PhotoConsent from '../components/PhotoConsent';
import { fetchFeatures } from '../lib/api';
import { pendingPhoto } from '../lib/pendingPhoto';
import { firstName } from '../lib/issue';
import { draftAnswers } from '../lib/storage';
import { currentAnswers } from '../lib/quiz';
import { EASE_IN_OUT, EASE_OUT } from '../lib/motion';
import { setNavDirection } from '../lib/navDirection';

// Long enough to see the highlighter land, short enough to feel immediate.
const ADVANCE_DELAY_MS = 360;
const LETTERS = ['A', 'B', 'C', 'D'];

// Variants take the direction at exit time. Inline exit props would be frozen
// at the last render, so going back would still exit upward.
const questionMotion = {
  enter: (d) => ({ opacity: 0, transform: `translateY(${12 * d}px)` }),
  center: { opacity: 1, transform: 'translateY(0px)' },
  exit: (d) => ({ opacity: 0, transform: `translateY(${-8 * d}px)`, transition: { duration: 0.15 } }),
};

// The five questions plus the photographer's step: all screens use STEPS, and
// only the progress label tells the photographer's step apart.
const STEPS = QUIZ_STEPS;

function firstUnanswered(answers) {
  const i = STEPS.findIndex((q) => !answers[q.id]);
  return i === -1 ? STEPS.length - 1 : i;
}

/** Which question to show: the one in ?q= if the reader has earned it. */
function resolveStep(params, answers) {
  const furthest = firstUnanswered(answers);
  const requested = Number.parseInt(params.get('q'), 10) - 1;
  return Number.isInteger(requested) && requested >= 0 ? Math.min(requested, furthest) : furthest;
}

function AnswerFile({ answers }) {
  return (
    <aside aria-labelledby="file-heading" className="bg-paper-2 p-6">
      <h2 id="file-heading" className="font-display text-[1.5rem] leading-tight">
        Your file so far
      </h2>
      <dl className="mt-5 space-y-4">
        {STEPS.map((q) => (
          <div key={q.id}>
            <dt className="meta">{q.label}</dt>
            <dd className="mt-1">
              {answers[q.id] ? (
                <span className="font-display marker px-1 text-[1.1rem] leading-snug">{answers[q.id]}</span>
              ) : (
                <span className="text-ink-3">Not yet answered</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [params, setParams] = useSearchParams();

  // Resume where the reader left off (reload, or back from a failed submit).
  // Stale answers from an older questionnaire are dropped, not resumed.
  const [answers, setAnswers] = useState(() => currentAnswers(draftAnswers.get()));
  const [locked, setLocked] = useState(false);
  const optionRefs = useRef([]);
  const advanceTimer = useRef(null);
  const keyboardUser = useRef(false);

  // The step lives in the URL so the browser's Back button walks back through
  // the questions instead of leaving the questionnaire.
  const step = resolveStep(params, answers);
  const prevStep = useRef(step);
  const direction = step >= prevStep.current ? 1 : -1;
  useEffect(() => {
    prevStep.current = step;
  });

  // "Use my own photo" is only offered when the server can make personal
  // portraits; until we know, it stays hidden rather than flashing in.
  const [canUsePhoto, setCanUsePhoto] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchFeatures().then((f) => !cancelled && setCanUsePhoto(f.personalPortraits));
    return () => {
      cancelled = true;
    };
  }, []);

  const stepDef = STEPS[step];
  const current =
    stepDef.options.includes(OWN_PHOTO_OPTION) && !canUsePhoto
      ? { ...stepDef, options: stepDef.options.filter((o) => o !== OWN_PHOTO_OPTION) }
      : stepDef;
  const selected = answers[current.id];
  // Picking "Use my own photo" opens the consent panel instead of moving on;
  // the step completes once a selfie has been chosen.
  const wantsPhoto = selected === OWN_PHOTO_OPTION && canUsePhoto;
  const answeredCount = STEPS.filter((q) => answers[q.id]).length;
  const isQuestion = step < QUESTIONS.length;

  // Normalize a missing or out-of-range ?q= without adding a history entry.
  useEffect(() => {
    if (params.get('q') !== String(step + 1)) setParams({ q: String(step + 1) }, { replace: true });
  }, [params, setParams, step]);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  // Fetch the next page's code while the reader is busy answering.
  useEffect(() => {
    import('./Loading');
  }, []);

  const choose = useCallback(
    (option) => {
      if (locked) return;
      const next = { ...answers, [current.id]: option };
      setAnswers(next);
      draftAnswers.set(next);
      if (option === OWN_PHOTO_OPTION) return; // wait for the selfie
      if (current.id === 'portrait_subject') pendingPhoto.clear();
      setLocked(true);

      advanceTimer.current = setTimeout(() => {
        setLocked(false);
        if (step < STEPS.length - 1) {
          setParams({ q: String(step + 2) });
        } else {
          setNavDirection('forward');
          navigate('/loading', { viewTransition: true });
        }
      }, ADVANCE_DELAY_MS);
    },
    [answers, current.id, locked, navigate, setParams, step],
  );

  // The selfie is held in memory (lib/pendingPhoto) and uploaded by the
  // Loading page right after the result is saved.
  const onPhoto = useCallback(
    (blob) => {
      pendingPhoto.set(blob);
      setNavDirection('forward');
      navigate('/loading', { viewTransition: true });
    },
    [navigate],
  );

  const goBack = useCallback(() => {
    if (step === 0 || locked) return;
    setParams({ q: String(step) });
  }, [locked, setParams, step]);

  // Keyboard: A-D or 1-4 answer, Backspace goes back. Ignored while a
  // modifier is held so browser shortcuts keep working.
  useEffect(() => {
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toUpperCase();
      const index = '1234'.includes(key) ? Number(key) - 1 : LETTERS.indexOf(key);
      if (index >= 0 && index < current.options.length) {
        e.preventDefault();
        choose(current.options[index]);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        goBack();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, current.options, goBack]);

  // Remember the input modality so focus is only moved for keyboard users.
  useEffect(() => {
    const onKey = () => (keyboardUser.current = true);
    const onPointer = () => (keyboardUser.current = false);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }, []);

  // Land keyboard and screen-reader users on the chosen (or first) option of
  // each new question. Pointer users are left alone: a focus ring on load
  // reads as a pre-selected answer.
  useEffect(() => {
    if (!keyboardUser.current) return undefined;
    const i = Math.max(0, current.options.indexOf(selected));
    const t = setTimeout(() => optionRefs.current[i]?.focus({ preventScroll: true }), reduce ? 0 : 170);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Roving focus inside the radio group, per the WAI-ARIA radio pattern.
  function onOptionKeyDown(e, i) {
    const n = current.options.length;
    let target = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') target = (i + 1) % n;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') target = (i - 1 + n) % n;
    if (target !== null) {
      e.preventDefault();
      optionRefs.current[target]?.focus();
    }
  }

  const name = firstName(user?.name);

  return (
    <div className="flex min-h-dvh flex-col">
      <Masthead right={<p className="meta">{name ? `Questionnaire for ${name}` : 'Questionnaire'}</p>} />

      <main id="main" className="flex-1 px-4 pt-3 pb-10 sm:px-8 sm:pt-14 sm:pb-16">
        <div className="mx-auto max-w-[1240px]">
          <div className="flex items-center justify-between gap-4">
            <p className="meta tabular" aria-live="polite">
              {isQuestion ? `Question ${step + 1} of ${QUESTIONS.length}` : 'For the photographer'}
            </p>
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="meta link-ink min-h-[44px] text-ink disabled:invisible"
            >
              Previous question
            </button>
          </div>
          <div
            className="mt-2 h-[3px] bg-paper-3"
            role="progressbar"
            aria-label="Questionnaire progress"
            aria-valuemin={0}
            aria-valuemax={STEPS.length}
            aria-valuenow={answeredCount}
          >
            <m.div
              className="h-full origin-left bg-ink"
              initial={false}
              animate={{ transform: `scaleX(${answeredCount / STEPS.length})` }}
              transition={{ duration: 0.3, ease: EASE_IN_OUT }}
            />
          </div>

          <div className="mt-6 grid gap-12 sm:mt-16 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-8">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <m.div
                  key={current.id}
                  custom={direction}
                  variants={questionMotion}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: EASE_OUT }}
                >
                  <h1
                    id={`q-${current.id}`}
                    className="font-display text-[clamp(1.9rem,8vw,2.25rem)] leading-[1.06] text-balance sm:text-title"
                  >
                    {current.question}
                  </h1>
                  <div
                    role="radiogroup"
                    aria-labelledby={`q-${current.id}`}
                    className="mt-6 border-t border-ink sm:mt-10"
                  >
                    {current.options.map((option, i) => {
                      const isSelected = selected === option;
                      return (
                        <button
                          key={option}
                          ref={(el) => (optionRefs.current[i] = el)}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={isSelected || (!selected && i === 0) ? 0 : -1}
                          onClick={() => choose(option)}
                          onKeyDown={(e) => onOptionKeyDown(e, i)}
                          className="group flex min-h-[56px] w-full items-center gap-4 border-b border-rule py-3 text-left sm:min-h-[68px] sm:py-4 transition-colors duration-150 active:bg-paper-2 sm:-mx-3 sm:w-[calc(100%+1.5rem)] sm:gap-7 sm:px-3 [@media(hover:hover)]:hover:bg-paper-2"
                        >
                          <kbd
                            className={`grid size-8 shrink-0 place-items-center rounded-[3px] border font-sans text-[0.8rem] font-semibold transition-colors ${
                              isSelected
                                ? 'border-ink bg-ink text-paper'
                                : 'border-rule text-ink-2 group-hover:border-ink group-hover:text-ink'
                            }`}
                          >
                            {LETTERS[i]}
                          </kbd>
                          <span className="font-display relative text-[clamp(1.2rem,5.2vw,1.3rem)] leading-snug sm:text-[clamp(1.3rem,2.4vw,1.9rem)]">
                            {/* Highlighter stroke drawn left to right when chosen. clip-path
                                keeps the stroke's ragged ends intact; scaleX squashed them. */}
                            <m.span
                              aria-hidden="true"
                              className="marker absolute -inset-x-[0.2em] inset-y-[0.12em]"
                              initial={false}
                              animate={
                                reduce
                                  ? { opacity: isSelected ? 1 : 0 }
                                  : { clipPath: isSelected ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }
                              }
                              transition={{ duration: reduce ? 0.15 : 0.3, ease: EASE_OUT }}
                            />
                            <span className="relative">{option}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {wantsPhoto && (
                    <PhotoConsent
                      className="mt-6"
                      onPhoto={onPhoto}
                      onCancel={() => {
                        const next = { ...answers };
                        delete next[current.id];
                        setAnswers(next);
                        draftAnswers.set(next);
                      }}
                    />
                  )}
                </m.div>
              </AnimatePresence>

              <p className="meta mt-6 hidden [@media(pointer:fine)]:block">
                Keys A to {LETTERS[current.options.length - 1]} answer. Backspace goes back.
              </p>
            </div>

            <div className="hidden lg:col-span-4 lg:block">
              <AnswerFile answers={answers} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
