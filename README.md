# CareerPredict AI

> *Results are 99.7% accurate and completely made up.*

**CareerPredict AI** runs your professional DNA through 847 career trajectories, cross-references the Quantum Personality Matrix™, and delivers the career destiny you truly deserve — complete with a fake happiness score, a dubious salary projection, and an AI-generated portrait of your future self.

Answer 5 questions. Watch the analysis. Discover you're a *JIRA Ticket Archaeologist, Legacy Systems Division.*

---

[![Live Demo](https://img.shields.io/badge/Try%20It%20Live-%E2%86%92-6366f1?style=for-the-badge&logo=vercel&logoColor=white)](https://career-predictor-cnvg.onrender.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Roy%20Carmelli-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/roy-carmelli/)
[![GitHub](https://img.shields.io/badge/GitHub-Royc4515-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Royc4515)
[![Portfolio](https://img.shields.io/badge/Portfolio-roy--carmelli-black?style=for-the-badge&logo=vercel&logoColor=white)](https://roy-carmelli-portfolio.vercel.app/)

---

## Screenshots

<table>
  <tr>
    <td width="50%"><img src="screenshots/landing.png" alt="Landing Page" /></td>
    <td width="50%"><img src="screenshots/quiz.png" alt="Quiz" /></td>
  </tr>
  <tr>
    <td align="center"><sub><em>Discover Your True Career Destiny™</em></sub></td>
    <td align="center"><sub><em>The questions are hard. The answers are harder.</em></sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="screenshots/loading.png" alt="AI Analysis in Progress" /></td>
    <td width="50%">
      <img src="screenshots/result.png" alt="Career Result" />
      <img src="screenshots/result-stats.png" alt="Career Stats" />
    </td>
  </tr>
  <tr>
    <td align="center"><sub><em>823 trajectories · 13,911 data points · Please do not close this window.</em></sub></td>
    <td align="center"><sub><em>JIRA Ticket Archaeologist · 34/100 happiness · Stable but soul-crushing.</em></sub></td>
  </tr>
</table>

---

## How It Works

| Step | What Happens |
|------|-------------|
| 1 | Sign in with Google |
| 2 | Answer 5 personality questions |
| 3 | Watch the AI "analyze" you (97% confidence, 100% fiction) |
| 4 | Receive your career destiny + AI-generated portrait |
| 5 | Share it, download it, or try again in denial |

**Sample career results:**
- *Founder Waiting for Series A That Will Never Come*
- *JIRA Ticket Archaeologist, Legacy Systems Division*
- *Chief Vibes Officer at Startup with 6 Months of Runway*
- *Professional LinkedIn Thought Leader (No One Reads)*

---

## Features

- **Google OAuth** — one-click sign in, no passwords
- **5-question quiz** — powered by Quantum Personality Matrix™ v3.2
- **Fake AI loading screen** — 823+ trajectories analyzed in real time (trust us)
- **AI-generated portrait** via a **swappable provider chain** — primary is HuggingFace [RealVisXL V4.0](https://huggingface.co/SG161222/RealVisXL_V4.0) (a portrait-tuned SDXL fine-tune), fallbacks cascade through Cloudflare Workers AI, HuggingFace FLUX.1-schnell, Together.ai, and [Pollinations.ai](https://pollinations.ai). All fully free. Deterministic seed per career title, dialect-aware prompt engineering (SDXL tags vs FLUX prose), negative-prompt artifact suppression. Switch providers via one env var.
- **Career stats** — happiness score, salary potential, career outlook, DNA match breakdown
- **Shareable results** — native share API, clipboard copy, and image download

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 · Vite 6 · Tailwind CSS 4 · React Router 7 |
| Backend | Node.js · Express 4 · Passport.js |
| Database | SQLite (sql.js) |
| Auth | Google OAuth 2.0 |
| Image Gen | Provider chain: RealVisXL → CF Workers AI → HF FLUX → Together → Pollinations |
| Image Storage | Pluggable `BlobStore` — local disk (dev) or Cloudflare R2 (prod, free 10 GB) |
| Hosting | Render |

---

## Local Setup

**Prerequisites:** Node.js 20+, Google OAuth credentials

```bash
# 1. Clone
git clone https://github.com/Royc4515/career-predictor.git
cd career-predictor

# 2. Install
npm install && cd client && npm install && cd ..

# 3. Run
npm run dev
```

Create `server/.env`:

```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
SESSION_SECRET=anything_long_and_random
CLIENT_URL=http://localhost:3000
SERVER_URL=http://localhost:5000
NODE_ENV=development
```

In Google Cloud Console → **Authorized redirect URIs**, add `http://localhost:5000/auth/google/callback`

### Image generation (optional)

The app works zero-config with Pollinations alone. To activate the full quality+reliability chain, add the providers you have keys for:

```
IMAGE_PROVIDER_CHAIN=realvisxl,cloudflare,huggingface_flux,together,pollinations
HUGGINGFACE_API_TOKEN=hf_xxx          # used by realvisxl AND huggingface_flux
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
TOGETHER_API_KEY=

IMAGE_STORE=disk                       # or 'r2' for durable Cloudflare R2 storage
# R2_ACCOUNT_ID= / R2_ACCESS_KEY_ID= / R2_SECRET_ACCESS_KEY= / R2_BUCKET=
```

Providers are tried left to right. Missing keys for any provider in the chain cause a fail-fast at startup — set keys for every name you list. See [`docs/image-service-spec.md`](docs/image-service-spec.md) for the full contract.

---

## Deployment (Render)

Express builds the React frontend and serves it as static files — single service, zero config.

| Variable | Value |
|----------|-------|
| `GOOGLE_CLIENT_ID` | from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | `https://your-app.onrender.com/auth/google/callback` |
| `SESSION_SECRET` | any long random string |
| `CLIENT_URL` | `https://your-app.onrender.com` |
| `SERVER_URL` | `https://your-app.onrender.com` |
| `NODE_ENV` | `production` |
| `IMAGE_PROVIDER_CHAIN` | *(optional)* e.g. `realvisxl,cloudflare,huggingface_flux,together,pollinations` |
| `HUGGINGFACE_API_TOKEN` / `CLOUDFLARE_*` / `TOGETHER_API_KEY` | *(optional)* keys for the providers in your chain |
| `IMAGE_STORE` | *(optional)* `disk` (default) or `r2` |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | *(when `IMAGE_STORE=r2`)* |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/google` | Start OAuth flow |
| `GET` | `/auth/google/callback` | OAuth callback |
| `GET` | `/auth/me` | Current session user |
| `GET` | `/auth/logout` | Log out |
| `POST` | `/api/user/onboarding` | Save quiz answers + result (kicks off image generation in background) |
| `GET` | `/api/user/result` | Fetch saved result |
| `GET` | `/api/image/:id` | Stream the generated portrait by 16-hex content id (404 + `Retry-After: 8` while generating) |
| `GET` | `/api/health` | Health check |

---

## Contributing

Have a funnier career title? Found a bug in the Quantum Personality Matrix™? PRs are welcome.

```bash
git checkout -b feat/funnier-careers
git commit -m "feat: add 'Chief Remote Work Evangelist (Has Never Met Teammates)'"
git push origin feat/funnier-careers
```

---

## Contact

Built by **Roy Carmelli** — reach out if you have questions, want to collaborate, or just discovered you're a *Professional Deck-Slide Archaeologist*.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=flat&logo=linkedin)](https://www.linkedin.com/in/roy-carmelli/)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat&logo=github)](https://github.com/Royc4515)
[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-black?style=flat&logo=vercel)](https://roy-carmelli-portfolio.vercel.app/)

---

## Quantum Architecture

> *How we achieve 99.7% accuracy while knowing absolutely nothing about you.*

The system is a classic **full-stack monolith** — React on the front, Express on the back, one Render service holding it all together with duct tape and optimism.

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│   React 19 + React Router 7                                 │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│   │ Landing  │→ │  Quiz    │→ │ Loading  │→ │  Result  │  │
│   │  Page    │  │ (5 Qs)  │  │ (fake AI)│  │  Page    │  │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│        │               │                          ↑        │
└────────┼───────────────┼──────────────────────────┼────────┘
         │               │                          │
         ▼               ▼                          │
┌─────────────────────────────────────────────────────────────┐
│                   EXPRESS SERVER (Node.js)                   │
│                                                             │
│   Auth Routes              API Routes                       │
│   /auth/google      ──→    /api/user/onboarding  (POST)     │
│   /auth/callback    ──→    /api/user/result       (GET)     │
│   /auth/me          ──→    /api/health            (GET)     │
│   /auth/logout                                              │
│         │                          │                        │
│         ▼                          ▼                        │
│   Passport.js               SQLite (sql.js)                 │
│   Session Store             users + results table           │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐        ┌──────────────────────────────────────────┐
│  Google OAuth   │        │   ImageService (provider chain)           │
│  (the real AI)  │        │                                           │
│                 │        │   RealVisXL → CF → HF FLUX →              │
│                 │        │   Together → Pollinations                 │
│                 │        │   (per-dialect prompts, in-flight dedup,  │
│                 │        │    BlobStore-cached bytes served at       │
│                 │        │    /api/image/:id)                        │
└─────────────────┘        └──────────────────────────────────────────┘
```

### Auth Flow

The authentication is standard **OAuth 2.0 Authorization Code** flow, handled by [Passport.js](https://www.passportjs.org/):

1. User clicks **"Analyze My Career Potential →"** → redirected to `GET /auth/google`
2. Passport redirects to Google's consent screen, requesting `profile` + `email` scopes
3. Google redirects back to `/auth/google/callback` with an authorization code
4. Passport exchanges the code for an access token, fetches the user profile, and upserts the user record into SQLite
5. Express creates a **server-side session** (express-session) and sends a session cookie
6. All subsequent API calls include the cookie; `req.isAuthenticated()` guards every protected route

### Data Flow: Quiz → Result

```
User answers 5 questions
        │
        ▼
POST /api/user/onboarding
{ answers: [...] }
        │
        ▼
Server maps answers → deterministic career result
(lookup table: answer combo → careerTitle + stats)
        │
        ├─→ Saves result to SQLite users table (with content-hash image_id)
        │
        └─→ imageService.kickoff({ scenePrompt, title })
            ├─ returns { id } synchronously (~100ms response)
            └─ background: cascade through provider chain, write bytes
               to BlobStore (disk or R2) keyed by sha256(prompt+seed)
        │
        ▼
Returns { careerTitle, caption, stats, imageUrl: /api/image/<id> }
        │
        ▼
React caches result in sessionStorage
(so page refresh doesn't re-fetch and re-render the portrait)
        │
        ▼
Result page renders — <img src="/api/image/<id>">
  ├─ 200 + bytes if generation finished → cached for a year
  └─ 404 "generating" + Retry-After:8 if still in flight
     → client retries up to 5× with 8s backoff (same UX as before)
```

### Database Schema

SQLite via `sql.js` — zero-dependency, file-based, runs entirely in-process on Render's free tier without needing a managed database.

```sql
CREATE TABLE users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id   TEXT UNIQUE NOT NULL,
  email       TEXT,
  name        TEXT,
  avatar_url  TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE onboarding (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER REFERENCES users(id),
  strength      TEXT,
  monday_vibe   TEXT,
  coworker_desc TEXT,
  five_year_goal TEXT,
  desired_field TEXT,
  career_result TEXT,              -- Full result blob (JSON)
  image_url     TEXT,              -- Legacy: third-party Pollinations URL (pre-refactor rows)
  image_id      TEXT,              -- New: 16-hex content hash → /api/image/:id
  completed_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

The `image_id` column was added as an **additive** migration — historical rows keep `image_url` populated and the read path falls back to it. New rows populate `image_id` only.

Results are **deterministic per session** — same answers always produce the same destiny. You can't escape it.

### Why This Stack

| Decision | Reason |
|----------|--------|
| React 19 + Vite | Fast HMR in dev, optimized static build in prod |
| Express monolith | Serves both API and static files — one Render service, one bill ($0) |
| SQLite (sql.js) | No managed DB needed; data survives restarts via Render's disk |
| Passport.js | Battle-tested OAuth middleware; session handled server-side, not JWT |
| Provider abstraction | One `ImageProvider` interface, five concrete impls (RealVisXL, CF Workers AI, HF FLUX-schnell, Together, Pollinations), env-driven fallback chain. Adding a sixth provider is one new file + one factory entry — no edits to the route handler or orchestrator. |
| `BlobStore` interface | Decouples bytes from the third-party CDN. `LocalDiskStore` in dev, `R2Store` in prod (free 10 GB), same interface. Historical user portraits survive provider rotations. |

---

## License

[MIT](./LICENSE) — use it freely.

> **Non-Binding Additional Clause:** The Quantum Personality Matrix™, the 99.7% accuracy figure, the happiness scores, the salary projections, and every career title are fictional. Any resemblance to your actual life trajectory is either a hilarious coincidence or deeply concerning. The author assumes no liability for existential crises, career pivots, or LinkedIn profile updates. By running this software you acknowledge that *COBOL never dies* and neither does your destiny.

---

*CareerPredict Neural Engine v4.2.1 · Quantum Matrix Active · Results are 99.7% accurate and completely made up.*
