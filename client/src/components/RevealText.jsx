import { useRef } from 'react';
import { m } from 'motion/react';
import { EASE_OUT } from '../lib/motion';
import { useProximityWeight } from '../hooks/useProximityWeight';

/**
 * Headline that rises word by word from behind a mask, like type being set.
 * With `proximity`, its letters also respond to the pointer (see
 * useProximityWeight). Screen readers get the sentence once via aria-label;
 * the animated spans are hidden from them. Reduced motion is handled by
 * MotionConfig in App.jsx (fade only) and by the hook (off).
 */
export default function RevealText({
  text,
  as: Tag = 'h1',
  className = '',
  delay = 0,
  stagger = 0.035,
  proximity = false,
}) {
  const ref = useRef(null);
  useProximityWeight(ref, proximity);
  const words = text.split(' ');

  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          aria-hidden="true"
          className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom"
        >
          <m.span
            className="inline-block"
            initial={{ transform: 'translateY(105%)' }}
            animate={{ transform: 'translateY(0%)' }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: delay + i * stagger }}
          >
            {proximity
              ? [...word].map((ch, j) => (
                  <span key={j} data-char className="inline-block">
                    {ch}
                  </span>
                ))
              : word}
          </m.span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </Tag>
  );
}
