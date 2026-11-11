import { useCallback, useEffect, useRef, useState } from 'react';
import { m, useInView, useReducedMotion } from 'motion/react';
import Cover from './Cover';
import { useImageReady } from '../hooks/useImageReady';
import { useLang } from '../i18n/LangContext';
import { careerTitle } from '../i18n/content';
import { EASE_OUT } from '../lib/motion';

// Centre focus: how far the covers beside the middle one turn and recede.
// Scale stays at or under 1 so nothing grows out of the scroller's box.
const TILT_DEG = 16;
const SHRINK = 0.08;
const DIM = 0.28;
// Off the press: a few covers print at once, each starting a beat after the
// last, so a row on screen comes off the press as a cascade in a few
// seconds rather than one by one (each press is ~3 s).
const MAX_PRESSES = 2;
const PRESS_STAGGER_MS = 260;

function RackCover({ sample, index, reduce, scroller, focusRef, pressing, onWantTurn, onPressed }) {
  const { lang } = useLang();
  const status = useImageReady(sample.imageUrl);
  const cardRef = useRef(null);
  // Mostly on screen inside the rack, not just somewhere on the page.
  const inView = useInView(cardRef, { root: scroller, amount: 0.6 });
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (inView && status === 'ready' && !pressed) onWantTurn(index);
  }, [inView, status, pressed, index, onWantTurn]);

  return (
    <m.li
      ref={cardRef}
      className="w-[64vw] max-w-[248px] shrink-0 snap-center sm:w-[220px] sm:snap-start lg:w-[232px]"
      // Settles onto the shelf once as the rack scrolls into view.
      initial={reduce ? false : { opacity: 0, transform: 'translateY(14px)' }}
      whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, ease: EASE_OUT, delay: Math.min(index, 4) * 0.06 }}
    >
      {/* The focus transform lives on this wrapper; the li's own transform
          belongs to the entrance. */}
      <div ref={focusRef} className="origin-bottom will-change-transform">
        <Cover
          title={careerTitle(lang, sample.title)}
          imageUrl={sample.imageUrl}
          imageStatus={status}
          specimen
          deck=""
          lazy
          reveal="press"
          pressReady={pressing}
          pressPace={0.6}
          onRevealed={() => {
            if (pressed) return;
            setPressed(true);
            onPressed(index);
          }}
        />
      </div>
    </m.li>
  );
}

/**
 * "Back issues" on the landing page: real headlines from the table, standing
 * side by side like a newsstand rack. Every cover is readable, a phone swipes
 * through them (the next one peeks in at the edge), and the page scrolls
 * normally. It replaced a scroll-pinned fan in which only the front cover
 * could be read.
 *
 * Two effects give it its moment, both off under reduced motion:
 * - Centre focus: the cover in the middle stands straight and lit; its
 *   neighbours turn toward it, recede and dim, and each straightens as it
 *   is swiped into the middle. Driven from the scroll position per frame,
 *   written straight to the wrappers' style (no React render per frame).
 * - Off the press: the first time a cover is in view it is printed as CMYK
 *   halftone that tightens into the photograph (the hero's press effect).
 *   A few at a time (MAX_PRESSES), staggered, in the order they come into
 *   view, so the WebGL canvases stay few; a cover waiting its turn glows
 *   in the darkroom.
 */
export default function IssueRack({ samples }) {
  const { copy } = useLang();
  const t = copy.landing;
  const reduce = useReducedMotion();
  const scroller = useRef(null);
  const focusRefs = useRef([]);
  const frame = useRef(0);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  // --- the press queue: up to MAX_PRESSES at once, staggered ---
  const [active, setActive] = useState([]);
  const activeRef = useRef([]);
  const queue = useRef([]);
  const done = useRef(new Set());
  const lastStart = useRef(0);
  const pumpTimer = useRef(0);
  const pump = useCallback(() => {
    clearTimeout(pumpTimer.current);
    if (!queue.current.length || activeRef.current.length >= MAX_PRESSES) return;
    const wait = lastStart.current + PRESS_STAGGER_MS - performance.now();
    if (wait > 0) {
      pumpTimer.current = setTimeout(pump, wait);
      return;
    }
    const next = queue.current.shift();
    lastStart.current = performance.now();
    activeRef.current = [...activeRef.current, next];
    setActive(activeRef.current);
    pump();
  }, []);
  const onWantTurn = useCallback(
    (i) => {
      if (done.current.has(i) || queue.current.includes(i) || activeRef.current.includes(i)) return;
      queue.current.push(i);
      pump();
    },
    [pump],
  );
  const onPressed = useCallback(
    (i) => {
      done.current.add(i);
      queue.current = queue.current.filter((x) => x !== i);
      activeRef.current = activeRef.current.filter((x) => x !== i);
      setActive(activeRef.current);
      pump();
    },
    [pump],
  );
  useEffect(() => () => clearTimeout(pumpTimer.current), []);

  // --- centre focus ---
  const focus = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const middle = box.left + box.width / 2;
    for (const node of focusRefs.current) {
      if (!node) continue;
      if (reduce) {
        node.style.transform = '';
        node.style.filter = '';
        continue;
      }
      const r = node.getBoundingClientRect();
      // Distance from the middle, in card widths, signed (+ to the right).
      const d = Math.max(-1.5, Math.min(1.5, (r.left + r.width / 2 - middle) / r.width));
      const k = Math.min(Math.abs(d), 1);
      node.style.transform = `perspective(900px) rotateY(${(-d * TILT_DEG).toFixed(2)}deg) scale(${(1 - k * SHRINK).toFixed(3)})`;
      node.style.filter = k > 0.02 ? `brightness(${(1 - k * DIM).toFixed(3)})` : '';
    }
  }, [reduce]);

  // scrollLeft runs negative in a right-to-left page, so compare magnitudes.
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);
    setEdges({ atStart: pos < 4, atEnd: pos > max - 4 });
  }, []);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      focus();
      measure();
    });
  }, [focus, measure]);

  useEffect(() => {
    onScroll();
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame.current);
    };
  }, [onScroll, samples.length]);

  // One press moves most of a screen; "forward" follows reading direction.
  function page(forward) {
    const el = scroller.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const step = el.clientWidth * 0.8 * (forward ? 1 : -1) * (rtl ? -1 : 1);
    el.scrollBy({ left: step, behavior: reduce ? 'auto' : 'smooth' });
  }

  const arrow = 'grid size-11 place-items-center border border-ink text-ink transition-opacity disabled:opacity-25';

  return (
    <section aria-labelledby="issues-heading" className="mx-auto max-w-[1240px] border-t border-ink py-10 sm:py-16">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 id="issues-heading" className="font-display text-section text-balance">
            {t.stackHeading}
          </h2>
          <p className="text-body mt-3 max-w-[30rem]">{t.stackBody}</p>
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            className={arrow}
            onClick={() => page(false)}
            disabled={edges.atStart}
            aria-label={t.rackPrev}
          >
            <span aria-hidden="true" className="rtl:-scale-x-100">
              ←
            </span>
          </button>
          <button
            type="button"
            className={arrow}
            onClick={() => page(true)}
            disabled={edges.atEnd}
            aria-label={t.rackNext}
          >
            <span aria-hidden="true" className="rtl:-scale-x-100">
              →
            </span>
          </button>
        </div>
      </div>

      {/* A focusable region so a keyboard can scroll it (arrow keys) and a
          screen reader can name it. Full-bleed on a phone so covers slide
          out past the page margin instead of being cut at it. */}
      <div
        ref={scroller}
        onScroll={onScroll}
        role="region"
        aria-label={t.rackLabel}
        tabIndex={0}
        className="rack -mx-4 mt-8 snap-x snap-mandatory overflow-x-auto scroll-px-4 px-4 pt-2 pb-5 sm:mx-0 sm:mt-10 sm:scroll-px-0 sm:px-0"
      >
        <ul className="flex gap-4 sm:gap-6">
          {samples.map((sample, i) => (
            <RackCover
              key={sample.title}
              sample={sample}
              index={i}
              reduce={reduce}
              scroller={scroller}
              focusRef={(node) => (focusRefs.current[i] = node)}
              pressing={active.includes(i)}
              onWantTurn={onWantTurn}
              onPressed={onPressed}
            />
          ))}
        </ul>
      </div>
      {/* The shelf the issues stand on. */}
      <div aria-hidden="true" className="-mx-4 h-[3px] bg-ink sm:mx-0" />
    </section>
  );
}
