# Merciless

**Brutally honest astrology, backed by your actual natal chart.**

Live: [merciless.app](https://merciless.app)

Merciless is a subscription astrology SaaS. It calculates a real natal chart from a user's exact birth data, runs today's transits against that chart, and delivers an AI-generated daily reading that does not hedge. No sun-sign generalizations. No therapy language. No comfort. Just what the chart says.

Visitors can prove the product to themselves in under 30 seconds — speak their birth date into the landing page, get a sun-sign-grade brutal headline, and feel the tone before signing up.

---

## What it does

| Capability | Surface | Tier |
|---|---|---|
| Voice-driven demo reading (speak your birth date, get a brutal headline) | Landing page | Free / unauthenticated |
| Daily brutal headline (1 line) | `/reading` | Free |
| Full daily reading (150–200 words, chart-evidenced) | `/reading` | Pro |
| 3 difficulty-rated Stoic actions per day | `/reading` | Pro |
| Today's active transits vs. natal chart | `/reading` | Pro |
| The Oracle (multi-turn AI as your chart personified) | `/oracle` | Pro |
| Full natal chart viewer (planets, houses, aspects) | `/chart` | Pro |
| Shareable 9:16 PNG cards (TikTok/IG/Twitter format) | `/reading` | Pro |
| Voice-first onboarding (Whisper-transcribed birth date) | `/onboarding` | All users |
| City autocomplete with lat/lng resolution | `/onboarding` | All users |

---

## Why it sells

- **Differentiation that's unmistakable.** Co-Star is vague. Chani is gentle. The Pattern is mood-board. Merciless is the only voice in the category that says *what is*, with chart evidence.
- **Try-before-you-buy on the landing page.** No signup required to feel the product — a 30-second voice demo with global rate limiting and a daily LLM budget cap protecting unit economics.
- **Built for virality.** Every Pro reading exports a 9:16 share card with the brutal headline locked in brand colors — designed to be screenshotted into TikTok / IG Stories / X.
- **$4.99/mo price = under-$3 CAC works.** Shareable hooks + voice demo + low friction onboarding = sub-$3 CAC and a 10:1 target LTV:CAC.
- **Agent-ready architecture.** Every edge function is a JWT-secured JSON API with stable response contracts — sales/marketing AI agents can plug into the same APIs the app uses.

See [docs/PRODUCT.md](docs/PRODUCT.md) for the full ICP, positioning, sales anchors, and outcomes that AI agents can sell against.

---

## Business model

| Tier | Price | What's included |
|------|-------|-----------------|
| Free | $0 | Voice demo (landing), daily brutal headline, natal chart calculation |
| Pro | $4.99 / month | Full reading, Stoic actions, transit analysis, The Oracle (unlimited), full chart viewer, share cards |

- **Stripe Product:** `prod_UHoQV8ymZNk4Um`
- **Stripe Price:** `price_1TJEo24w6vAdI2o57Rz8Cp3X` (USD, monthly recurring)

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4, react-router-dom 7 |
| Backend | Supabase (Auth, Postgres 15, Edge Functions on Deno) |
| AI — primary | Google Gemini 2.5 Flash (`gemini-2.5-flash`) |
| AI — fallback | OpenAI GPT-4o-mini (`gpt-4o-mini`) |
| Voice transcription | OpenAI Whisper (`whisper-1`) |
| Date interpretation | OpenAI GPT-4o-mini (parses spoken dates → ISO) |
| Geocoding | OpenStreetMap Nominatim (city → lat/lng) |
| Payments | Stripe (Checkout + Webhooks, `stripe@14.21.0`) |
| Hosting | Vercel (SPA, security headers, edge cache) |
| Domain | merciless.app (`www` redirects to apex) |

LLM strategy: Gemini is called first (cost optimal). On failure (4xx auth/quota excluded from retry, otherwise 2 attempts with backoff), OpenAI takes over. See `supabase/functions/_shared/llm.ts`.

---

## Quick start

```bash
git clone https://github.com/krishanraja/merciless.git
cd merciless
npm install
cp .env.example .env.local   # fill in values below
npm run dev                  # http://localhost:5173
```

Required client env vars (`.env.local` and Vercel):

| Var | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_live_…`) |
| `VITE_STRIPE_PRICE_ID` | Stripe price ID for Pro |

See [docs/SETUP.md](docs/SETUP.md) for the full reproducible setup including Supabase secrets, edge function deployment, Stripe webhook configuration, and Vercel deploy.

---

## Project structure

```
merciless/
├── src/
│   ├── App.tsx                     Router, auth state, session-expired toast, protected routes
│   ├── pages/
│   │   ├── Landing.tsx             Hero + voice demo (TryMeSection) + CTA
│   │   ├── AuthCallback.tsx        Email confirmation redirect handler
│   │   ├── Onboarding.tsx          3-step birth-data flow with voice + geocoding
│   │   ├── Reading.tsx             Daily reading (free headline / pro full)
│   │   ├── Oracle.tsx              Pro-only Oracle chat
│   │   ├── Chart.tsx               Pro-only natal chart viewer
│   │   ├── Settings.tsx            Account, subscription, birth data
│   │   └── NotFound.tsx
│   ├── components/
│   │   ├── AppNav.tsx              Desktop top nav + mobile bottom tab bar
│   │   ├── AuthModal.tsx           Email/password signin/signup modal
│   │   ├── DemoResultCard.tsx      Brutal headline shown after voice demo
│   │   ├── DemoShareCard.tsx       Demo screenshot/share helper
│   │   ├── ErrorBoundary.tsx       Top-level error boundary
│   │   ├── OracleChat.tsx          Oracle chat UI with example prompts
│   │   ├── PlanetTable.tsx         Planetary positions table
│   │   ├── ShareCard.tsx           9:16 PNG generator (html2canvas, 2x scale)
│   │   ├── SignBadge.tsx           Zodiac sign with .webp asset
│   │   ├── StarfieldBg.tsx         Animated canvas starfield
│   │   ├── StoicActionCard.tsx     Difficulty-rated action card
│   │   ├── TransitBadge.tsx        Transit aspect badges
│   │   ├── TryMeSection.tsx        Landing-page voice demo flow
│   │   └── VoiceDateInput.tsx      Mic-record + Whisper + GPT date parser
│   ├── hooks/
│   │   ├── useDailyReading.ts      Fetch/generate today's reading
│   │   ├── useGeocoding.ts         Nominatim search, debounced + abortable
│   │   ├── useNatalChart.ts        Fetch/calculate natal chart
│   │   ├── useOracle.ts            Oracle conversation state
│   │   └── useSubscription.ts      Stripe subscription status + upgrade
│   ├── lib/
│   │   ├── astrology.ts            Zodiac constants, glyphs, intensity labels
│   │   ├── signAssets.ts           Sign → image asset map (.webp)
│   │   ├── stripe.ts               Stripe client, checkout session creation
│   │   └── supabase.ts             Typed client, auth helpers, error extractor
│   └── types/
│       └── supabase.ts             Generated Database types (source of truth)
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── llm.ts              Gemini primary + OpenAI fallback, retries
│   │   │   └── schemas.ts          Zod schemas for LLM JSON outputs
│   │   ├── natal-chart/            JWT-auth; calculate chart from birth data
│   │   ├── daily-reading/          JWT-auth; LLM reading + transit calc
│   │   ├── oracle/                 JWT-auth + Pro-gated; multi-turn chat
│   │   ├── demo-reading/           Anon; rate-limited landing-page demo
│   │   ├── transcribe-date/        Anon; Whisper + GPT-4o-mini date parse
│   │   ├── create-checkout/        JWT-auth; Stripe checkout session
│   │   └── stripe-webhook/         Stripe-signed; subscription lifecycle
│   ├── migrations/
│   │   ├── 20260406000000_initial_schema.sql
│   │   └── 20260424120000_demo_rate_limit.sql
│   └── config.toml
├── public/
│   ├── signs/                       12 zodiac .webp images (cached 1y)
│   ├── merciless {orange|black|white} {icon|logo}.png
│   ├── og-image.png, sitemap.xml, robots.txt, site.webmanifest
│   └── favicons (16/32/192/512/apple-touch)
├── scripts/optimize-signs.mjs        Sharp-based image pipeline
├── vercel.json                       Security headers, redirects, SPA rewrites
└── docs/                             SETUP / ARCHITECTURE / PRODUCT / DESIGN-SYSTEM / API
```

---

## Documentation

| Document | What it covers |
|----------|----------------|
| [docs/SETUP.md](docs/SETUP.md) | Reproduce the entire stack from scratch — Supabase, edge functions, Stripe, Vercel, all env vars and secrets |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagram, data flows, edge function specs, schema ERD, RLS, deploy topology |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Vision, ICP, personas, benefits, outcomes, sales/marketing anchors, GTM playbook, brand voice |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Colors, typography, components, share card spec, mobile tab bar, brand assets |
| [docs/API.md](docs/API.md) | Edge function HTTP API reference (auth model, requests, responses, errors) |

---

## Key URLs

| Resource | URL / ID |
|----------|----------|
| Live app | https://merciless.app |
| GitHub | https://github.com/krishanraja/merciless |
| Vercel project | `prj_dOqUt1MgtzJrSDSA99d7lAxuqKky` |
| Supabase project ref | `cgkcplcamsijghalintq` |
| Stripe product | `prod_UHoQV8ymZNk4Um` |
| Stripe price | `price_1TJEo24w6vAdI2o57Rz8Cp3X` |
