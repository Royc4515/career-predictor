# Keeping the Render free service awake

Render's free tier sleeps a service after about 15 minutes without inbound HTTP traffic, and the next visitor waits roughly a minute for the cold start. Three independent layers prevent that:

1. **Self-ping** (`server/keepAlive.js`). Once awake, the server requests its own public `/api/health` every 10 minutes (uses `RENDER_EXTERNAL_URL`, set by Render; production only). Opt out with `KEEP_ALIVE_DISABLED=true`, override the target with `KEEP_ALIVE_URL`. It cannot wake a sleeping service, which is why the other layers exist.
2. **GitHub Actions** (`.github/workflows/keep-alive.yml`). Every 10 minutes, retries through a cold start, and fails loudly (red run) if the site never answers 200. Caveats: GitHub cron can run late, and GitHub disables scheduled workflows after 60 days with no repo activity; re-enable it in the Actions tab if that happens.
3. **External monitor (owner step, recommended).** Free and independent of GitHub: create an HTTP monitor at UptimeRobot (or cron-job.org) for `https://career-predictor-cnvg.onrender.com/api/health` with a 5-minute interval. It also emails you when the site is down.

Note: a free instance has 750 hours a month, and one always-on service uses 744, so staying awake all month fits in the budget as long as it is the only free service on the account.
