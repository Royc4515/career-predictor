// sessionStorage can throw (Safari private mode, storage disabled, quota),
// and stored JSON can be stale or hand-edited. Every read and write goes
// through these helpers so a storage problem degrades to "nothing saved"
// instead of a blank page.

const KEYS = {
  answers: 'cp:answers',
  result: 'cp:result',
};

function read(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null || value === undefined) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the flow still works, it just won't survive a reload.
  }
}

export const draftAnswers = {
  get: () => {
    const value = read(KEYS.answers);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  },
  set: (answers) => write(KEYS.answers, answers),
  clear: () => write(KEYS.answers, null),
};

export const cachedResult = {
  get: () => {
    const value = read(KEYS.result);
    return isResult(value) ? value : null;
  },
  set: (result) => write(KEYS.result, result),
  clear: () => write(KEYS.result, null),
};

/** Shape check for the /api/user payload the result page depends on. */
export function isResult(value) {
  return Boolean(
    value &&
      typeof value.careerTitle === 'string' &&
      value.careerTitle.length > 0 &&
      value.stats &&
      typeof value.stats === 'object',
  );
}
