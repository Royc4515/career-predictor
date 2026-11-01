// Feature checks for the effects layer. Every effect asks before it runs and
// falls back to a plain, complete state when the answer is no.

let webgl2;
/** True when a WebGL2 context can be created (memoized; false off-DOM). */
export function supportsWebGL2() {
  if (webgl2 !== undefined) return webgl2;
  try {
    const canvas = document.createElement('canvas');
    webgl2 = Boolean(canvas.getContext('webgl2'));
  } catch {
    webgl2 = false;
  }
  return webgl2;
}

/** A real mouse or trackpad. Pointer effects are pointless on touch. */
export function canHover() {
  try {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  } catch {
    return false;
  }
}
