import { m, useReducedMotion } from 'motion/react';

/**
 * HR rubber stamp. Slams down once (oversized and lifted, then a hard,
 * slightly rotated landing), with rough ink edges from an SVG displacement
 * filter so it reads as ink on paper, not a UI badge.
 * `play` false renders it already stamped (repeat visits, reduced motion).
 */
export default function Stamp({ play = true, date, className = '' }) {
  const reduce = useReducedMotion();
  const animate = play && !reduce;

  return (
    <m.div
      aria-label="Stamped: approved, not career advice"
      role="img"
      className={`pointer-events-none select-none ${className}`}
      initial={animate ? { opacity: 0, scale: 2.4, rotate: -2 } : false}
      animate={{ opacity: 0.88, scale: 1, rotate: -11 }}
      transition={animate ? { type: 'spring', stiffness: 520, damping: 26, mass: 0.9 } : { duration: 0 }}
      // Normal blending on purpose: multiply vanishes over the dark cover.
      style={{ filter: 'url(#stamp-ink)' }}
    >
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <filter id="stamp-ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" />
        </filter>
      </svg>
      <div className="rounded-[10px] border-[3px] border-[#c4261a] bg-paper/85 p-[3px] text-[#c4261a] shadow-[0_6px_18px_-8px_rgba(19,32,58,.45)]">
        <div className="rounded-[7px] border border-[#b42318] px-4 py-2 text-center">
          <p className="font-sans text-[1.9rem] leading-none font-extrabold tracking-[0.06em]">APPROVED</p>
          <p className="mt-1 font-sans text-[0.68rem] font-semibold tracking-[0.12em]">NOT CAREER ADVICE</p>
          {date && <p className="tabular mt-0.5 font-sans text-[0.62rem] font-semibold">{date}</p>}
        </div>
      </div>
    </m.div>
  );
}
