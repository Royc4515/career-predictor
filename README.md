<div align="center">

# CareerPredict AI

### Your true career destiny, revealed by an AI that's 99.7% accurate (and completely made up).

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<!-- Replace with your deployed URL -->
<!-- [Try it live](https://your-app.up.railway.app) -->

</div>

---

## What is this?

CareerPredict AI is a satirical web app that analyzes your "professional DNA" through 5 absurdly specific questions and matches you to a hilariously niche career — complete with an AI-generated portrait, a sardonic caption, and totally real stats.

> *"Apparently my true career destiny is Founder Waiting for Series A That Will Never Come"* — a real result

## How it works

```
Sign in with Google  →  Answer 5 questions  →  Get your career destiny
```

1. **Sign in** with Google OAuth
2. **Answer 5 questions** — your biggest strength, how you handle Mondays, what coworkers think of you, your 5-year plan, and your target field
3. **Watch the "analysis"** — a fake loading screen with made-up metrics like "847 Career Trajectories Analyzed"
4. **Get your result** — a unique career title, AI-generated portrait, happiness score, salary potential, and career outlook
5. **Share or download** — native share or copy-to-clipboard, plus image download

## Screenshots

<!-- Add your own screenshots to a screenshots/ directory -->
<!-- Uncomment the lines below once you have them -->

<!-- ![Landing Page](screenshots/landing.png) -->
<!-- ![Onboarding Quiz](screenshots/onboarding.png) -->
<!-- ![Career Result](screenshots/result.png) -->

*Screenshots coming soon — deploy the app and add your own!*

## Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| **Frontend** | React 19, Vite 6, Tailwind CSS 4, React Router 7 | Fast dev, modern styling, SPA routing |
| **Backend** | Node.js, Express 4, Passport.js | Google OAuth 2.0 authentication |
| **Database** | SQLite via sql.js | Zero-config, file-based persistence |
| **AI Images** | [Pollinations.ai](https://pollinations.ai) | Free image generation, no API key needed |
| **Deployment** | Railway | Full-stack monolith, single service |

## Project Structure

```
career-predictor/
├── client/                  # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx      # Marketing page with fake stats
│   │   │   ├── Onboarding.jsx   # 5-step career quiz
│   │   │   ├── Loading.jsx      # Fake analysis screen
│   │   │   └── Result.jsx       # Career result + AI portrait
│   │   ├── components/
│   │   │   ├── AuthContext.jsx   # Auth state provider
│   │   │   └── ProtectedRoute.jsx
│   │   ├── App.jsx
│   │   └── config.js
│   └── package.json
├── server/                  # Express backend
│   ├── index.js             # Server entry, middleware, static serving
│   ├── auth.js              # Passport + Google OAuth strategy
│   ├── db.js                # SQLite setup (users + onboarding tables)
│   ├── routes/
│   │   ├── authRoutes.js    # /auth/google, /auth/me, /auth/logout
│   │   └── userRoutes.js    # /api/user/onboarding, /api/user/result
│   └── .env.example
└── package.json             # Root build + start scripts
```

## Getting Started

### Prerequisites

- **Node.js 20+**
- **Google OAuth credentials** — [create them here](https://console.cloud.google.com/apis/credentials)
  - Add `http://localhost:5000/auth/google/callback` as an authorized redirect URI

### Setup

```bash
# Clone
git clone https://github.com/Royc4515/career-predictor.git
cd career-predictor

# Configure environment
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=any_random_string_here
CLIENT_URL=http://localhost:3000
SERVER_URL=http://localhost:5000
```

```bash
# Install everything
npm run build
```

### Run locally

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google.

## Deployment (Railway)

This app runs as a **single service** on Railway — the Express server builds the React frontend and serves it as static files.

### Environment Variables

Set these in Railway → your service → **Variables**:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | *random secret string* |
| `CLIENT_URL` | `https://your-app.up.railway.app` |
| `SERVER_URL` | `https://your-app.up.railway.app` |
| `GOOGLE_CLIENT_ID` | *from Google Cloud Console* |
| `GOOGLE_CLIENT_SECRET` | *from Google Cloud Console* |

> **Note:** The app starts without Google OAuth credentials — it just won't have login functionality until they're configured.

### Google OAuth Setup for Production

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
1. Add your Railway URL to **Authorized JavaScript origins**
2. Add `https://your-app.up.railway.app/auth/google/callback` to **Authorized redirect URIs**

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/google` | Start Google OAuth flow |
| `GET` | `/auth/google/callback` | OAuth callback |
| `GET` | `/auth/me` | Get current user (or 401) |
| `GET` | `/auth/logout` | Destroy session |
| `POST` | `/api/user/onboarding` | Submit quiz answers, get career result |
| `GET` | `/api/user/result` | Fetch saved career result |
| `GET` | `/api/health` | Health check |

## Example Career Results

| Career Title | Happiness | Salary |
|-------------|-----------|--------|
| Founder Waiting for Series A That Will Never Come | 18% | $0 (pre-revenue) |
| UX Designer Who Only Designs for Themselves | 72% | $95K |
| LinkedIn Influencer With 47 Followers | 55% | Paid in exposure |
| Professional Human Being (Specialization Pending) | 50% | TBD |

*100+ unique career results mapped from quiz answer combinations.*

## License

MIT
