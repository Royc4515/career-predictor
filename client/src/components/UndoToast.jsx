import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n/LangContext';
import { pendingDeletes, UNDO_MS } from '../lib/pendingDeletes';

/**
 * Remove now, delete in a few seconds: the thing leaves the page at once and
 * a bar offers "Undo" until the delete is sent (lib/pendingDeletes). This
 * replaced the "Keep it / Remove" question, which cost a tap every time and
 * still could not bring back a photo removed by mistake.
 *
 * remove(key, { message, commit, restore, onError }):
 *   commit(opts) sends the delete; restore() puts the thing back (on Undo,
 *   or if the delete fails, before onError(err)).
 * Leaving the page sends whatever is still waiting.
 */
export function useUndoableRemove() {
  const [toast, setToast] = useState(null); // { key, message, restore }
  const hideTimer = useRef(null);

  useEffect(() => {
    // The tab going to the background sends waiting deletes at once
    // (pendingDeletes), so an Undo offered after that would do nothing.
    const onHide = () => document.visibilityState === 'hidden' && setToast(null);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      clearTimeout(hideTimer.current);
      pendingDeletes.flush();
    };
  }, []);

  const remove = useCallback((key, { message, commit, restore, onError }) => {
    pendingDeletes.schedule(key, commit, {
      onError: (err) => {
        restore();
        onError?.(err);
      },
    });
    setToast({ key, message, restore });
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setToast((t) => (t?.key === key ? null : t)), UNDO_MS);
  }, []);

  const undo = useCallback(() => {
    setToast((t) => {
      if (t && pendingDeletes.undo(t.key)) t.restore();
      return null;
    });
    clearTimeout(hideTimer.current);
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  return { remove, dismiss, toast: toast && <UndoToast message={toast.message} onUndo={undo} /> };
}

function UndoToast({ message, onUndo }) {
  const { copy } = useLang();
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-[28rem] items-center justify-between gap-4 bg-ink px-4 py-2 text-paper shadow-lg"
    >
      <span className="text-[0.95rem]">{message}</span>
      <button type="button" onClick={onUndo} className="tap min-h-[44px] px-2 font-sans font-semibold underline underline-offset-4">
        {copy.common.undo}
      </button>
    </div>
  );
}
