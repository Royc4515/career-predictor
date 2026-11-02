import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { EASE_OUT } from '../lib/motion';

/**
 * Small status notice, announced politely to screen readers. Replaces
 * window.alert(), which blocks the page and can't be styled.
 * Returns [element, show]; render the element once near the page root.
 */
export function useToast(duration = 2600) {
  const [message, setMessage] = useState(null);
  const timer = useRef(null);

  const show = useCallback(
    (text) => {
      clearTimeout(timer.current);
      setMessage(text);
      timer.current = setTimeout(() => setMessage(null), duration);
    },
    [duration],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const element = (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4"
    >
      {/* popLayout: a replacing toast takes the old one's place instead of
          sitting beside it and snapping to centre. */}
      <AnimatePresence mode="popLayout">
        {message && (
          <m.p
            key={message}
            initial={{ opacity: 0, transform: 'translateY(12px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            exit={{ opacity: 0, transform: 'translateY(8px)', transition: { duration: 0.15 } }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="bg-ink px-5 py-3 text-sm text-paper shadow-lg"
          >
            {message}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  );

  return [element, show];
}
