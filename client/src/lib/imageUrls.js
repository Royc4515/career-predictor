// Image URLs served by our own API. These follow the polling contract (404 +
// Retry-After while generating, 410 once a personal portrait has failed) and
// are safe to load with crossOrigin="anonymous" for the canvas export and the
// WebGL press reveal. Anything else is a legacy third-party URL from before
// the image service and is loaded plainly.
export function isOwnImageUrl(url) {
  return typeof url === 'string' && (url.includes('/api/image/') || url.includes('/api/user/portrait/image/'));
}
