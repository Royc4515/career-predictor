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
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`);
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
