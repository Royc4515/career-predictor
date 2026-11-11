import { API_URL } from '../config';

// Every server call goes through here so credentials, JSON handling and error
// shape are decided once. Pages never call fetch() for the API directly.

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
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
      headers: { 'Content-Type': photo.type || 'image/jpeg', 'X-Portrait-Consent': 'yes' },
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
