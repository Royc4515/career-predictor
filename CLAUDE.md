# CLAUDE.md - CareerPredict AI

## What this is
A satirical 5-question career quiz web app: a Google-signed-in user gets a deterministic joke career title, fake stats and an AI-generated portrait; the audience is TODO(Roy): who is this for (portfolio showcase, friends, LinkedIn audience)?

Not an ML project. The "prediction" is a hand-written rule table (`mapCareer` in `server/careers.js`); the only real AI is the text-to-image call.

## Stack & layout
- `client/` - React 19, Vite 6, Tailwind 4, React Router 7 (data router, so `viewTransition` works), Motion via `LazyMotion` + `m.*` (strict: a full `motion.*` throws). Dev server on :3000 proxies `/auth` and `/api` to :5000 (`client/vite.config.js`).
  - `src/pages/` Landing, Onboarding (quiz), Loading ("Printing your cover"), Result (cover + report), NotFound. Signed-in pages are lazy routes in `App.jsx`.
  - `src/components/Cover.jsx` + `src/lib/coverCanvas.js` - the magazine cover on screen and as a 1080x1350 PNG; both read proportions from `src/lib/coverLayout.js`, so change sizes there, not in either renderer.
  - `src/lib/api.js` (all server calls), `src/lib/storage.js` (sessionStorage, never throws), `src/hooks/useImageReady.js` (HEAD-polls `/api/image/:id`), `src/content.js` (all copy, quiz options).
  - `src/components/effects/` - the signature effects, each self-contained with a fallback: `HalftoneReveal` (CMYK halftone press reveal, Paper Shaders WebGL2, lazy chunk), `TiltCard` (pointer tilt + gloss), `Stamp` (rubber stamp slam), `Odometer`, `IssueStack` (scroll-driven back-issue fan), `EffectBoundary` (an effect that throws removes itself, never the page). `hooks/useProximityWeight.js` drives the hero's variable-weight letters. CSS-only effects (CMYK misregistration, print head, barcode laser) live in `index.css` under "Print shop effects". Every effect checks `lib/capabilities.js` (WebGL2, hover) and reduced motion first.
  - Design tokens in `src/index.css` `@theme`: paper / ink / one highlighter (`mark`). Rationale and the review against Anthropic's frontend-design skill: `docs/redesign-plan.md`.
- `server/` - Express 4 monolith (CommonJS), Passport Google OAuth, express-session (memory store), SQLite via sql.js.
  - `index.js` - entry; waits for `initDB()`, then mounts routes and serves `client/dist` with an SPA catch-all.
  - `db.js` - schema, additive migrations via `addColumnIfMissing` (checks `PRAGMA table_info`), whole-DB `saveDB()` to `server/career-predictor.db`.
  - `userData.js` - pure edge helpers: `profileToUserFields` (Google profile in), `toPublicUser` (whitelist for `/auth/me`), `validateOnboardingAnswers`. Tested in `server/__tests__/`.
  - `careers.js` - `mapCareer` rule table (three tiers, each proposes a match, an FNV hash of all five answers picks one; 44 of 45 titles reachable, the 45th is the fallback) + `SAMPLE_ANSWERS` for the landing page. Pure, tested in `__tests__/careers.test.js`.
  - `routes/userRoutes.js` - `/api/user/onboarding` and `/api/user/result`.
  - `routes/sampleRoutes.js` - public `GET /api/samples`: the fixed landing-page samples with portrait URLs (kicks off generation, cached). `imageUrl.js` builds absolute image URLs for both routes.
  - `routes/imageRoutes.js` - `GET /api/image/:id` (16-hex id; 404 + `Retry-After: 8` while generating).
  - `services/image/` - `ImageService` orchestrator (sync `kickoff`, in-flight dedup, fallback cascade), `promptBuilder` (seed, SDXL/FLUX dialects, content-hash id), `providers/` (realvisxl, cloudflare, huggingface_flux, together, pollinations), `storage/` (disk, r2), `__tests__/`.
- `docs/image-service-spec.md` - contract the image pipeline and its tests satisfy.
- `.github/workflows/test.yml` (server tests on push/PR), `keep-alive.yml` (pings Render every 14 min).
- Deploy: Render single service, https://career-predictor-cnvg.onrender.com

## Commands
- Server tests: `cd server && npm test` (node:test; runs `server/__tests__/` and `services/image/__tests__/`) - verified, 98/98 pass on Node 22 after `npm install`.
- Client tests: `cd client && npm test` (node:test over pure modules in `src/lib/__tests__/`) - verified, 19/19 pass.
- Client build: `cd client && npx vite build` - verified. CI (`test.yml`) runs server tests, client tests and the client build.
- Server dev: `cd server && npm install && npm run dev` (nodemon, :5000) - unverified.
- Client dev: `cd client && npm install && npm run dev` (:3000) - unverified.
- Prod build: `npm run build` at root (installs both, builds client) - unverified.
- Prod start: `npm start` at root (`node server/index.js`) - unverified.
- Config: copy `server/.env.example` to `server/.env`. Default image chain is `pollinations` (keyless), which now always serves the low-end "sana" model with a watermark; setting `POLLINATIONS_API_KEY` (an `sk_` key) switches the default to `pollinations_gen,pollinations`.

## Conventions (Roy's standing rules)
- Comments explain WHY, not what.
- Flag counterintuitive, load-bearing or past-bug-hiding lines with `// don't touch / <reason>`.
- Edge cases and input validation are priorities; prefer clean OOP, good naming, reuse.
- No em dashes in any user-facing text or docs; use a plain hyphen.
- Secrets only via environment variables, never committed.
- New image provider or store = one new file + one factory entry in `providers/index.js` or `storage/index.js`, plus a test in `__tests__/`. Do not touch the route or orchestrator for that.
- `kickoff()` must stay synchronous (no `await` before return); spec section 2 and `imageService.test.js` enforce it.

## Gotchas
- Quiz mapping is string-coupled: `mapCareer` (`server/careers.js`) matches substrings of the literal option text in `client/src/content.js` (e.g. `'social construct'`, `'people who know'`). Editing option copy silently changes results. Server checks answers are non-empty strings of at most 200 chars (`validateOnboardingAnswers`), but not against the allowed options.
- `getImageService()` runs inside `initDB().then(...)` in `server/index.js`, so a provider missing its key fails startup via the same catch (logged as "Startup failed ...").
- `LocalDiskStore` default dir and `IMAGE_CACHE_DIR=./data/image-cache` resolve against `process.cwd()`. Root `npm start` writes to `<repo>/data/` (gitignored as `/data/`), not `server/data/`.
- Persistence: Render free-tier disk is wiped on redeploy (per `.env.example`), so SQLite DB and disk image cache are lost. Sessions use the in-memory store and die on every restart. Use `IMAGE_STORE=r2` for durable images.
- `SESSION_SECRET` falls back to a hardcoded dev string in `server/index.js` if unset (production logs a warning but still starts). Set it in every deployed env.
- `saveDB()` rewrites the whole DB file synchronously on every write.
- `docs/image-service-spec.md` links to a `.claude/plans/...` file outside the repo (dead link).
- `@paper-design/shaders-react` must stay in `optimizeDeps.include` (`vite.config.js`): if Vite discovers it mid-session it pre-bundles a second React copy and the shader throws "Invalid hook call" (dev only). `HalftoneReveal`'s `size` is calibrated: 1 renders blurry blobs, ~0.55 is the coarsest that still reads as print dots.
- Client tests cover only pure modules (`src/lib`); pages are verified by hand / Playwright with a mocked API, there is no component test setup.
- Changing `mapCareer` rules changes which career a given answer set gets (saved results are unaffected, they are stored). `careers.test.js` fails if a title becomes unreachable or a sample answer set stops matching its label; `client/src/content.js` `SAMPLE_TITLES` must list the same titles in the same order as `SAMPLE_ANSWERS`.
- The quiz step lives in the URL (`/onboarding?q=3`) so browser Back works; `resolveStep` clamps it to the first unanswered question.
- `Loading.jsx` snapshots the draft answers once on mount (marked `don't touch`): re-reading storage per render raced the deferred view-transition navigation and bounced users back to /onboarding.
- The cover export needs CORS on `/api/image/:id` in dev (different origins); `server/index.js` `cors()` covers it. If the canvas is tainted anyway, `renderCoverBlob` retries without the photo.
- `ImageService` output size is 896x1120 in production (`instance.js` `COVER_SIZE`); the constructor rejects sizes that are not multiples of 32 in [256, 1440].
