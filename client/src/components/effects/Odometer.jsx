import { m, useReducedMotion } from 'motion/react';
import { EASE_OUT } from '../../lib/motion';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Mechanical counter: each digit is a wheel that rolls to its value, the
 * right-hand wheel last, like a meter settling. Screen readers get the plain
 * number once.
 */
export default function Odometer({ value, delay = 0, className = '' }) {
  const reduce = useReducedMotion();
  const text = String(Math.max(0, Math.round(Number(value) || 0)));

  return (
    <span className={`inline-flex ${className}`}>
      <span className="sr-only">{text}</span>
      {[...text].map((ch, i) => {
        const n = Number(ch);
        return (
          <span key={i} aria-hidden="true" className="relative inline-block h-[1em] overflow-hidden leading-none">
            <span className="invisible">0</span>
            <m.span
              className="absolute inset-x-0 top-0 flex flex-col"
              initial={reduce ? false : { transform: 'translateY(0%)' }}
              animate={{ transform: `translateY(-${n * 10}%)` }}
              transition={{ duration: 1.4 + i * 0.25, ease: EASE_OUT, delay }}
            >
              {DIGITS.map((d) => (
                <span key={d} className="block h-[1em] text-center">
                  {d}
                </span>
              ))}
            </m.span>
          </span>
        );
      })}
    </span>
  );
}
