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

/**
 * How "Take a selfie" works here: 'native' on a touch device, where an
 * <input capture="user"> opens the front camera with the phone's own UI
 * (better than anything a page can draw); 'live' on a computer with a
 * camera API, which gets an in-page viewfinder; null when neither exists
 * (or the page is not on https, where browsers withhold the camera).
 */
export function cameraMode() {
  try {
    if (window.matchMedia('(pointer: coarse)').matches) return 'native';
    if (window.isSecureContext && navigator.mediaDevices?.getUserMedia) return 'live';
  } catch {
    // An exotic browser without matchMedia: offer the file picker only.
  }
  return null;
}
