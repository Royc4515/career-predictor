import { useRef, useSyncExternalStore } from 'react';
import { m, useReducedMotion, useScroll, useTransform } from 'motion/react';
import Cover from '../Cover';
import { useImageReady } from '../../hooks/useImageReady';
import { useLang } from '../../i18n/LangContext';
import { careerTitle } from '../../i18n/content';

const COUNT = 5;

// How far the pile fans out, per step away from the centre cover: x as a
// share of cover width, y as a share of height, rotation in degrees. Desktop
// has the width to spread across the table. On a phone the same spread put
// the outer covers off screen and sliced the inner ones at the edge, so it
// fans like a hand of cards and stays inside the page margins.
const FAN_WIDE = { x: 78, y: 7, rotate: 9 };
const FAN_NARROW = { x: 16, y: 3, rotate: 4 };
const WIDE_QUERY = '(min-width: 640px)';

function subscribeWide(onChange) {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
const isWide = () => window.matchMedia(WIDE_QUERY).matches;

function StackedCover({ sample, index, progress, reduce, fan }) {
  const status = useImageReady(sample.imageUrl);
  const { lang } = useLang();
  const offset = index - (COUNT - 1) / 2; // -2 .. 2
  // Stacked like a pile of back issues, then fanned out across the table.
  const x = useTransform(progress, [0, 1], ['0%', `${offset * fan.x}%`]);
  const y = useTransform(progress, [0, 1], [`${index * -1.2}%`, `${Math.abs(offset) * fan.y}%`]);
  const rotate = useTransform(progress, [0, 1], [offset * 2.5, offset * fan.rotate]);

  const style = reduce
    ? {
        transform: `translateX(${offset * fan.x}%) translateY(${Math.abs(offset) * fan.y}%) rotate(${offset * fan.rotate}deg)`,
      }
    : { x, y, rotate };

  return (
    <m.div
      className="absolute inset-0 origin-bottom"
      style={{ ...style, zIndex: COUNT - Math.abs(Math.round(offset)) }}
    >
      <Cover title={careerTitle(lang, sample.title)} imageUrl={sample.imageUrl} imageStatus={status} specimen />
    </m.div>
  );
}

/**
 * Scroll-driven: a pile of back issues fans out as the section passes, each a
 * real headline from the table. Pinned with position: sticky, so scrolling is
 * never hijacked; reduced motion shows the fanned state without movement.
 */
// The section's height is the scroll distance the fan plays over: 160vh pins
// it for about half a screen of scrolling. 220vh read as dead scroll on a
// phone, where it was a third of the landing page.
export default function IssueStack({ samples }) {
  const { copy } = useLang();
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const progress = useTransform(scrollYProgress, [0.08, 0.7], [0, 1], { clamp: true });
  const shown = samples.slice(0, COUNT);
  const fan = useSyncExternalStore(subscribeWide, isWide, () => true) ? FAN_WIDE : FAN_NARROW;

  return (
    <section ref={ref} aria-labelledby="issues-heading" className={reduce ? '' : 'h-[160vh]'}>
      <div
        className={`${reduce ? '' : 'sticky top-0 h-dvh'} flex flex-col items-center justify-center overflow-hidden px-4 py-10 sm:py-16`}
      >
        <h2 id="issues-heading" className="font-display text-section text-center text-balance">
          {copy.landing.stackHeading}
        </h2>
        <p className="text-body mt-3 max-w-[30rem] text-center">{copy.landing.stackBody}</p>
        <div className="relative mt-8 aspect-[4/5] sm:mt-12 w-[min(46vw,220px)] sm:w-[min(24vw,270px)]">
          {shown.map((sample, i) => (
            // Keyed on the fan too: useTransform's scroll subscription keeps the
            // ranges it started with, so a breakpoint change remounts instead.
            <StackedCover
              key={`${sample.title}-${fan.x}`}
              sample={sample}
              index={i}
              progress={progress}
              reduce={reduce}
              fan={fan}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
