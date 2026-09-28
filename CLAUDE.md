# CLAUDE.md - CareerPredict AI

## What this is
A satirical 5-question career quiz web app: a Google-signed-in user gets a deterministic joke career title, fake stats and an AI-generated portrait; the audience is TODO(Roy): who is this for (portfolio showcase, friends, LinkedIn audience)?

Not an ML project. The "prediction" is a hand-written rule table (`mapCareer` in `server/routes/userRoutes.js`); the only real AI is the text-to-image call.

## Stack & layout
- `client/` - React 19, Vite 6, Tailwind 4, React Router 7. Pages: Landing, Onboarding (quiz), Loading, Result. Dev server on :3000 proxies `/auth` and `/api` to :5000 (`client/vite.config.js`).
- `server/` - Express 4 monolith (CommonJS), Passport Google OAuth, express-session (memory store), SQLite via sql.js.
  - `index.js` - entry; waits for `initDB()`, then mounts routes and serves `client/dist` with an SPA catch-all.
  - `db.js` - schema, additive `ALTER TABLE` migrations, whole-DB `saveDB()` to `server/career-predictor.db`.
  - `routes/userRoutes.js` - `mapCareer` rule table + `/api/user/onboarding` and `/api/user/result`.
  - `routes/imageRoutes.js` - `GET /api/image/:id` (16-hex id; 404 + `Retry-After: 8` while generating).
  - `services/image/` - `ImageService` orchestrator (sync `kickoff`, in-flight dedup, fallback cascade), `promptBuilder` (seed, SDXL/FLUX dialects, content-hash id), `providers/` (realvisxl, cloudflare, huggingface_flux, together, pollinations), `storage/` (disk, r2), `__tests__/`.
- `docs/image-service-spec.md` - contract the image pipeline and its tests satisfy.
- `.github/workflows/test.yml` (server tests on push/PR), `keep-alive.yml` (pings Render every 14 min).
- Deploy: Render single service, https://career-predictor-cnvg.onrender.com

## Commands
- Server tests: `cd server && npm test` (node:test, no deps needed) - verified, 51/51 pass on Node 22.
- Server dev: `cd server && npm install && npm run dev` (nodemon, :5000) - unverified.
- Client dev: `cd client && npm install && npm run dev` (:3000) - unverified.
- Prod build: `npm run build` at root (installs both, builds client) - unverified.
- Prod start: `npm start` at root (`node server/index.js`) - unverified.
- Config: copy `server/.env.example` to `server/.env`. Default image chain is `pollinations` (keyless).

## Conventions (Roy's standing rules)
- Comments explain WHY, not what.
- Flag counterintuitive, load-bearing or past-bug-hiding lines with `// don't touch / <reason>`.
- Edge cases and input validation are priorities; prefer clean OOP, good naming, reuse.
- No em dashes in any user-facing text or docs; use a plain hyphen.
- Secrets only via environment variables, never committed.
- New image provider or store = one new file + one factory entry in `providers/index.js` or `storage/index.js`, plus a test in `__tests__/`. Do not touch the route or orchestrator for that.
- `kickoff()` must stay synchronous (no `await` before return); spec section 2 and `imageService.test.js` enforce it.

## Gotchas
- README "Local Setup" says `npm install && ... npm run dev` at root, but root `package.json` has no `dev` script and no deps. Run server and client separately (see Commands).
- Quiz mapping is string-coupled: `mapCareer` matches substrings of the literal option text in `client/src/pages/Onboarding.jsx` (e.g. `'social construct'`, `'people who know'`). Editing option copy silently changes results. Server does not validate answers against the allowed options.
- `getImageService()` runs inside `initDB().then(...)` in `server/index.js`. A provider missing its key throws at startup and is logged as "Failed to initialize database" - misleading.
- `LocalDiskStore` default dir and `IMAGE_CACHE_DIR=./data/image-cache` resolve against `process.cwd()`. Root `npm start` writes to `<repo>/data/`, which `.gitignore` does not cover (only `server/data/`).
- Persistence: Render free-tier disk is wiped on redeploy (per `.env.example`), so SQLite DB and disk image cache are lost; README "Why This Stack" claims data survives. Sessions use the in-memory store and die on every restart. Use `IMAGE_STORE=r2` for durable images.
- `SESSION_SECRET` falls back to a hardcoded dev string in `server/index.js` if unset. Set it in every deployed env.
- `POST /api/user/onboarding` is async with no try/catch; a throw from `saveOnboarding` (Express 4) leaves the request hanging.
- `db.js` migrations rely on `ALTER TABLE` throwing when the column exists; errors are swallowed. `saveDB()` rewrites the whole DB file synchronously on every write.
- `auth.js` reads `profile.emails[0].value` unguarded; `/auth/me` returns the full user row incl. `google_id`.
- README lists `GOOGLE_CALLBACK_URL`, but code builds the callback from `SERVER_URL` + `/auth/google/callback`; the var is unused.
- `keep-alive.yml` pings `/auth/me`, which returns 401 when logged out, so it always logs "Unexpected status" (non-fatal).
- Client image retry is 5 x 8s (`client/src/pages/Result.jsx`); the inline comment there says 5s.
- `docs/image-service-spec.md` links to a `.claude/plans/...` file outside the repo (dead link).
- No client tests; CI runs server tests only.
