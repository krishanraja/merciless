# Merciless — Technical Architecture

---

## System Overview

```
User Browser (React SPA on Vercel)
    │
    ├── Supabase Auth (email/password)
    ├── Supabase Postgres (data storage)
    ├── Supabase Edge Functions (business logic)
    │       ├── natal-chart      → astronomical calculations
    │       ├── daily-reading    → Claude API → AI reading
    │       ├── oracle           → Claude API → conversational AI
    │       ├── create-checkout  → Stripe API → checkout session
    │       └── stripe-webhook   → Stripe → subscription updates
    ├── Stripe (payments & subscriptions)
    └── Anthropic Claude API (AI generation)
```

---

## Data Flow

### 1. Sign Up → Onboarding → First Reading

```
1. User signs up via Supabase Auth (email/password)
2. App redirects to /onboarding
3. User enters birth data (date, time, location)
4. Frontend calls natal-chart edge function
5. Edge function:
   a. Converts birth date/time to Julian Day
   b. Calculates mean longitude for 12 celestial bodies
   c. Computes houses from ascendant
   d. Finds aspects between planets
   e. Upserts user_birth_data + natal_charts
6. Frontend redirects to /reading
7. useDailyReading hook checks for today's reading
8. No reading exists → calls daily-reading edge function
9. Edge function:
   a. Loads natal chart from DB
   b. Calculates today's transits vs natal planets
   c. Builds chart summary string
   d. Calls Claude with Oracle system prompt
   e. Parses JSON response
   f. Inserts into daily_readings
10. Reading displays with headline (free) or full content (pro)
```

### 2. Pro Upgrade Flow

```
1. User clicks "Upgrade to Pro"
2. useSubscription.upgradeToPro() calls createCheckoutSession()
3. Frontend POSTs to create-checkout edge function
4. Edge function:
   a. Creates/retrieves Stripe customer
   b. Creates checkout session with price_id
   c. Returns session URL
5. Frontend redirects to Stripe Checkout
6. User completes payment
7. Stripe fires checkout.session.completed webhook
8. stripe-webhook edge function:
   a. Validates signature (if STRIPE_WEBHOOK_SECRET set)
   b. Extracts user_id from session metadata
   c. Upserts user_subscriptions with status=active
9. User returns to /reading?upgraded=true
10. useSubscription loads subscription → isPro=true
11. Full content unlocks
```

### 3. Oracle Conversation

```
1. Pro user navigates to /oracle
2. User types message
3. useOracle.sendMessage():
   a. Adds optimistic user message to state
   b. Calls oracle edge function
4. Edge function:
   a. Verifies pro subscription
   b. Loads natal chart
   c. Loads/creates oracle_conversations record
   d. Builds system prompt with chart context
   e. Sends last 20 messages to Claude
   f. Stores response in conversation
   g. Returns response + conversation_id
5. Frontend adds assistant message to state
```

---

## Database Schema

### Entity Relationship

```
auth.users (Supabase Auth)
    │
    ├── 1:1 → user_birth_data
    ├── 1:1 → natal_charts
    ├── 1:N → daily_readings (one per day)
    ├── 1:N → oracle_conversations
    └── 1:1 → user_subscriptions
```

### Table Details

**user_birth_data** — Birth information input by user
- `user_id` UUID (unique, FK → auth.users)
- `birth_date` DATE (required)
- `birth_time` TIME (nullable — noon used if unknown)
- `birth_location` TEXT (required, freeform city/country)
- `latitude`, `longitude` DECIMAL (optional, for precise calculation)
- `timezone` TEXT (auto-detected from browser)

**natal_charts** — Calculated chart data
- `user_id` UUID (unique, FK → auth.users)
- `planets` JSONB — `{"Sun": {"sign": "Scorpio", "longitude": 215.3, "degree": 5.3}, ...}`
- `houses` JSONB — `[{"house": 1, "sign": "Virgo", "longitude": 170.5}, ...]`
- `aspects` JSONB — `[{"planet1": "Sun", "planet2": "Moon", "aspect": "trine", "orb": 2.5}, ...]`
- `sun_sign`, `moon_sign`, `rising_sign` TEXT
- `ascendant`, `midheaven` TEXT

**daily_readings** — One AI-generated reading per user per day
- `user_id` UUID (FK), `reading_date` DATE (unique together)
- `brutal_headline` TEXT — 15-word max, unhedged
- `reading_text` TEXT — 150-200 words, chart-evidenced
- `stoic_actions` JSONB — `[{"action": "...", "why": "...", "difficulty": "easy|medium|hard"}]`
- `active_transits` JSONB — `[{"transiting_planet": "Mars", "natal_planet": "Venus", "aspect": "square", "orb": 2.1, "is_applying": true}]`
- `planet_focus` TEXT — primary driver
- `intensity_level` INTEGER 1-10
- `shareable_card_data` JSONB — pre-computed share card fields

**oracle_conversations** — Multi-turn Oracle threads
- `user_id` UUID (FK)
- `messages` JSONB — `[{"role": "user"|"assistant", "content": "...", "timestamp": "..."}]`
- `session_title` TEXT — first 50 chars of first message

**user_subscriptions** — Stripe subscription state
- `user_id` UUID (unique, FK)
- `stripe_customer_id`, `stripe_subscription_id` TEXT (unique)
- `status` TEXT — `active`, `canceled`, `past_due`, `inactive`
- `current_period_end` TIMESTAMPTZ
- `cancel_at_period_end` BOOLEAN

### Row Level Security

All tables enforce `auth.uid() = user_id` for user access. Service role has full access for edge functions.

---

## Edge Functions

### natal-chart

**Purpose:** Calculate natal chart from birth data
**Runtime:** Deno (Supabase Edge Function)
**Auth:** `--no-verify-jwt` (user_id passed in body)

Calculation approach:
1. Birth date/time → Julian Day
2. Mean orbital elements → approximate ecliptic longitude for each planet
3. 12 celestial bodies: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, North Node, Chiron
4. Ascendant calculated from RAMC + latitude
5. Equal house system (30-degree houses from ascendant)
6. Aspects: conjunction (8-degree orb), sextile (6-degree), square (8-degree), trine (8-degree), opposition (8-degree)

> **Note:** Uses simplified mean orbital elements, not Swiss Ephemeris. Accuracy is approximate but sufficient for the product's purpose. For higher accuracy, integrate a proper ephemeris library.

### daily-reading

**Purpose:** Generate AI daily reading
**External calls:** Anthropic Claude API
**Model:** claude-sonnet-4-6
**Max tokens:** 1024

AI prompt structure:
- System: Oracle persona (brutal, chart-evidenced, no hedging)
- User: Chart summary + today's transits + JSON response format
- Response: Parsed as JSON with fallback regex extraction

### oracle

**Purpose:** Multi-turn Oracle conversation
**External calls:** Anthropic Claude API
**Model:** claude-sonnet-4-6
**Max tokens:** 512
**Gate:** Requires active subscription (checks user_subscriptions)

Context: Last 20 messages of conversation + natal chart summary in system prompt.

### create-checkout

**Purpose:** Create Stripe checkout session
**External calls:** Stripe API

Creates or retrieves Stripe customer, then creates a subscription checkout session with user_id in metadata.

### stripe-webhook

**Purpose:** Handle Stripe subscription lifecycle events
**External calls:** None (receives from Stripe)

Events handled:
- `checkout.session.completed` → upsert subscription as active
- `customer.subscription.updated` → update status and period
- `customer.subscription.deleted` → mark as canceled

---

## Frontend Architecture

### Routing

| Route | Page | Auth | Pro |
|-------|------|------|-----|
| `/` | Landing | No | — |
| `/onboarding` | Onboarding | Yes | — |
| `/reading` | Reading | Yes | Partial (headline free, rest pro) |
| `/oracle` | Oracle | Yes | Yes |
| `/chart` | Chart | Yes | Yes |
| `/settings` | Settings | Yes | — |

### State Management

No global state library. All state via React hooks:

- `useNatalChart` — chart data + calculation
- `useDailyReading` — today's reading + generation
- `useOracle` — conversation messages + sending
- `useSubscription` — subscription status + upgrade

Each hook manages its own Supabase queries and loading/error states.

### Auth Flow

`App.tsx` initializes auth on mount:
1. `supabase.auth.getSession()` → set user
2. `supabase.auth.onAuthStateChange()` → listen for changes
3. `ProtectedRoute` wrapper redirects unauthenticated users to `/`
4. Authenticated users on `/` redirect to `/reading`
5. Users without a chart on `/reading` redirect to `/onboarding`

---

## Deployment Architecture

```
GitHub (krishanraja/merciless)
    │
    ├── Push to main → Vercel auto-deploy
    │     ├── npm run build (tsc + vite build)
    │     └── Serve dist/ as static SPA
    │
    └── Supabase Edge Functions (deployed via CLI)
          └── supabase functions deploy <name>
```

### Vercel

- Framework: Vite
- Build: `tsc && vite build`
- Output: `dist/`
- SPA routing: All paths rewrite to `/index.html`
- Env vars: `VITE_*` prefix (exposed to client)

### Supabase

- Region: Default (check project settings)
- Edge Functions: Deno runtime
- Database: PostgreSQL 15
- Auth: Email/password
- RLS: Enforced on all tables
