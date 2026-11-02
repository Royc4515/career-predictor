// React Router 7.13 calls document.startViewTransition without transition
// types, so the direction of travel is put on <html> for the CSS in
// index.css to read. 'forward' and 'back' slide; anything else crossfades.

export function setNavDirection(direction) {
  try {
    if (direction) document.documentElement.dataset.nav = direction;
    else delete document.documentElement.dataset.nav;
  } catch {
    // No DOM (tests): nothing to animate anyway.
  }
}

if (typeof window !== 'undefined') {
  // Browser back and forward both arrive here; reading them as 'back' is the
  // accepted trade-off, since popstate does not say which way it went.
  window.addEventListener('popstate', () => setNavDirection('back'));
}
