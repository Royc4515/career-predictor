import { m } from 'motion/react';
import { EASE_OUT } from '../lib/motion';

/**
 * Headline that rises word by word from behind a mask, like type being set.
 * Used once, for the landing page's load sequence. Screen readers get the
 * sentence once via aria-label; the animated spans are hidden from them.
 * Reduced motion is handled by MotionConfig in App.jsx (fade only).
 */
export default function RevealText({ text, as: Tag = 'h1', className = '', delay = 0, stagger = 0.035 }) {
  const words = text.split(' ');

  return (
    <Tag className={className} aria-label={text}>
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
            {word}
          </m.span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </Tag>
  );
}
