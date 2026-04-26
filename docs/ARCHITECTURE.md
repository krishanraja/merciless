# Merciless — Technical Architecture

---

## 1. System overview

```
                         ┌─────────────────────────────┐
                         │  User browser (React 19 SPA)│
                         │  Hosted on Vercel            │
                         └──────────────┬───────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
┌───────────────────┐     ┌──────────────────────────────┐     ┌────────────────┐
│ Supabase Auth     │     │ Supabase Edge Functions      │     │ Stripe         │
│ Email + Password  │     │ (Deno runtime)               │     │ Checkout       │
│ Branded templates │     │                              │     │ Webhooks       │
└───────────────────┘     │ • natal-chart      [JWT]     │     └────────────────┘
                          │ • daily-reading    [JWT]     │
                          │ • oracle           [JWT+Pro] │
                          │ • create-checkout  [JWT]     │
                          │ • stripe-webhook   [Stripe]  │
                          │ • demo-reading     [Anon+RL] │
                          │ • transcribe-date  [Anon]    │
                          └────────────┬─────────────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                ▼                      ▼                      ▼
        ┌───────────────┐     ┌─────────────────┐     ┌───────────────┐
        │ Postgres 15   │     │ Google Gemini   │     │ OpenAI        │
        │ (Supabase)    │     │ 2.5 Flash       │     │ Whisper +     │
        │ + RLS         │     │ (primary LLM)   │     │ GPT-4o-mini   │
        └───────────────┘     └────────┬────────┘     │ (fallback +   │
                                       │              │  voice)       │
                                       └──fallback───►└───────────────┘

        ┌──────────────────────────────────────────────────────────────┐
        │ External: OpenStreetMap Nominatim (geocoding, client-side)   │
        └──────────────────────────────────────────────────────────────┘
```

- **Frontend:** Vite 8 + React 19 + Tailwind CSS v4, deployed as a static SPA on Vercel.
- **Auth:** Supabase email/password; user supplies access token to all authenticated edge functions.
- **Compute:** All business logic runs in Supabase Edge Functions (Deno). No Vercel functions.
- **AI:** Gemini-first, OpenAI fallback through `_shared/llm.ts`. Voice / date transcription uses Whisper + GPT-4o-mini.
- **Payments:** Stripe Checkout for subscription start; Stripe webhooks for lifecycle.

---

## 2. Data flows

### 2.1 Sign-up → onboarding → first reading

```
1. User signs up via AuthModal (supabase.auth.signUp, emailRedirectTo=/auth/callback).
2. Email confirmation only on signup; subsequent logins skip confirmation.
3. /auth/callback consumes the token and routes the user into the app.
4. App.tsx detects user without a chart → redirects to /onboarding.
5. User enters birth data through 3-step flow:
     a. Date — voice (Whisper + GPT-4o-mini) OR native picker.
     b. Time — optional; checkbox for 'unknown' (defaults to noon).
     c. Location — debounced Nominatim search; selecting a result fills lat/lng.
6. Frontend POSTs to natal-chart edge function with JWT in Authorization header.
7. natal-chart:
     a. Verifies JWT via supabase.auth.getUser(token).
     b. Converts birth date/time to Julian Day.
     c. Computes mean longitude for 12 bodies (10 planets + North Node + Chiron).
     d. Computes ascendant from RAMC + latitude; equal-house system.
     e. Calculates 5 aspect types (conjunction/sextile/square/trine/opposition).
     f. Upserts user_birth_data and natal_charts.
8. Frontend redirects to /reading.
9. useDailyReading checks for today's row; if absent, calls daily-reading function.
10. daily-reading:
     a. Verifies JWT.
     b. Loads natal_charts for user.
     c. Reads user_subscriptions to set is_free_tier flag.
     d. Computes today's transits (Sun..Saturn) vs. natal placements.
     e. Builds chart summary string + transit string.
     f. Calls callLLM (Gemini → OpenAI fallback) with Oracle system prompt.
     g. Parses JSON via DailyReadingLLMSchema (Zod). Falls back to safe stub on parse fail.
     h. Sanitizes em dashes from all text fields.
     i. Inserts into daily_readings.
11. Reading page shows headline only (free) or full reading+actions+transits (Pro).
```

### 2.2 Voice demo (no auth)

```
1. Visitor lands on Landing.tsx → TryMeSection.
2. Records voice via getUserMedia + MediaRecorder (audio/webm or audio/mp4).
3. POSTs audio to transcribe-date function (anon Bearer = anon key).
4. transcribe-date:
     a. Sends audio to OpenAI Whisper (whisper-1) with English language hint.
     b. Sends transcript to GPT-4o-mini for date interpretation → ISO + confidence.
     c. Validates parsed date is in the past, post-1900, valid calendar date.
5. Returns ISO date + display string + confidence + interpretation.
6. Frontend POSTs that ISO date to demo-reading function.
7. demo-reading:
     a. Computes per-fingerprint hash (IP + UA, SHA-256).
     b. Calls demo_rate_limit_bump RPC (atomic per-fingerprint hourly counter).
     c. Calls demo_global_budget_bump RPC (atomic per-UTC-day global counter).
     d. If either exceeds limit → 429.
     e. Computes Sun sign by month/day.
     f. Calls callLLM with sign-shadow-traits system prompt.
     g. Returns brutal_headline + excerpt (em dashes sanitized).
8. DemoResultCard displays headline; CTA to sign up for full reading.
```

### 2.3 Pro upgrade

```
1. User clicks 'Upgrade to Pro' → useSubscription.upgradeToPro().
2. Frontend POSTs to create-checkout with JWT.
3. create-checkout:
     a. Verifies JWT.
     b. Looks up existing stripe_customer_id; creates customer if missing.
     c. Creates Stripe Checkout session in 'subscription' mode with PRICE_ID.
     d. Stamps user_id + price_id into session metadata.
     e. Returns hosted Checkout URL.
4. User completes payment on Stripe.
5. Stripe POSTs checkout.session.completed → stripe-webhook.
6. stripe-webhook:
     a. Verifies signature using STRIPE_WEBHOOK_SECRET (constructEventAsync).
     b. Upserts user_subscriptions: status='active', stores customer/sub IDs.
7. User returns to /reading?upgraded=true → useSubscription refreshes → isPro=true.
8. Subsequent invoice/cancel events update status, current_period_end, cancel_at_period_end.
```

### 2.4 Oracle conversation (Pro-only)

```
1. Pro user navigates to /oracle.
2. User sends message; useOracle adds optimistic user bubble.
3. POST /oracle with JWT + { message, conversation_id? }.
4. oracle function:
     a. Verifies JWT.
     b. Confirms user_subscriptions.status === 'active' (else 403).
     c. Loads natal_charts.
     d. Loads conversation if conversation_id supplied AND user_id matches (ownership check).
     e. Truncates messages to last 20, caps each to 4000 chars.
     f. Builds chart context string + Oracle system prompt.
     g. Calls callLLM(maxTokens=512). Em dashes sanitized.
     h. Appends assistant message and persists conversation (insert or update).
     i. Returns { response, conversation_id }.
```

---

## 3. Database schema

### Entity relationship

```
auth.users (Supabase)
    │
    ├── 1:1 → user_birth_data
    ├── 1:1 → natal_charts
    ├── 1:N → daily_readings           (one per user per day, UNIQUE)
    ├── 1:N → oracle_conversations
    └── 1:1 → user_subscriptions

(public, service-role only)
demo_rate_limit                (per-fingerprint hourly counter)
demo_global_budget             (per-UTC-day global counter)
demo_rate_limit_bump()         security-definer RPC
demo_global_budget_bump()      security-definer RPC
```

### Tables

**user_birth_data** — birth data input
- `user_id` UUID UNIQUE, FK auth.users
- `birth_date` DATE NOT NULL
- `birth_time` TIME (nullable; noon used if null)
- `birth_location` TEXT NOT NULL
- `latitude`, `longitude` DECIMAL(10,7)
- `timezone` TEXT (browser-detected)

**natal_charts** — calculated chart
- `user_id` UUID UNIQUE
- `planets` JSONB — `{ "Sun": { sign, longitude, degree }, … }` (12 bodies)
- `houses` JSONB — `[{ house, sign, longitude }, …]`
- `aspects` JSONB — `[{ planet1, planet2, aspect, orb }, …]`
- `sun_sign`, `moon_sign`, `rising_sign`, `ascendant`, `midheaven` TEXT

**daily_readings** — one AI reading per user per day
- `user_id` UUID FK; `reading_date` DATE; UNIQUE(user_id, reading_date)
- `brutal_headline` TEXT — ≤15 words, no hedging
- `reading_text` TEXT — 150–200 words
- `stoic_actions` JSONB — `[{ action, why, difficulty: easy|medium|hard }]`
- `active_transits` JSONB — `[{ transiting_planet, natal_planet, aspect, orb, is_applying }]`
- `planet_focus` TEXT
- `intensity_level` INTEGER (1–10, CHECK constraint)
- `shareable_card_data` JSONB
- `is_free_tier` BOOLEAN

**oracle_conversations** — multi-turn chat
- `user_id` UUID FK
- `messages` JSONB DEFAULT `'[]'` — `[{ role, content, timestamp }]`
- `session_title` TEXT — first 50 chars of first user message

**user_subscriptions** — Stripe state
- `user_id` UUID UNIQUE
- `stripe_customer_id` TEXT UNIQUE
- `stripe_subscription_id` TEXT UNIQUE
- `stripe_price_id` TEXT
- `status` TEXT — `active` | `canceled` | `past_due` | `inactive`
- `current_period_end` TIMESTAMPTZ
- `cancel_at_period_end` BOOLEAN

**demo_rate_limit** — abuse protection (service-role only)
- `fingerprint` TEXT PRIMARY KEY (SHA-256 of IP + UA)
- `count` INT, `window_start` TIMESTAMPTZ, `updated_at` TIMESTAMPTZ
- Bumped via `demo_rate_limit_bump(p_fingerprint, p_window_seconds)` — atomic, resets per hour.

**demo_global_budget** — daily LLM-spend ceiling (service-role only)
- `day` DATE PRIMARY KEY (UTC), `count` INT, `updated_at` TIMESTAMPTZ
- Bumped via `demo_global_budget_bump()` — atomic, one row per UTC day.

### Row Level Security

Every user-owned table enforces `auth.uid() = user_id` for all operations. A separate service-role policy grants edge functions full access. The two `demo_*` tables are **service-role only** — no anon or authenticated access at all.

### Migrations

| File | Purpose |
|---|---|
| `20260406000000_initial_schema.sql` | All five user-owned tables + RLS |
| `20260424120000_demo_rate_limit.sql` | Demo rate-limit + global-budget tables and RPCs |

---

## 4. Edge functions

All functions live under `supabase/functions/`. They share two modules in `_shared/`:

- **`_shared/llm.ts`** — `callLLM({ system, messages, maxTokens, temperature })` returns `{ text, provider }`.
  Calls Gemini 2.5 Flash first; on failure (4xx auth/quota errors do **not** retry; 408/429 do; otherwise 2 attempts with 500/1000 ms backoff), falls back to OpenAI GPT-4o-mini. 30-second timeout per provider via `AbortSignal.timeout`.
- **`_shared/schemas.ts`** — Zod schemas for LLM JSON outputs (`DailyReadingLLMSchema`, `DemoReadingLLMSchema`) and `extractJsonObject(content)` to tolerate wrapped or partial JSON.

Auth model summary:

| Function | Auth required | Subscription gate |
|---|---|---|
| natal-chart | User JWT | — |
| daily-reading | User JWT | (subscription read for `is_free_tier`) |
| oracle | User JWT | `status='active'` (else 403) |
| create-checkout | User JWT | — |
| stripe-webhook | Stripe signature | — |
| demo-reading | None (anon key Bearer) | Postgres rate limits |
| transcribe-date | None (anon key Bearer) | — |

### natal-chart

- **Input:** `{ birth_date, birth_time?, birth_location, latitude?, longitude?, timezone? }`
- Verifies JWT, derives `user_id` from token. Body's `user_id` is **not** trusted.
- Julian-Day conversion → mean ecliptic longitude per planet (J2000 + first-order term).
- Bodies: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, NorthNode (mean), Chiron (approximate).
- Ascendant: `RAMC + 90 + lat * 0.5` (simplified). Equal-house, 30° each from ascendant.
- Aspects (5 types) computed pairwise with orbs 6°–8°.
- Upserts `user_birth_data` then `natal_charts`. Returns the chart row.
- **Note:** simplified mean-element model; not Swiss Ephemeris. Sufficient for product narrative; swap-in opportunity for higher-accuracy ephemeris.

### daily-reading

- Verifies JWT; reads `natal_charts` and `user_subscriptions`.
- Returns existing row if today's reading already exists (idempotent, one LLM call per user per day max).
- `getTodayTransits`: Sun..Saturn vs. natal planets, 5 aspects, orbs 3–5°.
- LLM call: `callLLM(maxTokens=1024)`. Output validated by `DailyReadingLLMSchema`. Em dashes stripped from all text.
- Inserts into `daily_readings`. Returns the saved row.
- **Failure modes:** missing chart → 500; LLM failure → 503; LLM JSON malformed → safe fallback row inserted with `brutal_headline: "The stars are speaking"`.

### oracle

- Verifies JWT; confirms `user_subscriptions.status === 'active'` (else 403).
- Loads chart for system prompt; loads conversation if `conversation_id` passed and ownership matches.
- Sliding window: last 20 messages, each ≤4000 chars.
- LLM call: `callLLM(maxTokens=512)`. Em dashes stripped.
- Persists conversation (insert or update). Returns `{ response, conversation_id }`.

### create-checkout

- Verifies JWT; uses `user.email` from token (not body).
- Reads existing `stripe_customer_id`; creates Stripe customer if missing.
- Creates Checkout Session in `subscription` mode with `STRIPE_PRICE_ID` (env or hardcoded fallback `price_1TJEo24w6vAdI2o57Rz8Cp3X`).
- Stamps `user_id` + `price_id` into session metadata; returns `{ url }`.
- Currency is determined by the Stripe Price object — must be USD.

### stripe-webhook

- Reads raw body + `stripe-signature` header.
- `STRIPE_WEBHOOK_SECRET` must be set; otherwise returns 400.
- Verifies via `stripe.webhooks.constructEventAsync` (Deno-friendly async variant).
- Handlers:
  - `checkout.session.completed` → upsert `user_subscriptions` `status='active'`, customer & sub IDs, price ID.
  - `customer.subscription.updated` → status, `current_period_end`, `cancel_at_period_end`.
  - `customer.subscription.deleted` → `status='canceled'`.
- Returns `{ received: true }`.

### demo-reading

- No auth required (anon Bearer); rate-limited.
- Per-fingerprint: 10 req/hour. Global: 2,000 LLM calls / UTC day. Both atomic in Postgres.
- Computes Sun sign by month/day (no chart math); calls `callLLM(maxTokens=256)` with sign-shadow-traits prompt.
- Returns `{ success, sun_sign, brutal_headline, excerpt, birth_date }`. Em dashes stripped.
- 503 on LLM failure (rate limit not consumed for downstream errors).

### transcribe-date

- Multipart `audio` file → OpenAI Whisper (`whisper-1`, English, prompt biased to spoken DOB phrasing).
- Whisper transcript → GPT-4o-mini (`temperature=0.1`) for date parsing → JSON `{ day, month, year, confidence, interpretation }`.
- Validates: real calendar date, ≥1900, ≤today.
- Returns `{ success, transcript, parsed: { iso, display, day, month, year, confidence, interpretation } }`.
- 503 on Whisper/GPT failure with user-friendly fallback message.

---

## 5. Frontend architecture

### Routing

| Route | Component | Auth | Pro |
|-------|-----------|------|-----|
| `/` | Landing (with TryMeSection) | No | — |
| `/auth/callback` | AuthCallback | — | — |
| `/onboarding` | Onboarding | Yes | — |
| `/reading` | Reading | Yes | Headline free, full reading Pro |
| `/oracle` | Oracle | Yes | Yes |
| `/chart` | Chart | Yes | Yes |
| `/settings` | Settings | Yes | — |
| `*` | NotFound | — | — |

`ProtectedRoute` redirects unauthenticated users to `/`. `App.tsx` redirects authenticated users away from `/`.

### Navigation

`AppNav.tsx` renders three layouts:
- Desktop top bar (≥md) with text links + brand mark.
- Mobile minimal top bar (logo only).
- Mobile fixed bottom tab bar (Reading / Chart / Oracle / Settings) with safe-area inset.

The bottom tab bar is `position: fixed; bottom: 0` and respects `env(safe-area-inset-bottom)`.

### Auth lifecycle

`App.tsx`:
1. `supabase.auth.getSession()` on mount → set user + loading false.
2. `onAuthStateChange` listener tracks state.
3. Detects unexpected session loss (was signed in, no explicit signout, now no session) → shows dismissible "Your session expired" toast.
4. Authenticated user on `/` redirects to `/reading`.
5. Authenticated user on `/reading` without a chart redirects to `/onboarding`.

### State management

No global store. State lives in 5 hooks:

| Hook | Responsibility |
|---|---|
| `useNatalChart` | Fetch / calculate the chart |
| `useDailyReading` | Fetch / generate today's reading |
| `useOracle` | Conversation state + send message |
| `useSubscription` | Subscription read + upgrade redirect |
| `useGeocoding` | Debounced + abortable Nominatim search |

Each hook owns its Supabase queries and loading/error state.

### Type safety

`src/types/supabase.ts` is the generated Database type. `src/lib/supabase.ts` exports `createClient<Database>(…)` so all queries are type-checked against the schema.

### Error handling

- `ErrorBoundary` wraps the router.
- `extractFunctionErrorMessage` in `lib/supabase.ts` unwraps Supabase Functions errors — the SDK returns a generic "Edge Function returned a non-2xx status code", but the real body is on `err.context` (a `Response`). The helper reads it as JSON or text and surfaces the actual error to the UI.

---

## 6. Brand-voice enforcement (in code)

Every LLM-output path strips em dashes via `sanitizeEmDashes` (`text.replace(/—/g, ";")`). All three system prompts (`oracle`, `daily-reading`, `demo-reading`) include the rule "NEVER use em dashes (—) — use commas, periods, semicolons, or colons instead. This is non-negotiable." Belt-and-suspenders enforcement keeps the brand voice consistent regardless of LLM provider drift.

---

## 7. Deployment topology

```
GitHub: krishanraja/merciless
   │
   ├── push to main
   │     │
   │     └─► Vercel auto-deploy
   │           ├── npm run build  (tsc + vite build)
   │           └── Static dist/ served as SPA
   │
   └── Edge functions
         └─► supabase functions deploy <name> --no-verify-jwt
             (functions verify JWT in code; flag prevents Supabase
              gateway from rejecting the demo/transcribe paths)
```

### Vercel

- Framework: Vite. Build: `tsc && vite build`. Output: `dist/`.
- `vercel.json`:
  - SPA rewrite (excludes `/api/`, `/assets/`, `/signs/`, `sitemap.xml`, `robots.txt`).
  - `cleanUrls: true`, `trailingSlash: false`.
  - `www.merciless.app` → `merciless.app` permanent redirect.
  - Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, HSTS preload, `Referrer-Policy: strict-origin-when-cross-origin`.
  - Long-cache immutable on `/assets/*` and `/signs/*`.
- All `VITE_*` env vars set in Vercel project settings.

### Supabase

- Project ref: `cgkcplcamsijghalintq`.
- Postgres 15. Edge Functions on Deno.
- All edge functions deployed with `--no-verify-jwt` (functions enforce JWT internally where required).
- Auth: email/password with branded confirmation templates. Email confirmation required only on signup.

---

## 8. Security model

- **Edge function input authority:** auth-required functions derive `user_id` from the verified JWT, **not** from the request body. Even if a body claims a different `user_id`, the function uses the token's user.
- **Demo abuse prevention:** SHA-256-hashed fingerprint (IP + UA), atomic Postgres counters, fail-closed on DB error (returns 429 if RPC fails) so we never run up an unbounded LLM bill from a counter outage.
- **Conversation ownership:** `oracle` re-checks `user_id` on every load of an existing conversation.
- **Webhook verification:** Stripe signature is mandatory; missing secret returns 400.
- **CORS:** all functions allow `*` origin with `authorization, x-client-info, apikey, content-type` headers (and `stripe-signature` on the webhook).
- **HTTP security headers:** set at the Vercel layer for all SPA responses.

---

## 9. Notable implementation details

- **Em-dash sanitization:** central rule in code AND prompts. See `sanitizeEmDashes` in every LLM-output function.
- **JSON parsing fallbacks:** `extractJsonObject` peels the first `{…}` from LLM output if `JSON.parse` fails. Behind that, Zod schema validation provides a safe stub if the shape is invalid.
- **Voice flow:** browser-side `MediaRecorder` records `audio/webm` (or `audio/mp4` fallback for Safari). `transcribe-date` does Whisper, then GPT-4o-mini for structured parse — two-stage so that parsing errors are explicit and recoverable.
- **Geocoding:** Nominatim is called from the browser with a `User-Agent` header and 300 ms debounce. AbortController cancels stale requests. Falls back to display-name parsing when `address` block is missing.
- **Idempotency:** `daily-reading` checks for an existing row by `(user_id, reading_date)` before calling the LLM, so refreshes do not produce a second reading.
- **Sign assets:** `public/signs/*.webp` cached for 1 year (immutable). Generated by `scripts/optimize-signs.mjs` (sharp).
