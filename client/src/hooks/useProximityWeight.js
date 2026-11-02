import { useEffect } from 'react';
import { useReducedMotion } from 'motion/react';
import { canHover } from '../lib/capabilities';

const RADIUS = 240; // px from a letter's centre where it starts to respond
const BASE = 400;
const PEAK = 720;

/**
 * Letters inside `ref` marked with [data-char] thicken as the pointer comes
 * near, using Newsreader's weight axis, so the headline reads like type
 * under a loupe. Writes styles directly in one rAF per pointer move: no React
 * re-renders. Off for touch and reduced motion.
 */
export function useProximityWeight(ref, enabled = true) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!enabled || reduce || !root || !canHover()) return undefined;
    const chars = Array.from(root.querySelectorAll('[data-char]'));
    let frame = 0;
    let pointer = null;

    const paint = () => {
      frame = 0;
      for (const el of chars) {
        let weight = BASE;
        if (pointer) {
          const r = el.getBoundingClientRect();
          const d = Math.hypot(pointer.x - (r.left + r.width / 2), pointer.y - (r.top + r.height / 2));
          const t = Math.max(0, 1 - d / RADIUS);
          weight = BASE + (PEAK - BASE) * t * t;
        }
        el.style.fontVariationSettings = `'wght' ${Math.round(weight)}`;
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onMove = (e) => {
      pointer = { x: e.clientX, y: e.clientY };
      schedule();
    };
    const onLeave = () => {
      pointer = null;
      schedule();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      for (const el of chars) el.style.fontVariationSettings = '';
    };
  }, [ref, enabled, reduce]);
}
