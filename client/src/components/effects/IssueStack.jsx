import { useRef } from 'react';
import { m, useReducedMotion, useScroll, useTransform } from 'motion/react';
import Cover from '../Cover';
import { useImageReady } from '../../hooks/useImageReady';

const COUNT = 5;

function StackedCover({ sample, index, progress, reduce }) {
  const status = useImageReady(sample.imageUrl);
  const offset = index - (COUNT - 1) / 2; // -2 .. 2
  // Stacked like a pile of back issues, then fanned out across the table.
  const x = useTransform(progress, [0, 1], ['0%', `${offset * 78}%`]);
  const y = useTransform(progress, [0, 1], [`${index * -1.2}%`, `${Math.abs(offset) * 7}%`]);
  const rotate = useTransform(progress, [0, 1], [offset * 2.5, offset * 9]);

  const style = reduce
    ? { transform: `translateX(${offset * 78}%) translateY(${Math.abs(offset) * 7}%) rotate(${offset * 9}deg)` }
    : { x, y, rotate };

  return (
    <m.div
      className="absolute inset-0 origin-bottom"
      style={{ ...style, zIndex: COUNT - Math.abs(Math.round(offset)) }}
    >
      <Cover title={sample.title} imageUrl={sample.imageUrl} imageStatus={status} specimen />
    </m.div>
  );
}

/**
 * Scroll-driven: a pile of back issues fans out as the section passes, each a
 * real headline from the table. Pinned with position: sticky, so scrolling is
 * never hijacked; reduced motion shows the fanned state without movement.
 */
export default function IssueStack({ samples }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const progress = useTransform(scrollYProgress, [0.08, 0.7], [0, 1], { clamp: true });
  const shown = samples.slice(0, COUNT);

  return (
    <section ref={ref} aria-labelledby="issues-heading" className={reduce ? '' : 'h-[220vh]'}>
      <div
        className={`${reduce ? '' : 'sticky top-0 h-dvh'} flex flex-col items-center justify-center overflow-hidden px-4 py-16`}
      >
        <h2 id="issues-heading" className="font-display text-section text-center text-balance">
          Back issues
        </h2>
        <p className="text-body mt-3 max-w-[30rem] text-center">
          Every headline here is a real outcome from the table. Yours is in there somewhere.
        </p>
        <div className="relative mt-12 aspect-[4/5] w-[min(56vw,250px)] sm:w-[min(24vw,270px)]">
          {shown.map((sample, i) => (
            <StackedCover key={sample.title} sample={sample} index={i} progress={progress} reduce={reduce} />
          ))}
        </div>
      </div>
    </section>
  );
}
