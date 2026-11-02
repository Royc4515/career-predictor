import { useRef } from 'react';
import { m, useInView, useReducedMotion } from 'motion/react';

// Lifted and slightly rotated before the hit; landed is the resting state.
const LIFTED = { opacity: 0, scale: 1.4, rotate: -1 };
const LANDED = { opacity: 0.92, scale: 1, rotate: -5 };
const SLAM = { type: 'spring', stiffness: 560, damping: 28, mass: 0.8 };

/**
 * Office rubber stamp on the report, in the page's own ink. It sits beside
 * the filing line, never on the cover: the portrait is the product, and a
 * badge over it hid the face (and, oversized mid-slam, widened the page on
 * phones).
 *
 * ready: the cover is finished, so the stamp may land. It lands when it is
 * scrolled into view, so on a phone, where the report starts below the cover,
 * the slam still happens where the reader can see it.
 * play false renders it already stamped (repeat visits, reduced motion).
 * Space is reserved from the start so landing never shifts the layout.
 */
export default function Stamp({ ready = true, play = true, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const reduce = useReducedMotion();
  const animate = play && !reduce;
  const landed = ready && (inView || !animate);

  return (
    <m.div
      ref={ref}
      role="img"
      aria-label="Stamped: approved, not career advice"
      aria-hidden={ready ? undefined : true}
      className={`pointer-events-none inline-block origin-left select-none ${className}`}
      initial={animate ? LIFTED : false}
      animate={landed ? LANDED : animate ? LIFTED : { ...LANDED, opacity: 0 }}
      transition={animate ? SLAM : { duration: 0 }}
      style={{ filter: 'url(#stamp-ink)' }}
    >
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <filter id="stamp-ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" />
        </filter>
      </svg>
      <div className="border-2 border-ink p-[2px] text-ink">
        <div className="border border-ink px-3 py-1.5 text-center">
          <p className="font-sans text-[1.05rem] leading-none font-extrabold tracking-[0.14em]">APPROVED</p>
          <p className="mt-1 font-sans text-[0.625rem] leading-none font-semibold tracking-[0.14em]">
            NOT CAREER ADVICE
          </p>
        </div>
      </div>
    </m.div>
  );
}
