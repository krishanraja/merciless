# Merciless

**Brutally honest astrology, backed by your actual natal chart.**

Merciless is a subscription astrology SaaS that calculates real natal charts from birth data and delivers AI-powered daily readings through Claude. No sun sign generalizations. No comfort. Just what the chart says.

## What It Does

- **Natal Chart Calculation** — Calculates planetary positions, house cusps, and aspects from exact birth data (date, time, location)
- **Daily Readings** — AI-generated readings grounded in today's transits against the user's natal chart. Brutally honest, chart-evidenced, no hedging
- **The Oracle** — A conversational AI that speaks as the user's natal chart personified. Answers questions about patterns, wounds, timing, decisions
- **Stoic Actions** — Three difficulty-rated daily actions backed by chart data
- **Share Cards** — Generates downloadable PNG cards of daily reading headlines for social sharing

## Business Model

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Daily headline only |
| Pro | $4.99/mo | Full reading, Stoic actions, transit analysis, Oracle, chart viewer, share cards |

**Stripe Product:** `prod_UHoQV8ymZNk4Um`
**Stripe Price:** `price_1TJEo24w6vAdI2o57Rz8Cp3X`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Supabase (Auth, Postgres, Edge Functions) |
| AI | Anthropic Claude API (claude-sonnet-4-6) |
| Payments | Stripe (Checkout + Webhooks) |
| Hosting | Vercel |
| Domain | merciless.app |

## Quick Start

```bash
git clone https://github.com/krishanraja/merciless.git
cd merciless
npm install
```

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required env vars:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key
- `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key
- `VITE_STRIPE_PRICE_ID` — Stripe price ID for Pro subscription

```bash
npm run dev
```

See [docs/SETUP.md](docs/SETUP.md) for full setup instructions including Supabase, Stripe, and Vercel configuration.

## Project Structure

```
merciless/
src/
  App.tsx                         Router + auth state + protected routes
  pages/
    Landing.tsx                   Homepage with auth forms + example reading
    Onboarding.tsx                3-step birth data collection
    Reading.tsx                   Daily reading display (free/pro gating)
    Oracle.tsx                    Pro-only Oracle chat interface
    Chart.tsx                     Pro-only natal chart viewer
    Settings.tsx                  Account, subscription, birth data management
  components/
    OracleChat.tsx                Chat UI with example prompts
    ShareCard.tsx                 9:16 PNG card generator via html2canvas
    StoicActionCard.tsx           Difficulty-rated action cards
    PlanetTable.tsx               Planetary positions table
    StarfieldBg.tsx               Animated canvas starfield background
    TransitBadge.tsx              Transit aspect badges
  hooks/
    useDailyReading.ts            Fetch/generate today's reading
    useNatalChart.ts              Fetch/calculate natal chart
    useOracle.ts                  Oracle conversation state
    useSubscription.ts            Stripe subscription status + upgrade
  lib/
    supabase.ts                   Client init, auth helpers, TypeScript types
    stripe.ts                     Stripe client, checkout session creation
    astrology.ts                  Zodiac constants, glyphs, formatting utils
supabase/
  functions/
    natal-chart/index.ts          Calculate natal chart from birth data
    daily-reading/index.ts        Generate AI daily reading via Claude
    oracle/index.ts               Multi-turn Oracle conversation via Claude
    create-checkout/index.ts      Create Stripe checkout session
    stripe-webhook/index.ts       Handle Stripe subscription events
  migrations/
    20260406000000_initial_schema.sql
```

## Documentation

| Document | Description |
|----------|-------------|
| [docs/SETUP.md](docs/SETUP.md) | Complete setup guide — replicate the entire stack from scratch |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical architecture, data flow, edge function specs |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Product vision, positioning, target audience, acquisition strategy |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Colors, typography, components, tone of voice |
| [docs/API.md](docs/API.md) | Edge function API reference |

## Key URLs

| Resource | URL |
|----------|-----|
| Live App | https://merciless.app |
| Vercel Dashboard | Vercel project `prj_dOqUt1MgtzJrSDSA99d7lAxuqKky` |
| Supabase Dashboard | Project ref `cgkcplcamsijghalintq` |
| Stripe Dashboard | Product `prod_UHoQV8ymZNk4Um` |
| GitHub | https://github.com/krishanraja/merciless |
