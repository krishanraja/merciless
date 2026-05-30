# Merciless

**Brutally honest astrology, backed by your actual natal chart.**

Live: [merciless.app](https://merciless.app)

Merciless is a subscription astrology SaaS. It computes a real natal chart from a user's exact birth data, runs today's transits against that chart, and delivers an AI-generated daily reading that does not hedge. No sun-sign generalizations. No therapy language. No comfort. Just what the chart says.

Positions are computed by a real ephemeris (astronomy-engine, JPL-grade), accurate to the arc-minute. You can verify any placement against any calculator.

Visitors can prove the product to themselves in under 30 seconds: speak or type their birth date on the landing page, get a chart-evidenced brutal headline, and feel the tone before signing up.

---

## What it does

| Capability | Surface | Tier |
|---|---|---|
| Voice/text demo reading (speak your birth date, get a brutal headline from a real date-only chart) | Landing page | Free / unauthenticated |
| Daily brutal headline (1 line) | `/reading` | Free |
| Full daily reading (150-200 words, chart-evidenced) | `/reading` | Pro |
| 3 difficulty-rated Stoic actions per day | `/reading` | Pro |
| Today's active transits vs. natal chart | `/reading` | Pro |
| The Oracle (multi-turn AI as your chart personified) | `/oracle` | Pro |
| Full natal chart viewer (planets, houses, aspects) | `/chart` | Pro |
| Shareable 9:16 PNG cards (TikTok/IG/Twitter format) | `/reading` | Pro |
| Voice-first onboarding (Whisper-transcribed birth date) | `/onboarding` | All users |
| City autocomplete with lat/lng resolution | `/onboarding` | All users |

---

## Accuracy

The ephemeris is real, not simplified. `supabase/functions/_shared/ephemeris.ts` computes tropical positions of date with [astronomy-engine](https://github.com/cosinekitty/astronomy), which matches JPL to arc-seconds for planets and roughly one arc-minute for the Moon. The old mean-element math and its fabricated ascendant are gone.

What is guaranteed to the arc-minute (verified in `supabase/functions/_shared/ephemeris.test.ts`):

- Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto.
- The Ascendant and Midheaven, computed from real sidereal time and obliquity (the test asserts the MC right ascension equals the RAMC and the Ascendant altitude is 0).
- Whole-sign house cusps (the primary system) and equal house cusps.
- Aspects with orbs and applying/separating state.
- Retrograde state and daily speed, derived from real daily motion.

Labelled approximate, and NOT part of the arc-minute guarantee: the mean Lunar Node and Chiron. The brand promise rests only on the bodies and angles above.

When birth time or place is unknown, the angles and houses are OMITTED, never fabricated. The date-only demo returns the Sun (sign and degree), the Moon (with `moon_sign` set to null when the date crosses a sign boundary), and the sharpest aspect among the slow bodies.

Longitudes are tropical, apparent, referred to the true ecliptic and equinox of date, so they match what astro.com prints. The shared engine powers `natal-chart`, `daily-reading` (transits), and `demo-reading`.

---

## Why it sells

- **Differentiation that's unmistakable.** Co-Star is vague. Chani is gentle. The Pattern is mood-board. Merciless is the only voice in the category that says *what is*, with chart evidence you can verify to the arc-minute.
- **Try-before-you-buy on the landing page.** No signup required to feel the product: a 30-second voice demo with per-fingerprint rate limiting and a global daily LLM budget cap protecting unit economics.
- **Built for virality.** Every Pro reading exports a 9:16 share card with the brutal headline locked in brand colors, designed to be screenshotted into TikTok / IG Stories / X.
- **$4.99/mo price = under-$3 CAC works.** Shareable hooks plus voice demo plus low-friction onboarding target a sub-$3 CAC and a 10:1 LTV:CAC.
- **Agent-ready architecture.** Every edge function is a JSON API with stable response contracts. Sales and marketing AI agents can plug into the same APIs the app uses, and a first-party attribution spine ties every signup and dollar back to the campaign that drove it.

See [docs/PRODUCT.md](docs/PRODUCT.md) for the full ICP, positioning, sales anchors, and outcomes that AI agents can sell against.

---

## For AI agents (machine-readable product truth)

The fleet sells and markets from these files, not from this README:

| Source | What it is |
|--------|------------|
| [public/offer.json](public/offer.json) | The single machine-readable source of product and offer truth (pricing, ICP, positioning, sales anchors, brand voice, API contracts, attribution). Poll this; do not re-derive. |
| [public/llms.txt](public/llms.txt) | The agent entry point. A short, plain-text brief that points to offer.json and states the honesty constraints. |
| [docs/AGENT_BRIEFING.md](docs/AGENT_BRIEFING.md) | The deeper agent briefing: how to call the APIs, attribution tagging, and brand-voice rules. |

Both `offer.json` and `llms.txt` are served at the domain root (`https://merciless.app/offer.json`, `https://merciless.app/llms.txt`).

**Trust constraints.** Say "accurate to the arc-minute" and "verify it against any calculator". Do NOT claim Chiron or the lunar node are arc-minute exact. Do NOT invent ratings or user counts: there is no aggregate rating and no social-proof headcount on this product, and none may be reintroduced.

---

## Brand voice

All app-generated text passes the shared brand-voice engine, `supabase/functions/_shared/brand-voice.ts`, wired into `demo-reading`, `daily-reading`, and `oracle`.

- `sanitizeVoice` removes em dashes by context (replacing with a comma, colon, or period as the surrounding text requires).
- `lintVoice` flags hedging, negative parallelism ("it is not X, it is Y"), and rule-of-three padding.
- **HARD RULE everywhere, including this repo's docs: no em dashes.** Use commas, colons, periods, or parentheses.

---

## Attribution

Every signup and dollar is attributable back to the campaign that drove it.

- The client (`src/lib/attribution.ts`) mints a first-party `mcl_cid` and captures first-touch UTM, agent, referrer, and landing path. It survives the email-confirm wall via localStorage, a cookie, and auth `user_metadata`.
- It emits funnel events (`landed`, `demo_played`, `signed_up`, `chart_calculated`, `activated`, `paywall_hit`) to the `track` edge function, which forwards them to the Mindmaker OS warehouse front door (`ingest-attribution`) using `x-attribution-secret`.
- `create-checkout` stamps the attribution onto both the Stripe customer and the subscription metadata.
- `stripe-webhook` runs an idempotency ledger (`stripe_processed_events`) and emits `purchased`, `refunded`, and `churned` to the warehouse.
- Read models in the warehouse: `attribution.funnel_by_campaign` (Maya, CAC) and `attribution.revenue_by_campaign` (Leo, LTV).

Tag fleet links like:

```
https://merciless.app/?utm_source=tiktok&utm_medium=organic&utm_campaign=brutal_headline&agent=cleo&mcl_cid=<optional>
```

The only warehouse credential the app holds is the `ATTRIBUTION_INGEST_SECRET` env var.

---

## Security and entitlements

- `user_subscriptions` is READ-ONLY to clients (RLS `FOR SELECT` only). Only the Stripe webhook, running with the service role, writes subscription status. This closes a hole where a free user could self-grant Pro through the REST API.
- `transcribe-date` is capped: a per-fingerprint hourly rate limit, a global daily budget, a 6 MB audio size limit, and 20-second timeouts. It was previously unauthenticated and uncapped.
- Owner tables carry explicit `WITH CHECK` clauses, plus `updated_at` triggers and a generalized `api_global_budget` table with an `api_global_budget_bump` RPC.

Migrations: `20260530120000_phase2_entitlement_hardening.sql` (entitlement hardening, indexes, triggers, budget) and `20260530130000_stripe_idempotency.sql` (the processed-events ledger).

---

## Business model

| Tier | Price | What's included |
|------|-------|-----------------|
| Free | $0 | Voice demo (landing), daily brutal headline, natal chart calculation |
| Pro | $4.99 / month | Full reading, Stoic actions, transit analysis, The Oracle (unlimited), full chart viewer, share cards |

- **Stripe account:** `mindmaker_llc`
- **Stripe Product:** `prod_UHoQV8ymZNk4Um`
- **Stripe Price:** `price_1TJEo24w6vAdI2o57Rz8Cp3X` (USD, monthly recurring)

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4, react-router-dom 7 |
| Backend | Supabase (Auth, Postgres 15, Edge Functions on Deno) |
| Ephemeris | astronomy-engine 2.1.19 (JPL-grade, arc-minute accurate) |
| AI - primary | Google Gemini 2.5 Flash (`gemini-2.5-flash`) |
| AI - fallback | OpenAI GPT-4o-mini (`gpt-4o-mini`) |
| Voice transcription | OpenAI Whisper (`whisper-1`) |
| Date interpretation | OpenAI GPT-4o-mini (parses spoken dates to ISO) |
| Geocoding | OpenStreetMap Nominatim (city to lat/lng) |
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
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_live_...`) |
| `VITE_STRIPE_PRICE_ID` | Stripe price ID for Pro |

Server-side secret of note: `ATTRIBUTION_INGEST_SECRET` (the warehouse ingest credential used by the `track` and `stripe-webhook` functions).

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
│   ├── components/                 AppNav, AuthModal, DemoResultCard, DemoShareCard,
│   │                               ErrorBoundary, OracleChat, PlanetTable, ShareCard,
│   │                               SignBadge, StarfieldBg, StoicActionCard, TransitBadge,
│   │                               TryMeSection, VoiceDateInput
│   ├── hooks/                      useDailyReading, useGeocoding, useNatalChart,
│   │                               useOracle, useSubscription
│   ├── lib/
│   │   ├── astrology.ts            Zodiac constants, glyphs, intensity labels
│   │   ├── attribution.ts          First-party mcl_cid + first-touch capture + funnel emit
│   │   ├── signAssets.ts           Sign to image asset map (.webp)
│   │   ├── stripe.ts               Stripe client, checkout session creation
│   │   └── supabase.ts             Typed client, auth helpers, error extractor
│   └── types/
│       └── supabase.ts             Generated Database types (source of truth)
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── ephemeris.ts        Real ephemeris (astronomy-engine), arc-minute
│   │   │   ├── ephemeris.test.ts   Verifies MC = RAMC, Asc altitude 0, precession of date
│   │   │   ├── brand-voice.ts      sanitizeVoice (em-dash removal) + lintVoice
│   │   │   ├── brand-voice.test.ts Brand-voice rule coverage
│   │   │   ├── attribution.ts      Shared attribution helpers
│   │   │   ├── llm.ts              Gemini primary + OpenAI fallback, retries
│   │   │   └── schemas.ts          Zod schemas for LLM JSON outputs
│   │   ├── natal-chart/            JWT-auth; chart from birth data via shared engine
│   │   ├── daily-reading/          JWT-auth; LLM reading + real transit calc
│   │   ├── oracle/                 JWT-auth + Pro-gated; multi-turn chat
│   │   ├── demo-reading/           Anon; rate-limited date-only chart + brutal headline
│   │   ├── transcribe-date/        Anon; capped Whisper + GPT-4o-mini date parse
│   │   ├── create-checkout/        JWT-auth; Stripe checkout + attribution stamping
│   │   ├── stripe-webhook/         Stripe-signed; subscription lifecycle + idempotency
│   │   └── track/                  Anon; funnel events forwarded to the OS warehouse
│   ├── migrations/
│   │   ├── 20260406000000_initial_schema.sql
│   │   ├── 20260424120000_demo_rate_limit.sql
│   │   ├── 20260530120000_phase2_entitlement_hardening.sql
│   │   └── 20260530130000_stripe_idempotency.sql
│   └── config.toml
├── public/
│   ├── offer.json                  Machine-readable product/offer truth (fleet polls this)
│   ├── llms.txt                    Agent entry point
│   ├── signs/                      12 zodiac .webp images (cached 1y)
│   ├── og-image.png, sitemap.xml, robots.txt, site.webmanifest
│   └── favicons + brand logo PNGs
├── scripts/optimize-signs.mjs        Sharp-based image pipeline
├── vercel.json                       Security headers, redirects, SPA rewrites
└── docs/                             SETUP / ARCHITECTURE / PRODUCT / DESIGN-SYSTEM / API / AGENT_BRIEFING
```

---

## Documentation

| Document | What it covers |
|----------|----------------|
| [docs/SETUP.md](docs/SETUP.md) | Reproduce the entire stack from scratch: Supabase, edge functions, Stripe, Vercel, all env vars and secrets |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagram, data flows, edge function specs, schema ERD, RLS, deploy topology |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Vision, ICP, personas, benefits, outcomes, sales/marketing anchors, GTM playbook, brand voice |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Colors, typography, components, share card spec, mobile tab bar, brand assets |
| [docs/API.md](docs/API.md) | Edge function HTTP API reference (auth model, requests, responses, errors) |
| [docs/AGENT_BRIEFING.md](docs/AGENT_BRIEFING.md) | Agent briefing: how to call the APIs, attribution tagging, honesty and brand-voice rules |

For machine consumption, see [public/offer.json](public/offer.json) and [public/llms.txt](public/llms.txt).

---

## Key URLs

| Resource | URL / ID |
|----------|----------|
| Live app | https://merciless.app |
| Machine-readable offer | https://merciless.app/offer.json |
| Agent entry point | https://merciless.app/llms.txt |
| GitHub | https://github.com/krishanraja/merciless |
| Vercel project | `prj_dOqUt1MgtzJrSDSA99d7lAxuqKky` |
| Supabase project ref | `cgkcplcamsijghalintq` |
| Attribution warehouse | `gojpffsrxybbpbdzzrvs` (attribution schema) |
| Stripe account | `mindmaker_llc` |
| Stripe product | `prod_UHoQV8ymZNk4Um` |
| Stripe price | `price_1TJEo24w6vAdI2o57Rz8Cp3X` |
