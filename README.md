# Demo.AI — IAM Presales Assistant

AI-powered demo script generator for IAM/Identity Security presales engineers. Enter your prospect's industry, use case, and persona, and get a tailored demo script with talking points, objection handling, and value positioning — streamed in real-time via Claude.

## Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/ninadsaili/solutions-demo-assistant.git
cd solutions-demo-assistant

# 2. Install all dependencies
npm run install:all

# 3. Configure environment variables
# Backend — create server/.env
cp server/.env.example server/.env
# Edit server/.env and add your Anthropic API key

# Client — .env is already configured for local dev (localhost:3001)

# 4. Start both frontend and backend
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:3001`.

## Deployment

### Backend — Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repo and set the root directory to `server`
3. Add environment variables in the Railway dashboard:
   - `ANTHROPIC_API_KEY` — your Anthropic API key
   - `ALLOWED_ORIGIN` — your Vercel frontend URL (e.g. `https://your-app.vercel.app`)
   - `PORT` — Railway sets this automatically, but defaults to `3001`
4. Railway will auto-detect the `Procfile` and deploy

### Frontend — Vercel

1. Import the repo on [Vercel](https://vercel.com)
2. Set the root directory to `client`
3. Build command: `npm run build` | Output directory: `dist`
4. Add the environment variable:
   - `VITE_API_URL` — your Railway backend URL (e.g. `https://your-app.railway.app`)
5. Deploy

## Switching Products

The Tech Stack dropdown supports multiple IAM vendors (1Kosmos, Okta, Ping Identity, Microsoft Entra, ForgeRock, Generic/Agnostic). Simply select a different product to generate vendor-specific demo scripts — no code changes needed.

## Tech Stack

- **Frontend**: React (Vite) + Tailwind CSS
- **Backend**: Node.js + Express
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`) via `@anthropic-ai/sdk`
- **PDF Export**: jsPDF + html2canvas
