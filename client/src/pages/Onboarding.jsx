import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useAuth } from '../app/AuthContext';
import Masthead from '../components/Masthead';
import { QUESTIONS } from '../content';
import { firstName } from '../lib/issue';
import { draftAnswers } from '../lib/storage';

const EASE = [0.22, 1, 0.36, 1];
// Long enough to see the selection land, short enough to feel instant.
const ADVANCE_DELAY_MS = 420;
const LETTERS = ['A', 'B', 'C', 'D'];

function firstUnanswered(answers) {
  const i = QUESTIONS.findIndex((q) => !answers[q.id]);
  return i === -1 ? QUESTIONS.length - 1 : i;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduce = useReducedMotion();

  // Resume where the reader left off (reload, or back from a failed submit).
  const [answers, setAnswers] = useState(() => draftAnswers.get());
  const [step, setStep] = useState(() => firstUnanswered(draftAnswers.get()));
  const [direction, setDirection] = useState(1);
  const [locked, setLocked] = useState(false);
  const optionRefs = useRef([]);
  const keyboardUser = useRef(false);
  const advanceTimer = useRef(null);

  const current = QUESTIONS[step];
  const selected = answers[current.id];
  const answeredCount = QUESTIONS.filter((q) => answers[q.id]).length;

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  const choose = useCallback(
    (option) => {
      if (locked) return;
      const next = { ...answers, [current.id]: option };
      setAnswers(next);
      draftAnswers.set(next);
      setLocked(true);

      advanceTimer.current = setTimeout(() => {
        setLocked(false);
        if (step < QUESTIONS.length - 1) {
          setDirection(1);
          setStep(step + 1);
        } else {
          navigate('/loading', { viewTransition: true });
        }
      }, ADVANCE_DELAY_MS);
    },
    [answers, current.id, locked, navigate, step],
  );

  const goBack = useCallback(() => {
    if (step === 0 || locked) return;
    setDirection(-1);
    setStep(step - 1);
  }, [locked, step]);

  // Keyboard: 1-4 or A-D answer, Backspace goes back. Ignored while a
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

  // Move focus to the chosen (or first) option on each new question so
  // keyboard and screen-reader users land in the right place. Pointer users
  // are left alone: a focus ring on load reads as a pre-selected answer.
  useEffect(() => {
    if (!keyboardUser.current) return undefined;
    const i = Math.max(0, current.options.indexOf(selected));
    const t = setTimeout(() => optionRefs.current[i]?.focus({ preventScroll: true }), reduce ? 0 : 450);
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

      <main id="main" className="flex-1 px-4 pt-8 pb-16 sm:px-8 sm:pt-14">
        <div className="mx-auto max-w-[1240px]">
          <div className="flex items-center justify-between gap-4">
            <p className="meta tabular" aria-live="polite">
              Question {step + 1} of {QUESTIONS.length}
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
            aria-valuemax={QUESTIONS.length}
            aria-valuenow={answeredCount}
          >
            <m.div
              className="h-full origin-left bg-ink"
              initial={false}
              animate={{ scaleX: answeredCount / QUESTIONS.length }}
              transition={{ duration: 0.6, ease: EASE }}
            />
          </div>

          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <m.div
              key={current.id}
              initial={reduce ? false : { opacity: 0, y: 16 * direction }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -10 * direction, transition: { duration: 0.18 } }}
              transition={{ duration: 0.45, ease: EASE }}
              className="mt-12 max-w-[56rem] sm:mt-16"
            >
              <h1 id={`q-${current.id}`} className="font-display text-[clamp(2.2rem,5.2vw,4.4rem)] leading-[1.04]">
                {current.question}
              </h1>
              <div role="radiogroup" aria-labelledby={`q-${current.id}`} className="mt-10 border-t border-ink">
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
                      className="group flex min-h-[68px] w-full items-center gap-5 border-b border-rule py-4 text-left sm:gap-7"
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
                      <span className="font-display relative text-[clamp(1.3rem,2.4vw,1.9rem)] leading-snug">
                        {/* Highlighter stroke drawn left to right when chosen: the
                            motion answers the click and shows what was picked. */}
                        <m.span
                          aria-hidden="true"
                          className="marker absolute -inset-x-[0.2em] inset-y-[0.12em] -z-0 origin-left"
                          initial={false}
                          animate={{ scaleX: isSelected ? 1 : 0, opacity: isSelected ? 1 : 0 }}
                          transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
                        />
                        <span className="relative">{option}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </m.div>
          </AnimatePresence>

          <p className="meta mt-6 hidden [@media(pointer:fine)]:block">Keys A to D answer. Backspace goes back.</p>
        </div>
      </main>
    </div>
  );
}
