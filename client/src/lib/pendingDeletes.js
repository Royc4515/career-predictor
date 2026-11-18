/**
 * Deletes that wait a few seconds before they reach the server, so "Undo"
 * can take them back. Removing an issue or a photo is final on the server
 * (no soft delete, nothing to restore from), so the grace period lives here.
 *
 * Every delete still happens: when the timer runs out, when the page that
 * scheduled it goes away (flush), and when the tab is closed or hidden
 * (pagehide / visibilitychange, sent with keepalive so the request outlives
 * the page). A reader who removes their face and closes the tab at once has
 * still removed it.
 */
export const UNDO_MS = 8000;

export function createDeleteQueue({ setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const pending = new Map(); // key -> { timer, commit, onError }

  function run(key, opts) {
    const job = pending.get(key);
    if (!job) return Promise.resolve();
    pending.delete(key);
    clearTimer(job.timer);
    return Promise.resolve()
      .then(() => job.commit(opts))
      .catch((err) => job.onError?.(err));
  }

  return {
    /**
     * commit(opts) sends the delete; opts.keepalive is set when the page is
     * going away. onError(err) runs if it fails, so the caller can put the
     * thing back. A second schedule for the same key sends the first now.
     */
    schedule(key, commit, { ms = UNDO_MS, onError } = {}) {
      if (pending.has(key)) run(key);
      const timer = setTimer(() => run(key), ms);
      pending.set(key, { timer, commit, onError });
    },
    /** Take a delete back. False if it already went (or never was). */
    undo(key) {
      const job = pending.get(key);
      if (!job) return false;
      clearTimer(job.timer);
      pending.delete(key);
      return true;
    },
    /** Send every waiting delete now; resolves when all have answered. */
    flush(opts) {
      return Promise.all([...pending.keys()].map((key) => run(key, opts)));
    },
    has: (key) => pending.has(key),
    get size() {
      return pending.size;
    },
  };
}

export const pendingDeletes = createDeleteQueue();

if (typeof window !== 'undefined') {
  const leave = () => pendingDeletes.flush({ keepalive: true });
  window.addEventListener('pagehide', leave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') leave();
  });
}
