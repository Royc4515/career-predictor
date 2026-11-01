import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';

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
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <AnimatePresence>
        {message && (
          <m.p
            key={message}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
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
