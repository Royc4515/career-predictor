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
- **AI-generated portrait** via [Pollinations.ai](https://pollinations.ai) — free, no API key required
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
| Image Gen | Pollinations.ai |
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
NODE_ENV=development
```

In Google Cloud Console → **Authorized redirect URIs**, add `http://localhost:5000/auth/google/callback`

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
| `NODE_ENV` | `production` |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/google` | Start OAuth flow |
| `GET` | `/auth/google/callback` | OAuth callback |
| `GET` | `/auth/me` | Current session user |
| `GET` | `/auth/logout` | Log out |
| `POST` | `/api/user/onboarding` | Save quiz answers + result |
| `GET` | `/api/user/result` | Fetch saved result |
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
┌─────────────────┐        ┌──────────────────────┐
│  Google OAuth   │        │   Pollinations.ai     │
│  (the real AI)  │        │   (generates portrait │
│                 │        │    from career title)  │
└─────────────────┘        └──────────────────────┘
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
        ├─→ Saves result to SQLite users table
        │
        └─→ Builds Pollinations.ai image URL
            https://image.pollinations.ai/prompt/{career+style}
            (no API key — public endpoint, image generated on first load)
        │
        ▼
Returns { careerTitle, caption, stats, imageUrl }
        │
        ▼
React caches result in sessionStorage
(so page refresh doesn't re-fetch and re-render the portrait)
        │
        ▼
Result page renders — image retries up to 5× with 8s backoff
if Pollinations is slow (it sometimes is)
```

### Database Schema

SQLite via `sql.js` — zero-dependency, file-based, runs entirely in-process on Render's free tier without needing a managed database.

```sql
CREATE TABLE users (
  id          TEXT PRIMARY KEY,   -- Google sub (stable user ID)
  email       TEXT,
  name        TEXT,
  avatar      TEXT,
  career      TEXT,               -- Stored career title
  result_json TEXT,               -- Full result blob (JSON)
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Results are **deterministic per session** — same answers always produce the same destiny. You can't escape it.

### Why This Stack

| Decision | Reason |
|----------|--------|
| React 19 + Vite | Fast HMR in dev, optimized static build in prod |
| Express monolith | Serves both API and static files — one Render service, one bill ($0) |
| SQLite (sql.js) | No managed DB needed; data survives restarts via Render's disk |
| Passport.js | Battle-tested OAuth middleware; session handled server-side, not JWT |
| Pollinations.ai | Free AI image generation API — no key, no quota, no cost |

---

## License

## License

```
MIT License

Copyright (c) 2025 Roy Carmelli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

> **Additional Clause (Non-Binding, Obviously):** The Quantum Personality Matrix™, the 99.7% accuracy figure,
> the happiness scores, the salary projections, and every career title generated by this software are
> fictional. Any resemblance to your actual life trajectory is either a hilarious coincidence or deeply
> concerning. The author assumes no liability for existential crises, career pivots, or LinkedIn profile
> updates made as a direct result of using this application. By running this software you acknowledge
> that *COBOL never dies* and neither does your career destiny.

---

*CareerPredict Neural Engine v4.2.1 · Quantum Matrix Active · Results are 99.7% accurate and completely made up.*
