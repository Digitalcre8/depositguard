# DepositGuard — AI Inventory Assistant

Upload property photos → AI detects damage → suggests deposit deductions → generates dispute-ready report.

## Deploy to Vercel (2 minutes)

### Option A: Deploy via GitHub (recommended)

1. Push this folder to a new GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. In **Environment Variables**, add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key from [console.anthropic.com](https://console.anthropic.com)
4. Click **Deploy** — done ✓

### Option B: Deploy via Vercel CLI

```bash
npm install -g vercel
cd depositguard
vercel
# Follow prompts, then add env var:
vercel env add ANTHROPIC_API_KEY
vercel --prod
```

## Run locally

```bash
cp .env.local.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

npm install
npm run dev
# Open http://localhost:3000
```

## How it works

- **Frontend**: Next.js React app — photo upload, form, report UI
- **Backend**: `/api/analyse` — server-side API route that calls Anthropic with your images
- **AI**: Claude analyses each photo for damage, wear & tear, and produces:
  - Overall condition score
  - Itemised deductions with £ estimates (UK 2024 rates)
  - Room-by-room findings
  - Formal dispute statement for TDS/mydeposits/DPS

## Get your API key

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Go to **API Keys** → **Create Key**
3. Copy and paste into your `.env.local` or Vercel environment variable
