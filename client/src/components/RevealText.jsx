import { m, useReducedMotion } from 'motion/react';

/**
 * Headline that rises line by line from behind a mask, like type being set.
 * Used once, for the landing page's load sequence. Screen readers get the
 * sentence once via aria-label; the animated spans are hidden from them.
 */
export default function RevealText({ text, as: Tag = 'h1', className = '', delay = 0, stagger = 0.04 }) {
  const reduce = useReducedMotion();
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
            initial={reduce ? false : { y: '105%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: delay + i * stagger }}
          >
            {word}
          </m.span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </Tag>
  );
}
