# CareerPredict AI

A satirical AI-powered career predictor that analyzes your "professional DNA" and reveals your true career destiny with 99.7% accuracy (completely made up).

## What It Does

1. **Sign in** with your Google account
2. **Answer 5 absurdly specific questions** about your work style, strengths, and ambitions
3. **Get matched** to a hilariously specific career path (e.g. "Founder Waiting for Series A That Will Never Come")
4. **View an AI-generated portrait** of your career destiny, complete with stats and a sardonic caption
5. **Share your result** with friends or download the image

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, Tailwind CSS 4, React Router 7 |
| Backend | Node.js, Express 4, Passport.js (Google OAuth 2.0) |
| Database | SQLite via sql.js (in-memory with file persistence) |
| Image Generation | Pollinations.ai (free, no API key required) |
| Deployment | Vercel (frontend) + Railway (backend) |

## Local Development

### Prerequisites

- Node.js >= 20
- A Google OAuth app ([create one here](https://console.cloud.google.com/apis/credentials))
  - Authorized redirect URI: `http://localhost:5000/auth/google/callback`

### Setup

```bash
# Clone the repo
git clone https://github.com/Royc4515/career-predictor.git
cd career-predictor

# Create your environment file
cp server/.env.example server/.env
# Edit server/.env with your Google OAuth credentials:
#   GOOGLE_CLIENT_ID=your_client_id
#   GOOGLE_CLIENT_SECRET=your_client_secret
#   SESSION_SECRET=any_random_string
#   CLIENT_URL=http://localhost:3000
#   SERVER_URL=http://localhost:5000

# Install all dependencies
npm run build
```

### Run

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and sign in with Google.

## Screenshots

<!-- Add screenshots here -->
![Landing Page](screenshots/landing.png)
![Result Page](screenshots/result.png)

## Deployment

### Frontend (Vercel)

- Framework: Vite
- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL` = your Railway backend URL

### Backend (Railway)

- Start command: `node server/index.js`
- Root directory: `/`
- Environment variables: same as `server/.env` but with production URLs

## License

MIT
