# CLAUDE.md - CareerPredict AI

## What this is
A satirical 5-question career quiz web app: a Google-signed-in user gets a deterministic joke career title, fake stats and an AI-generated portrait; the audience is TODO(Roy): who is this for (portfolio showcase, friends, LinkedIn audience)?

Not an ML project. The "prediction" is a hand-written rule table (`mapCareer` in `server/careers.js`); the only real AI is the text-to-image call.

## Stack & layout
- `client/` - React 19, Vite 6, Tailwind 4, React Router 7 (data router, so `viewTransition` works), Motion via `LazyMotion` + `m.*` (strict: a full `motion.*` throws). Dev server on :3000 proxies `/auth` and `/api` to :5000 (`client/vite.config.js`).
  - `src/pages/` Landing, Onboarding (quiz), Loading ("Printing your cover"), Result (cover + report), NotFound. Signed-in pages are lazy routes in `App.jsx`.
  - `src/components/Cover.jsx` + `src/lib/coverCanvas.js` - the magazine cover on screen and as a 1080x1350 PNG; both read proportions from `src/lib/coverLayout.js`, so change sizes there, not in either renderer.
  - `src/lib/api.js` (all server calls), `src/lib/quiz.js` (drops draft answers that are no longer options), `src/lib/storage.js` (sessionStorage, never throws), `src/hooks/useImageReady.js` (HEAD-polls `/api/image/:id`), `src/content.js` (all copy, quiz options, and `FINDINGS`: the analyst's line printed under each quoted answer in the report; one per option, enforced by `lib/__tests__/content.test.js`).
  - `src/components/effects/` - the signature effects, each self-contained with a fallback: `HalftoneReveal` (CMYK halftone press reveal, Paper Shaders WebGL2, lazy chunk), `TiltCard` (pointer tilt + gloss), `Stamp` (ink rubber stamp on the report, never on the cover), `Odometer`, `IssueStack` (scroll-driven back-issue fan), `EffectBoundary` (an effect that throws removes itself, never the page). `hooks/useProximityWeight.js` drives the hero's variable-weight letters. CSS-only effects (CMYK misregistration, print head, barcode laser) live in `index.css` under "Print shop effects". Every effect checks `lib/capabilities.js` (WebGL2, hover) and reduced motion first.
  - Design tokens in `src/index.css` `@theme`: paper / ink / one highlighter (`mark`). Rationale and the review against Anthropic's frontend-design skill: `docs/redesign-plan.md`.
- `server/` - Express 4 monolith (CommonJS), Passport Google OAuth, express-session (memory store), SQLite via `@libsql/client`: Turso in production (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`), a local file otherwise.
  - `index.js` - entry; waits for `initDB()`, then mounts routes and serves `client/dist` with an SPA catch-all.
  - `db.js` - async API over libsql; schema + additive migrations via `addColumnIfMissing` (checks `PRAGMA table_info`). `saveOnboarding` replaces the user's row in one write batch. Tested against a real SQLite file in `__tests__/db.test.js`, including the schema production Turso had before `image_id`.
  - `asyncRoute.js` - wraps every async Express handler so a rejection becomes a JSON 500 (Express 4 would hang the request).
  - `userData.js` - pure edge helpers: `profileToUserFields` (Google profile in), `toPublicUser` (whitelist for `/auth/me`), `validateOnboardingAnswers`. Tested in `server/__tests__/`.
  - `quiz.js` - the answer catalog: option text the client sends to stable option ids. `__tests__/quiz.test.js` imports `client/src/content.js` and fails if the two copies differ by a character.
  - `careers.js` - `CAREERS` table (40 careers, 10 per field, each with two cue option ids) and `mapCareer`: the tabs answer picks the field's shelf, the career matching most cues wins, an FNV hash of the option ids breaks ties; returns `evidence` (two of the user's answers, quoted on the report). Plus `SAMPLE_ANSWERS` for the landing page. Pure, tested in `__tests__/careers.test.js` (all reachable, each 1-4% of the 1,024 answer sets). Rationale: `docs/quiz-redesign.md`.
  - `routes/userRoutes.js` - `/api/user/onboarding` and `/api/user/result`.
  - `routes/sampleRoutes.js` - public `GET /api/samples`: the fixed landing-page samples with portrait URLs (kicks off generation, cached). `imageUrl.js` builds absolute image URLs for both routes.
  - `routes/imageRoutes.js` - `GET /api/image/:id` (16-hex id; 404 + `Retry-After: 8` while generating).
  - `services/image/` - `ImageService` orchestrator (sync `kickoff`, in-flight dedup, fallback cascade), `promptBuilder` (seed, SDXL/FLUX dialects, content-hash id), `providers/` (realvisxl, cloudflare, huggingface_flux, together, pollinations), `storage/` (disk, r2, turso, plus `WebpStore`, which wraps whichever backend and re-encodes portraits as WebP), `__tests__/`.
- `docs/image-service-spec.md` - contract the image pipeline and its tests satisfy.
- `.github/workflows/test.yml` (server tests on push/PR), `keep-alive.yml` (pings Render every 14 min).
- Deploy: Render single service, https://career-predictor-cnvg.onrender.com, deploying `main` (`render.yaml`). Until November 2026 the dashboard deployed a separate branch (`claude/migrate-free-hosting-tvidw`, the Turso migration), so merges to main did not ship; check the service's branch if a merge doesn't appear.

## Commands
- Server tests: `cd server && npm test` (node:test; runs `server/__tests__/` and `services/image/__tests__/`) - verified, 137/137 pass on Node 22 after `npm install`.
- Client tests: `cd client && npm test` (node:test over pure modules in `src/lib/__tests__/`) - verified, 27/27 pass.
- Client build: `cd client && npx vite build` - verified. CI (`test.yml`) runs server tests, client tests and the client build.
- Likeness test for the planned personal portrait: `cd server && npm run check:likeness` (needs `POLLINATIONS_API_KEY`; spends pollen; writes an HTML contact sheet). Plan and pass criteria: `docs/personal-portrait.md`. Unverified against the real API (no key in the dev container).
- Image key check: `cd server && npm run check:image` (add `-- --generate` for one real render) - verified against a fake key (clean 401) and a missing key. Owner steps: `docs/pollinations-setup.md`.
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
- Quiz option text lives twice, `client/src/content.js` and `server/quiz.js`, and must match exactly (the client sends text, the server maps it to an id); `quiz.test.js` enforces it, so edit both together. The server rejects any answer that is not a current option with "The questionnaire was updated. Reload the page and answer again." (`validateOnboardingAnswers`), and the client drops stale draft answers (`lib/quiz.js`). Question ids are DB column names and keep their old names (`strength` holds the dead-laptop answer).
- `getImageService()` runs inside `initDB().then(...)` in `server/index.js`, so a provider missing its key fails startup via the same catch (logged as "Startup failed ...").
- `LocalDiskStore` default dir and `IMAGE_CACHE_DIR=./data/image-cache` resolve against `process.cwd()`. Root `npm start` writes to `<repo>/data/` (gitignored as `/data/`), not `server/data/`.
- Persistence: Render free-tier disk is wiped on redeploy. The database survives only because production uses Turso; without `TURSO_DATABASE_URL` it falls back to a local file that is lost on deploy. Portraits survive too: with `TURSO_DATABASE_URL` set, the image store defaults to `turso` (an `images` table in the same database; the log prints `[IMAGE] store: turso+webp`). Sessions still use the in-memory store and die on every restart.
- Bandwidth: Render's free tier includes 5 GB outbound a month and, with no card on file, suspends the service for the rest of the month when it runs out. That is why every stored portrait is re-encoded as WebP (`storage/webpStore.js`, measured ~9% of the JPEG). Keep new image-heavy features on WebP and small sizes.
- Running scripts that call Pollinations from a dev container whose proxy injects the key: Node's built-in fetch ignores HTTPS_PROXY unless started with `NODE_USE_ENV_PROXY=1`.
- `SESSION_SECRET` falls back to a hardcoded dev string in `server/index.js` if unset (production logs a warning but still starts). Set it in every deployed env.
- `docs/image-service-spec.md` links to a `.claude/plans/...` file outside the repo (dead link).
- `@paper-design/shaders-react` must stay in `optimizeDeps.include` (`vite.config.js`): if Vite discovers it mid-session it pre-bundles a second React copy and the shader throws "Invalid hook call" (dev only). `HalftoneReveal`'s `size` is calibrated: 1 renders blurry blobs, ~0.55 is the coarsest that still reads as print dots.
- Client tests cover only pure modules (`src/lib`); pages are verified by hand / Playwright with a mocked API, there is no component test setup.
- Changing cues or the table changes which career a given answer set gets (saved results are unaffected, they are stored, evidence included). `careers.test.js` fails if a title becomes unreachable, any career leaves the 1-4% band, or a sample answer set stops matching its label; `quiz.test.js` fails if `client/src/content.js` `SAMPLE_TITLES` differs from `SAMPLE_ANSWERS` titles and order.
- `html` has `overflow-x: clip` (`index.css`, `don't touch`): one effect poking past the edge mid-animation made mobile browsers widen the layout viewport and the result page scrolled sideways for good. Keep effects inside their column anyway; `IssueStack` uses a narrower fan below 640px for the same reason.
- The quiz step lives in the URL (`/onboarding?q=3`) so browser Back works; `resolveStep` clamps it to the first unanswered question.
- `Loading.jsx` snapshots the draft answers once on mount (marked `don't touch`): re-reading storage per render raced the deferred view-transition navigation and bounced users back to /onboarding.
- The cover export needs CORS on `/api/image/:id` in dev (different origins); `server/index.js` `cors()` covers it. If the canvas is tainted anyway, `renderCoverBlob` retries without the photo.
- `ImageService` output size is 896x1120 in production (`instance.js` `COVER_SIZE`); the constructor rejects sizes that are not multiples of 32 in [256, 1440].
