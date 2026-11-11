import { API_URL } from '../config';
import { cachedResult } from './storage';

// Every server call goes through here so credentials, JSON handling and error
// shape are decided once. Pages never call fetch() for the API directly.

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, keepalive = false } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      keepalive,
    });
  } catch {
    // Render's free tier cold-starts in ~30s; a dropped request is the most
    // common failure, so the message says what to do about it.
    throw new ApiError(0, 'Could not reach the newsroom. Check your connection and try again.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error || `The newsroom returned an error (${res.status}). Try again in a moment.`,
    );
  }
  return data;
}

export const authUrls = {
  google: `${API_URL}/auth/google`,
  logout: `${API_URL}/auth/logout`,
};

/** Current user, or null when signed out. Never throws for a 401. */
export async function fetchMe() {
  try {
    const data = await request('/auth/me');
    return data?.user ?? null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export function submitAnswers(answers) {
  return request('/api/user/onboarding', { method: 'POST', body: answers });
}

/** Saved result, or null when the user has not finished the quiz yet. */
export async function fetchResult() {
  try {
    return await request('/api/user/result');
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Sample covers for the landing page. Null when unavailable; the page
 *  falls back to text-only specimens, so this never throws. */
export async function fetchSamples() {
  try {
    const data = await request('/api/samples');
    return Array.isArray(data?.samples) ? data.samples : null;
  } catch {
    return null;
  }
}

/**
 * Upload a selfie for a personal portrait. `photo` is the Blob from
 * lib/photo.js. The consent header is only ever sent from the consent screen.
 */
export async function uploadPortrait(photo) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/user/portrait`, {
      method: 'POST',
      credentials: 'include',
      // 'v2' names the consent wording the reader saw (PhotoConsent): the
      // portrait is kept on its back issue until they remove it.
      headers: { 'Content-Type': photo.type || 'image/jpeg', 'X-Portrait-Consent': 'v2' },
      body: photo,
    });
  } catch {
    throw new ApiError(0, 'Could not reach the newsroom. Check your connection and try again.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error || `Upload failed (${res.status}). Try again.`);
  return data.personal;
}

export async function deletePortrait() {
  let res;
  try {
    res = await fetch(`${API_URL}/api/user/portrait`, { method: 'DELETE', credentials: 'include' });
  } catch {
    throw new ApiError(0, 'Could not reach the newsroom. Check your connection and try again.');
  }
  if (!res.ok) throw new ApiError(res.status, 'Could not remove your portrait. Try again.');
}

/** "Your back issues": the user's covers, newest first. */
export async function fetchCovers() {
  const data = await request('/api/user/covers');
  return Array.isArray(data?.covers) ? data.covers : [];
}

export async function deleteCover(id) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/user/covers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'Could not reach the newsroom. Check your connection and try again.');
  }
  if (!res.ok && res.status !== 404) throw new ApiError(res.status, 'Could not remove that issue. Try again.');
}

/** Make a back issue the current result again ("choose your issue"). */
export async function makeCoverCurrent(id) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/user/covers/${encodeURIComponent(id)}/current`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'Could not reach the newsroom. Check your connection and try again.');
  }
  if (!res.ok) throw new ApiError(res.status, 'Could not switch to that issue. Try again.');
  // don't touch / The result page reads its session copy first and only
  // fetches when there is none: without this, it kept showing the issue
  // that was just replaced until the tab was closed.
  cachedResult.clear();
}

/** One back issue in full (cover and report), or null if it is gone. */
export async function fetchCover(id) {
  try {
    return await request(`/api/user/covers/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null;
    throw err;
  }
}

/**
 * Put the reader's own face on a back issue. Same consent wording ('v2', the
 * portrait stays on its issue) and the same photo Blob as uploadPortrait.
 * Returns the personal portrait in the shape PersonalPortrait takes.
 */
export async function uploadCoverPortrait(id, photo) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/user/covers/${encodeURIComponent(id)}/portrait`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': photo.type || 'image/jpeg', 'X-Portrait-Consent': 'v2' },
      body: photo,
    });
  } catch {
    throw new ApiError(0, 'Could not reach the newsroom. Check your connection and try again.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error || `Upload failed (${res.status}). Try again.`);
  return { status: 'generating', imageUrl: data.personalImageUrl };
}

/** Take the reader's face off one back issue. */
export async function deleteCoverPortrait(id) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/user/covers/${encodeURIComponent(id)}/portrait`, {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'Could not reach the newsroom. Check your connection and try again.');
  }
  if (!res.ok && res.status !== 404) throw new ApiError(res.status, 'Could not remove your portrait. Try again.');
}

/**
 * File a public link to the current issue under `token` (lib/shareLink.js;
 * idempotent, so a retry is safe). withFace puts the reader's own portrait
 * on the shared page; lang picks the preview's language.
 * Returns { url, token, withFace }.
 */
export async function createShare({ token, withFace = false, lang = 'en', keepalive = false }) {
  return request('/api/user/share', { method: 'POST', body: { token, withFace, lang }, keepalive });
}

/** Show or hide the reader's own portrait on a link already sent. */
export async function setShareFace(token, withFace) {
  return request(`/api/user/share/${encodeURIComponent(token)}`, { method: 'PATCH', body: { withFace } });
}

/** End a public link. */
export async function stopShare(token) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/user/share/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'Could not reach the newsroom. Check your connection and try again.');
  }
  if (!res.ok && res.status !== 404) throw new ApiError(res.status, 'Could not stop sharing. Try again.');
}

/** A shared issue (public, no sign-in), or null when the link is unknown or ended. */
export async function fetchShare(token) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/share/${encodeURIComponent(token)}`);
  } catch {
    throw new ApiError(0, 'Could not reach the newsroom. Check your connection and try again.');
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(res.status, `The newsroom returned an error (${res.status}). Try again in a moment.`);
  return res.json();
}

/** What this deployment supports. Never throws: unknown means "off". */
export async function fetchFeatures() {
  try {
    const data = await request('/api/features');
    return { personalPortraits: Boolean(data?.personalPortraits) };
  } catch {
    return { personalPortraits: false };
  }
}
