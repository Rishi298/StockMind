# StockMind Terminal

AI-powered stock screener and deep analysis platform for Indian equities listed on NSE. Covers Nifty 500 universe with live data from Yahoo Finance and a 6-agent analysis engine.

## Features

- **Live screener** — Nifty 500 stocks with real-time prices, P/E, P/B, market cap, 52-week range
- **6 preset filters** — Quality Compounders, Momentum Leaders, Deep Value, GARP, Income, Turnaround
- **Deep-dive analysis** — 6 AI agents per stock: Fundamental, Technical, Sentiment, Moat, Growth, Risk
- **Trade levels** — Entry zone, stop-loss, Target 1, Target 2 derived from ATR
- **Price chart** — 1mo/3mo/6mo/1y with 50-DMA, 200-DMA, RSI overlay
- **Zero API keys** — uses `yahoo-finance2` (free, no key needed)

---

## Local Setup

### Prerequisites

- Node.js 18+ (check: `node --version`)
- npm 9+ (check: `npm --version`)

### Steps

```bash
# 1. Clone or extract the project
cd stockmind-terminal

# 2. Install dependencies (~300 packages, takes ~30s)
npm install

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the screener.

**Test these stocks work:** RELIANCE, TCS, HDFCBANK, INFY, BHARTIARTL
- Visit `http://localhost:3000/stock/RELIANCE`
- All numbers should be live from Yahoo Finance

### Environment Variables

No `.env` required for MVP. Copy `.env.local.example` to `.env.local` if you want to add optional keys:

```bash
cp .env.local.example .env.local
```

---

## Deploy to Vercel

### Option A — Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (follow prompts: link project, confirm settings)
vercel

# For production deployment:
vercel --prod
```

### Option B — GitHub + Vercel Dashboard

1. Push your code to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial StockMind Terminal"
   git remote add origin https://github.com/YOUR_USERNAME/stockmind-terminal.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) → **New Project** → Import from GitHub

3. Select your `stockmind-terminal` repo

4. Vercel auto-detects Next.js — click **Deploy**

5. Wait ~2 minutes. Your app is live at `https://stockmind-terminal.vercel.app`

### Vercel Settings (if prompted)

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |
| Node.js Version | 18.x |

---

## Custom Domain

1. In Vercel dashboard → your project → **Settings → Domains**
2. Click **Add** → enter your domain (e.g. `stockmind.yourdomain.com`)
3. Vercel shows two DNS records to add:
   - **A record**: `@` → `76.76.21.21`
   - **CNAME**: `www` → `cname.vercel-dns.com`
4. Add these at your DNS provider (GoDaddy, Namecheap, Cloudflare, etc.)
5. SSL certificate is auto-provisioned (takes ~5 minutes to propagate)

---

## Environment Variables (Optional Upgrades)

For MVP, no env vars are needed. For production upgrades:

```env
# Optional: Alpha Vantage (free tier: 25 req/day)
ALPHA_VANTAGE_API_KEY=your_key_here

# Optional: Finnhub (free tier: 60 req/min)
FINNHUB_API_KEY=your_key_here

# Optional: Polygon.io (paid, institutional grade)
POLYGON_API_KEY=your_key_here

# Optional: Vercel KV / Upstash for distributed cache
KV_REST_API_URL=your_url_here
KV_REST_API_TOKEN=your_token_here
```

Add env vars in Vercel: **Project Settings → Environment Variables**

---

## Cost

| Tier | Cost | Limits |
|---|---|---|
| Vercel Hobby | **Free** | 100GB bandwidth, 100 deployments/day |
| Vercel Pro | $20/mo | 1TB bandwidth, team features |
| Yahoo Finance (yahoo-finance2) | **Free** | Unofficial API, rate limits apply |

The app runs entirely on the Vercel Hobby tier at **zero cost**.

---

## Architecture

```
app/
  page.tsx              ← Home screener (client component with SWR)
  stock/[ticker]/       ← Deep-dive page (client, uses SWR)
  api/
    quote/[ticker]/     ← Live quote from Yahoo Finance
    fundamentals/[ticker]/ ← Summary modules
    history/[ticker]/   ← OHLCV historical data
    screener/           ← Bulk screener with preset filters
    analyze/[ticker]/   ← Runs all 6 agents via Promise.all

lib/
  yahoo.ts              ← Yahoo Finance wrapper (60s in-memory cache)
  indicators.ts         ← RSI, MACD, DMA, ATR, Bollinger calculations
  universe.ts           ← Nifty 50 + Nifty Next 50 (~95 stocks)
  agents/
    fundamental.ts      ← P/E, ROE, debt, margins scoring
    technical.ts        ← RSI, MACD, MA crossover, entry/stop/target
    sentiment.ts        ← Analyst consensus, institutional ownership
    moat.ts             ← ROE, margins, sector moat classification
    growth.ts           ← 3-4Y DCF-lite bear/base/bull scenarios
    risk.ts             ← Beta, leverage, stress scenarios, position sizing
```

---

## Adding More Stocks

Edit `lib/universe.ts` and add entries to `NIFTY_NEXT_50` or a new array:

```typescript
{ ticker: 'KPIGREEN', name: 'KPI Green Energy', sector: 'Renewable Energy' },
```

Yahoo Finance uses `.NS` suffix automatically — just use the NSE ticker symbol.

---

## Legal Warning

> **SEBI RA Registration Required for Monetization**
>
> Under SEBI (Investment Advisers) Regulations, 2013, providing investment advice for a fee in India requires registration as a SEBI-Registered Investment Advisor (RA). Operating a paid stock analysis service without RA registration is a legal violation.
>
> This app is for **educational and personal research use only**. If you intend to monetize (subscriptions, ads tied to investment content, advisory fees), you must:
> 1. Register as a SEBI RA (sebi.gov.in)
> 2. Add required SEBI disclosures
> 3. Comply with SEBI IA regulations on research reports
>
> Free, non-commercial, educational use does not require registration.

---

## License

MIT — use freely for personal and educational purposes. See `LICENSE` file.

---

*Data source: Yahoo Finance (unofficial API). Not affiliated with Yahoo, NSE, or SEBI. Educational research tool only.*
