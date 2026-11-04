/**
 * Self keep-alive: Render's free tier spins a service down after ~15 minutes
 * without inbound HTTP traffic. A request to our own PUBLIC url counts as
 * inbound traffic (it leaves and re-enters through Render's router), a
 * request to localhost does not.
 *
 * This is the second layer: it cannot wake a sleeping service (the process is
 * gone), so the GitHub workflow and an external pinger still matter. It makes
 * sure that once awake, the service never goes idle between their pings.
 */

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Resolves the public URL to ping, or null when self-pinging makes no sense.
 * Only runs in production: pinging from a dev machine would just be noise.
 * RENDER_EXTERNAL_URL is injected by Render; KEEP_ALIVE_URL is an override.
 */
function resolveKeepAliveUrl(env = process.env) {
  if (env.KEEP_ALIVE_DISABLED === 'true') return null;
  if (env.NODE_ENV !== 'production') return null;
  const base = env.KEEP_ALIVE_URL || env.RENDER_EXTERNAL_URL;
  if (!base) return null;
  try {
    const url = new URL('/api/health', base);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null; // malformed env var must not crash startup
  }
}

/**
 * Starts the ping loop; returns a stop function (or null if disabled).
 * `fetchImpl` is injectable for tests.
 */
function startKeepAlive({
  env = process.env,
  fetchImpl = globalThis.fetch,
  intervalMs = DEFAULT_INTERVAL_MS,
  log = console,
} = {}) {
  const url = resolveKeepAliveUrl(env);
  if (!url || typeof fetchImpl !== 'function') return null;

  const ping = async () => {
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) log.warn(`[KEEPALIVE] ${url} answered ${res.status}`);
    } catch (err) {
      // A failed ping is harmless; the next tick or the external pinger retries.
      log.warn(`[KEEPALIVE] ping failed: ${err.message}`);
    }
  };

  const timer = setInterval(ping, intervalMs);
  timer.unref(); // don't touch / must not keep the process alive on shutdown
  log.log(`[KEEPALIVE] pinging ${url} every ${Math.round(intervalMs / 60000)} min`);
  return () => clearInterval(timer);
}

module.exports = { resolveKeepAliveUrl, startKeepAlive, DEFAULT_INTERVAL_MS };
