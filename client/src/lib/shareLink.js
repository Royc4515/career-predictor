// A share link's token is named in the browser, so the share sheet can open
// inside the tap with the link already in it (Safari refuses a share that
// starts after a network wait); the server then files the link under that
// token. Same format and entropy as a server-made one: 9 random bytes,
// base64url, 12 characters (server TOKEN_RE in routes/shareRoutes.js).

const TOKEN_BYTES = 9;
export const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{12}$/;

/** A fresh, unguessable token from the platform's CSPRNG. */
export function newShareToken(cryptoImpl = globalThis.crypto) {
  const bytes = new Uint8Array(TOKEN_BYTES);
  cryptoImpl.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The public page for a token, on this site. */
export function shareUrlFor(token, origin) {
  return `${String(origin).replace(/\/$/, '')}/s/${token}`;
}
