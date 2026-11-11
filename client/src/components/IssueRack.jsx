import { useCallback, useEffect, useRef, useState } from 'react';
import { m, useReducedMotion } from 'motion/react';
import Cover from './Cover';
import { useImageReady } from '../hooks/useImageReady';
import { useLang } from '../i18n/LangContext';
import { careerTitle } from '../i18n/content';
import { EASE_OUT } from '../lib/motion';

function RackCover({ sample, index, reduce }) {
  const { lang } = useLang();
  const status = useImageReady(sample.imageUrl);
  return (
    <m.li
      className="w-[64vw] max-w-[248px] shrink-0 snap-center sm:w-[220px] sm:snap-start lg:w-[232px]"
      // Settles onto the shelf once, a few at a time, when the rack scrolls
      // into view. Reduced motion: already in place.
      initial={reduce ? false : { opacity: 0, transform: 'translateY(14px)' }}
      whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, ease: EASE_OUT, delay: Math.min(index, 4) * 0.06 }}
    >
      {/* An empty deck: eight copies of "Sample cover" said nothing. */}
      <Cover
        title={careerTitle(lang, sample.title)}
        imageUrl={sample.imageUrl}
        imageStatus={status}
        specimen
        deck=""
        lazy
      />
    </m.li>
  );
}

/**
 * "Back issues" on the landing page: real headlines from the table, standing
 * side by side like a newsstand rack. Every cover is readable at full size,
 * a phone swipes through them (the next one peeks in at the edge), and the
 * page scrolls normally. It replaced a scroll-pinned fan in which only the
 * front cover could be read and half a screen of scrolling went to the
 * animation.
 */
export default function IssueRack({ samples }) {
  const { copy } = useLang();
  const t = copy.landing;
  const reduce = useReducedMotion();
  const scroller = useRef(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  // scrollLeft runs negative in a right-to-left page, so compare magnitudes.
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);
    setEdges({ atStart: pos < 4, atEnd: pos > max - 4 });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, samples.length]);

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
        onScroll={measure}
        role="region"
        aria-label={t.rackLabel}
        tabIndex={0}
        className="rack -mx-4 mt-8 snap-x snap-mandatory overflow-x-auto scroll-px-4 px-4 pb-5 sm:mx-0 sm:mt-10 sm:scroll-px-0 sm:px-0"
      >
        <ul className="flex gap-4 sm:gap-6">
          {samples.map((sample, i) => (
            <RackCover key={sample.title} sample={sample} index={i} reduce={reduce} />
          ))}
        </ul>
      </div>
      {/* The shelf the issues stand on. */}
      <div aria-hidden="true" className="-mx-4 h-[3px] bg-ink sm:mx-0" />
    </section>
  );
}
