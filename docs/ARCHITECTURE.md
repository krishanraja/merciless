# Merciless, Technical Architecture

---

## 1. System overview

```
                         +-----------------------------+
                         | User browser (React 19 SPA) |
                         | Hosted on Vercel            |
                         +--------------+--------------+
                                        |
        +-------------------------------+-------------------------------+
        v                               v                               v
+-------------------+     +------------------------------+     +----------------+
| Supabase Auth     |     | Supabase Edge Functions      |     | Stripe         |
| Email + Password  |     | (Deno runtime)               |     | Checkout       |
| Branded templates |     |                              |     | Webhooks       |
+-------------------+     | natal-chart       [JWT]      |     +-------+--------+
                          | daily-reading     [JWT]      |             |
                          | oracle            [JWT+Pro]  |             |
                          | create-checkout   [JWT]      |             |
                          | stripe-webhook    [Stripe]   |<------------+
                          | demo-reading      [Anon+RL]  |
                          | transcribe-date   [Anon+RL]  |
                          | track             [Anon+RL]  |
                          +------------+-----------------+
                                       |
        +------------------------------+------------------------------+
        v                  v                  v                       v
+---------------+  +------------------+  +-------------+  +-----------------------+
| Postgres 15   |  | astronomy-engine |  | Gemini /    |  | OpenAI Whisper +      |
| (Supabase)    |  | (real ephemeris, |  | OpenAI LLM  |  | GPT-4o-mini           |
| + RLS         |  |  in-process)     |  | (_shared)   |  | (voice date parse)    |
+---------------+  +------------------+  +-------------+  +-----------------------+

        +----------------------------------------------------------------+
        | Mindmaker OS warehouse (project gojpffsrxybbpbdzzrvs)          |
        | ingest-attribution front door -> attribution schema + views    |
        +----------------------------------------------------------------+

        +----------------------------------------------------------------+
        | External: OpenStreetMap Nominatim (geocoding, client-side)     |
        +----------------------------------------------------------------+
```

- Frontend: Vite 8 + React 19 + Tailwind CSS v4, deployed as a static SPA on Vercel.
- Auth: Supabase email/password. The user supplies an access token to every authenticated edge function.
- Compute: all business logic runs in Supabase Edge Functions (Deno). No Vercel functions.
- Ephemeris: real positions are computed in-process by `astronomy-engine` (see section 3). There is no external ephemeris service.
- AI: Gemini-first, OpenAI fallback through `_shared/llm.ts`. Voice date transcription uses Whisper + GPT-4o-mini.
- Payments: Stripe Checkout for subscription start, Stripe webhooks for lifecycle. The Stripe account is `mindmaker_llc`.
- Attribution: a first-party client spine emits funnel events to the `track` function, which forwards them to the Mindmaker OS warehouse. Stripe revenue events are emitted server-side from the webhook. See section 7.

---

## 2. Data flows

### 2.1 Sign-up, onboarding, first reading

```
1. User signs up via AuthModal (supabase.auth.signUp, emailRedirectTo=/auth/callback).
   First-touch attribution is stamped onto the auth user metadata at signup so it
   survives the email-confirmation round trip.
2. Email confirmation only on signup; subsequent logins skip confirmation.
3. /auth/callback consumes the token and routes the user into the app.
4. App.tsx detects a user without a chart and redirects to /onboarding.
5. User enters birth data through a 3-step flow:
     a. Date, voice (Whisper + GPT-4o-mini) OR native picker.
     b. Time, optional; checkbox for 'unknown'.
     c. Location, debounced Nominatim search; selecting a result fills lat/lng.
6. Frontend POSTs to natal-chart with the JWT in the Authorization header.
7. natal-chart:
     a. Verifies the JWT via supabase.auth.getUser(token). The body's user_id is never trusted.
     b. Resolves the local wall-clock birth time plus timezone to a UTC instant (localToUtc).
     c. Computes the chart with the real ephemeris (computeChart). Angles and houses are
        produced ONLY when both the birth time and the place are known; otherwise they are omitted.
     d. Enriches the planets map with Ascendant / Midheaven angle entries when present.
     e. Upserts user_birth_data and natal_charts (onConflict user_id).
8. Frontend redirects to /reading.
9. useDailyReading checks for today's row; if absent, calls daily-reading.
10. daily-reading:
     a. Verifies the JWT.
     b. Returns an existing row for (user_id, today) if present (one reading per day).
     c. Loads natal_charts (409 with code 'no_chart' if missing).
     d. Reads user_subscriptions.status to set isPro / is_free_tier.
     e. Computes today's transits against the natal longitudes (computeTransits).
     f. Builds a chart summary plus a transit string and calls callLLM with the Oracle prompt.
     g. Parses JSON via DailyReadingLLMSchema (Zod). On a malformed shape it returns 503 and
        asks for a clean retry rather than caching a bad reading for the whole day.
     h. Runs every text field through sanitizeVoice (brand voice, no em dashes).
     i. Inserts into daily_readings; on a concurrent unique violation it re-reads the winning row.
11. Reading page shows the headline only (free) or the full reading + actions + transits (Pro).
```

### 2.2 Voice demo (no auth)

```
1. Visitor lands on Landing.tsx -> TryMeSection. A 'landed' funnel event is emitted.
2. Records voice via getUserMedia + MediaRecorder (audio/webm or audio/mp4).
3. POSTs audio to transcribe-date (anon Bearer = anon key).
4. transcribe-date (now capped, see section 6):
     a. Enforces a per-fingerprint hourly rate limit and a global daily budget, both fail-closed.
     b. Rejects audio over 6 MB.
     c. Sends audio to OpenAI Whisper (whisper-1, English hint), 20s timeout.
     d. Sends the transcript to GPT-4o-mini for date interpretation, 20s timeout, ISO + confidence.
     e. Validates the parsed date: real calendar date, year >= 1900, not in the future.
5. Returns ISO date + display string + confidence + interpretation.
6. Frontend POSTs that ISO date to demo-reading. A 'demo_played' event is emitted.
7. demo-reading:
     a. Computes a per-fingerprint hash (IP + UA, SHA-256).
     b. Calls demo_rate_limit_bump (per-fingerprint hourly counter, 10/hour).
     c. Calls demo_global_budget_bump (per-UTC-day global counter, 2000/day).
     d. If either RPC errors or exceeds the limit, returns 429 (fail-closed).
     e. Computes a REAL date-only chart with computeDateOnlyDemo: accurate Sun sign + degree,
        Moon sign (only when the sign is stable across the whole UTC day), and the sharpest
        slow-body aspect.
     f. Calls callLLM with a sign-shadow prompt that must cite a real placement.
     g. Returns sun_sign, sun_degree, moon_sign (or null), sharpest_aspect, brutal_headline,
        excerpt. Headline and excerpt run through sanitizeVoice.
8. DemoResultCard displays the headline; the CTA prompts sign-up for the full reading.
```

### 2.3 Pro upgrade

```
1. User clicks 'Upgrade to Pro' -> useSubscription.upgradeToPro(). A 'paywall_hit' event is emitted.
2. Frontend POSTs to create-checkout with the JWT and the client attribution map.
3. create-checkout:
     a. Verifies the JWT; uses user.email from the token, not the body.
     b. Whitelists the attribution keys (mcl_cid + UTM + agent + landing_path + referrer), each capped to 450 chars.
     c. Looks up an existing stripe_customer_id; creates a customer (with attribution metadata) if missing,
        otherwise refreshes the customer's attribution metadata.
     d. Creates a Checkout Session in 'subscription' mode with STRIPE_PRICE_ID.
     e. Stamps user_id + price_id + attribution onto the SESSION metadata AND, critically, onto the
        SUBSCRIPTION metadata via subscription_data (so the webhook can read it back on churn).
     f. Returns the hosted Checkout URL.
4. User completes payment on Stripe.
5. Stripe POSTs checkout.session.completed -> stripe-webhook.
6. stripe-webhook (see section 6.6 for idempotency and warehouse emission):
     a. Verifies the signature with STRIPE_WEBHOOK_SECRET (constructEventAsync).
     b. Records the event id in stripe_processed_events; a unique violation means a replay, so it acks and stops.
     c. Upserts user_subscriptions: status='active', customer + sub + price ids.
     d. Emits a 'purchased' event to the warehouse with the attribution read back from session metadata.
7. User returns to /reading?upgraded=true -> useSubscription refreshes -> isPro=true.
8. Subsequent subscription.updated / subscription.deleted / charge.refunded events update status
   and emit churned / refunded to the warehouse.
```

### 2.4 Oracle conversation (Pro-only)

```
1. Pro user navigates to /oracle.
2. User sends a message; useOracle adds an optimistic user bubble.
3. POST /oracle with the JWT + { message, conversation_id? }.
4. oracle function:
     a. Verifies the JWT.
     b. Confirms user_subscriptions.status === 'active' (else 403). This gate reads a column
        that only the Stripe webhook can write (see section 4).
     c. Loads natal_charts.
     d. Loads the conversation only if conversation_id is supplied AND user_id matches (ownership check).
     e. Truncates to the last 20 messages, caps each at 4000 chars.
     f. Builds the chart context plus the Oracle prompt and calls callLLM(maxTokens=512).
     g. Runs output through sanitizeVoice.
     h. Appends the assistant message and persists the conversation (insert or update).
     i. Returns { response, conversation_id }.
```

---

## 3. The ephemeris (real, arc-minute, of-date)

The chart engine lives in `supabase/functions/_shared/ephemeris.ts` and is shared by `natal-chart` (full chart), `daily-reading` (transits), and `demo-reading` (date-only chart). The previous simplified mean-element math, a fabricated ascendant of the form `RAMC + 90 + lat * 0.5`, equal houses off that fake angle, and a hardcoded `retrograde: false`, are all gone.

### 3.1 What is computed

Positions come from `astronomy-engine` (pinned `@2.1.19`), which matches JPL to arc-seconds for the planets and about one arc-minute for the Moon. All longitudes are tropical, apparent, referred to the true ecliptic and equinox OF DATE (not J2000), so they line up with what astro.com prints. Times are UTC.

- Bodies (geocentric ecliptic of date): Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto. The Sun uses `SunPosition`, the Moon uses `EclipticGeoMoon`, and the rest use an aberration-corrected `GeoVector` rotated EQJ to true-ecliptic-of-date (`Rotation_EQJ_ECT`).
- Daily speed: a wrap-aware central finite difference over a one-day span. `retrograde` is derived from real negative motion, not hardcoded.
- Aspects: conjunction, sextile, square, trine, opposition, computed pairwise across the ten major bodies with per-aspect orbs (8 / 4 / 7 / 7 / 8 degrees). Each hit carries its orb and an applying / separating flag derived from relative speed (null when both bodies are static).
- Retrograde state and exact daily speed are part of the guarantee.

### 3.2 Angles and houses

When the birth time AND the place are both known:

- Obliquity uses Meeus mean obliquity of date.
- RAMC comes from Greenwich apparent sidereal time (`SiderealTime`) plus the east longitude.
- The Midheaven is `atan2(sin RAMC, cos RAMC * cos eps)`.
- The Ascendant is the standard eastern-horizon formula, with an explicit correction that forces the rising intersection (negative hour angle) rather than the descendant 180 degrees away.
- Houses: whole-sign is primary (house 1 is the entire sign of the Ascendant). Equal houses (30-degree arcs from the exact Ascendant degree) are returned alongside as a secondary system.

When the birth time or the place is unknown, `timeKnown` is false: angles and houses are OMITTED, never fabricated. The chart's `houseSystem` becomes `"none"`, `rising_sign` is null, and the accuracy note explains why.

### 3.3 Labelled-approximate bodies

Two points are returned but explicitly flagged `approximate: true` and are NOT covered by the arc-minute promise:

- Mean Lunar Node (and the opposite South Node), from Meeus mean elements. Good to roughly an arc-minute across the modern range, but it is the MEAN node, not the true node.
- Chiron, a two-body Kepler propagation from JPL osculating elements (epoch JD 2460566.5), precessed from J2000 to of-date. It can drift to tens of arc-minutes over decades.

The brand promise rests on the major bodies and the angles. Consumers should treat the node and Chiron as indicative.

### 3.4 Demo (date-only) chart

`computeDateOnlyDemo(birthDateISO)` builds a chart at UTC noon with `timeKnown: false`. It also computes the chart at 00:00 and 23:59 UTC to decide whether the Moon's sign is stable across the whole day (`moonSignCertain`); if the day crosses a sign boundary the demo reports the Moon sign as null rather than guessing. It returns the Sun, the Moon, the certainty flag, and the sharpest aspect that does NOT involve the Moon (slow bodies barely move in a day, so their aspects are reliable without a birth time).

### 3.5 Verification

`supabase/functions/_shared/ephemeris.test.ts` is the proof harness. It asserts, among other things, that the Midheaven's right ascension equals the RAMC, that the Ascendant's altitude is zero (it really is on the horizon), and that precession of date is applied. These tests are the reason the arc-minute claim is safe to make in marketing copy.

### 3.6 Returned shape (NatalChart)

`positions` is a map keyed by body name, each `{ body, longitude, latitude, sign, degree, dms, speed, retrograde, approximate? }`. Top-level fields include `ascendant`, `midheaven` (Angle or null), `houseSystem`, `houses` (whole-sign), `equalHouses`, `aspects`, `sun_sign`, `moon_sign` (null if unresolved), `rising_sign` (null without a time), `timeKnown`, and an `accuracy` block. `natal-chart` persists `planets` (positions plus Ascendant / Midheaven angle entries), `houses`, `aspects`, and the sign summaries.

---

## 4. Database schema and Row Level Security

### Entity relationship

```
auth.users (Supabase)
    |
    +-- 1:1 -> user_birth_data
    +-- 1:1 -> natal_charts
    +-- 1:N -> daily_readings           (one per user per day, UNIQUE)
    +-- 1:N -> oracle_conversations
    +-- 1:1 -> user_subscriptions       (READ-ONLY to clients; written only by the Stripe webhook)

(public, service-role only)
demo_rate_limit                (per-fingerprint hourly counter)
demo_global_budget             (per-UTC-day global counter, legacy demo bucket)
api_global_budget              (generalized per-bucket per-UTC-day cost ceiling)
stripe_processed_events        (Stripe webhook idempotency ledger)
demo_rate_limit_bump()         security-definer RPC
demo_global_budget_bump()      security-definer RPC
api_global_budget_bump(bucket) security-definer RPC
set_updated_at()               trigger function
```

### Tables

**user_birth_data**, birth data input
- `user_id` UUID UNIQUE, FK auth.users; `birth_date` DATE NOT NULL
- `birth_time` TIME (nullable; when null the chart omits angles and houses)
- `birth_location` TEXT; `latitude`, `longitude` DECIMAL(10,7); `timezone` TEXT
- `updated_at` maintained on UPDATE by a trigger (see below)

**natal_charts**, calculated chart
- `user_id` UUID UNIQUE
- `planets` JSONB, the positions map plus Ascendant / Midheaven angle entries when known
- `houses` JSONB (whole-sign cusps); `aspects` JSONB
- `sun_sign`, `moon_sign`, `rising_sign`, `ascendant`, `midheaven` TEXT (rising / angle fields null without a birth time)

**daily_readings**, one AI reading per user per day
- `user_id` UUID FK; `reading_date` DATE; UNIQUE(user_id, reading_date)
- `brutal_headline` TEXT; `reading_text` TEXT
- `stoic_actions` JSONB; `active_transits` JSONB; `planet_focus` TEXT
- `intensity_level` INTEGER (1 to 10 CHECK); `shareable_card_data` JSONB; `is_free_tier` BOOLEAN

**oracle_conversations**, multi-turn chat
- `user_id` UUID FK; `messages` JSONB DEFAULT `'[]'`; `session_title` TEXT
- `updated_at` maintained on UPDATE by a trigger
- Indexed on `user_id` (added in the Phase 2 migration; per-user lookups were a sequential scan before)

**user_subscriptions**, Stripe state, client-read-only
- `user_id` UUID UNIQUE; `stripe_customer_id` / `stripe_subscription_id` TEXT UNIQUE; `stripe_price_id` TEXT
- `status` TEXT (`active` | `canceled` | `past_due` | `inactive`); `current_period_end` TIMESTAMPTZ; `cancel_at_period_end` BOOLEAN
- `updated_at` maintained on UPDATE by a trigger

**demo_rate_limit**, abuse protection (service-role only)
- `fingerprint` TEXT PK (SHA-256 of IP + UA); `count`, `window_start`, `updated_at`
- Bumped via `demo_rate_limit_bump(p_fingerprint, p_window_seconds)`, atomic, resets per hour

**demo_global_budget**, the original per-UTC-day demo ceiling (service-role only)
- `day` DATE PK (UTC); `count`; `updated_at`. Bumped via `demo_global_budget_bump()`

**api_global_budget**, generalized per-bucket daily cost ceiling (service-role only, added Phase 2)
- PK `(bucket, day)`; `count`; `updated_at`. Bumped via `api_global_budget_bump(p_bucket)`
- Reusable by any unauthenticated paid endpoint. `transcribe-date` uses the `'transcribe'` bucket

**stripe_processed_events**, webhook idempotency ledger (service-role only, added Phase 2)
- `event_id` TEXT PK; `type`; `processed_at`. The insert is the lock against replays

### Row Level Security

The entitlement fix is the most important change here.

- **user_subscriptions is now READ-ONLY to clients.** The old policy `FOR ALL USING (auth.uid() = user_id)` let any authenticated user INSERT or UPDATE their own subscription row to `status='active'` through the REST API and self-grant Pro, because `isPro`, the paywall, and the server-side Oracle gate all read that column. The policy is now `FOR SELECT USING (auth.uid() = user_id)`. Subscription status is written exclusively by the Stripe webhook running as the service role.
- **Explicit WITH CHECK on owner-writable tables.** `user_birth_data`, `natal_charts`, `daily_readings`, and `oracle_conversations` now use `FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`, so a forged `user_id` can never be written, independent of any Postgres USING fallback.
- The four budget / ledger tables (`demo_rate_limit`, `demo_global_budget`, `api_global_budget`, `stripe_processed_events`) have RLS enabled with NO policies, which denies all anon and authenticated access and leaves only the service role (which bypasses RLS) able to touch them.
- The original service-role full-access policies on the five user tables remain so edge functions can operate.

### Triggers

`set_updated_at()` is a `BEFORE UPDATE` trigger function (added Phase 2) wired onto `user_birth_data`, `oracle_conversations`, and `user_subscriptions`. Previously `updated_at` was only ever set on INSERT; now it is maintained on every UPDATE.

### Migrations

| File | Purpose |
|---|---|
| `20260406000000_initial_schema.sql` | The five user-owned tables, RLS, service-role policies |
| `20260424120000_demo_rate_limit.sql` | demo_rate_limit + demo_global_budget tables and RPCs |
| `20260530120000_phase2_entitlement_hardening.sql` | Subscription RLS to SELECT-only, explicit WITH CHECK on owner tables, oracle_conversations(user_id) index, set_updated_at triggers, api_global_budget table + api_global_budget_bump RPC |
| `20260530130000_stripe_idempotency.sql` | stripe_processed_events ledger (service-role only) |

The warehouse migration (`_upgrade/merciless/warehouse/migrations/0001_attribution_schema.sql`) targets a DIFFERENT project, the Mindmaker OS warehouse, and is documented in section 7.

---

## 5. AI pipeline and brand voice

### 5.1 Shared LLM client

- `_shared/llm.ts`, `callLLM({ system, messages, maxTokens, temperature })` returns `{ text, provider }`. It calls Gemini first and falls back to OpenAI GPT-4o-mini. Auth / quota 4xx errors do not retry; 408 / 429 do; otherwise it makes a couple of attempts with backoff, with a per-provider timeout via `AbortSignal.timeout`.
- `_shared/schemas.ts`, Zod schemas for the LLM JSON (`DailyReadingLLMSchema`, `DemoReadingLLMSchema`) and `extractJsonObject(content)` to tolerate wrapped or partial JSON.

### 5.2 Brand-voice engine

`supabase/functions/_shared/brand-voice.ts` is the single home for two jobs, shared by `demo-reading`, `daily-reading`, and `oracle`, and available to the fleet before it posts.

- **sanitizeVoice(text)**: always-safe mechanical cleanup applied to every model output before any human or the fleet sees it. It removes dashes of the em-dash class (figure dash, en dash, em dash, horizontal bar) BY CONTEXT: a numeric range keeps a plain hyphen (`3-5`), a double hyphen becomes a comma join, a leading or trailing decorative dash is dropped, and a clause-joining dash becomes a comma. It then heals punctuation artifacts the joins can create. It is idempotent and never throws. This replaces the old single-character regex replace that swapped every em dash for a semicolon, a splice that turned one clause into two.
- **lintVoice(text)**: the detective pass. It sanitizes, then flags the generic-AI tells the brand forbids so the fleet's auto-post gate can reject and regenerate. Any dash in the RAW output is a blocking `em-dash` violation even though sanitize already fixed it. It also flags hedging terms (might, maybe, perhaps, possibly, consider, tends to, and so on) as blocking, negative parallelism ("it is not X, it is Y", "not X, but Y") as blocking, and a reflexive rule-of-three triad as advisory. `ok` is false when any blocking violation is present.
- `sanitizeEmDashes(text)` remains as a backward-compatible alias for `sanitizeVoice`.

The HARD RULE everywhere: no em dashes. Every system prompt (`demo-reading`, `daily-reading`, `oracle`) restates the voice law (no em dashes, no hedging words, no "it is not X, it is Y", state what is), and `sanitizeVoice` is the belt-and-suspenders enforcement on every text field regardless of provider drift. The `daily-reading` prompt additionally tells the model the positions are computed to the arc-minute and that it must cite real placements.

---

## 6. Edge functions

All functions live under `supabase/functions/`. Auth model:

| Function | Auth required | Gate |
|---|---|---|
| natal-chart | User JWT | none |
| daily-reading | User JWT | reads subscription status for is_free_tier |
| oracle | User JWT | status='active' (else 403) |
| create-checkout | User JWT | none |
| stripe-webhook | Stripe signature | idempotency ledger |
| demo-reading | None (anon key) | per-fingerprint + global Postgres limits |
| transcribe-date | None (anon key) | per-fingerprint + global budget + size + timeout |
| track | None (anon key) | per-fingerprint rate limit, event allowlist |

### 6.1 natal-chart
Verifies the JWT and derives `user_id` from the token. Resolves local time + timezone to UTC (`localToUtc`), computes the chart (`computeChart`), and produces angles and houses only when the time AND place are both present. Upserts `user_birth_data` and `natal_charts`. Returns the chart row.

### 6.2 daily-reading
Verifies the JWT, returns an existing row for today if present, loads `natal_charts` (409 `no_chart` if missing) and `user_subscriptions.status`. Computes today's transits with `computeTransits` against the natal longitudes (Ascendant / Midheaven are skipped). Calls `callLLM(maxTokens=1024)`, validates with `DailyReadingLLMSchema`, and on a malformed shape returns 503 and asks for a clean retry rather than persisting a bad reading. All text runs through `sanitizeVoice`. Inserts the row; a concurrent unique violation re-reads the winner. LLM failure returns 503.

### 6.3 oracle
Verifies the JWT, confirms `status==='active'` (else 403), loads the chart, and loads an existing conversation only when ownership matches. Sliding window of the last 20 messages, each capped at 4000 chars. `callLLM(maxTokens=512)`, output through `sanitizeVoice`, persists the conversation, returns `{ response, conversation_id }`.

### 6.4 create-checkout
Verifies the JWT, uses `user.email` from the token. Whitelists and length-caps the attribution map, creates or refreshes the Stripe customer with attribution metadata, and creates a `subscription`-mode Checkout Session with `STRIPE_PRICE_ID` (env, fallback `price_1TJEo24w6vAdI2o57Rz8Cp3X`). Stamps `user_id` + `price_id` + attribution onto BOTH the session metadata and the subscription metadata. Returns `{ url }`. Currency is set by the Stripe Price object, which must be USD ($4.99/mo).

### 6.5 transcribe-date (now capped)
Previously unauthenticated and uncapped; it calls two paid OpenAI APIs. It now enforces, all before any OpenAI call:
- A per-fingerprint hourly rate limit (`demo_rate_limit_bump`, bucket `tx|<hash>`, 20 attempts/hour), fail-closed.
- A global daily budget (`api_global_budget_bump('transcribe')`, 3000/UTC day), fail-closed.
- A 6 MB audio size limit (413 over the cap, 400 on empty / missing).
- A 20-second timeout on each of the Whisper and GPT-4o-mini fetches.
It then transcribes (whisper-1, English, prompt biased toward spoken DOB phrasing), parses the date with GPT-4o-mini (temperature 0.1), and validates a real past calendar date >= 1900. Returns `{ success, transcript, parsed }`.

### 6.6 stripe-webhook (idempotent + warehouse-emitting)
Reads the raw body and `stripe-signature`, returns 400 if the secret or signature is missing, and verifies with `constructEventAsync`. It then inserts the event id into `stripe_processed_events`; a unique violation (`23505`) means the event was already handled, so it acks `{ received: true, duplicate: true }` and stops. This makes replays, retries, and out-of-order deliveries safe, so subscriptions are never double-written and warehouse events are never double-emitted. Handlers:
- `checkout.session.completed` -> upsert `user_subscriptions` to active and emit `purchased` to the warehouse (amount, currency, attribution read back from session metadata, dedupe key `merciless:purchased:<event.id>`).
- `customer.subscription.updated` -> status, current_period_end, cancel_at_period_end.
- `customer.subscription.deleted` -> status canceled and emit `churned`.
- `charge.refunded` -> emit `refunded` (refunded amount, attribution from charge metadata).
All warehouse emissions carry `stripe_account: 'mindmaker_llc'` and a stable dedupe key.

### 6.7 demo-reading
See section 2.2 and section 3.4. Anon, fingerprint + global limits fail-closed, real date-only chart, sign-shadow prompt, `sanitizeVoice` on the returned headline and excerpt. Returns `sun_sign`, `sun_degree`, `moon_sign` (or null), `sharpest_aspect`, `brutal_headline`, `excerpt`, `birth_date`.

### 6.8 track
The public client event sink. The browser cannot hold the warehouse secret, so it POSTs funnel events here and this function forwards them with the secret attached. It enforces an event allowlist (only the client-safe funnel events; money events are server-only) and a generous per-fingerprint rate limit (120/hour, namespaced `track|<hash>`), then calls `forwardEvent`. See section 7.

---

## 7. Attribution architecture

The attribution loop ties a first-party click identifier to first-touch marketing source, through sign-up and activation, all the way to Stripe revenue, and lands it in the Mindmaker OS warehouse for Maya (CAC) and Leo (LTV). Merciless holds exactly one warehouse credential, `ATTRIBUTION_INGEST_SECRET`. It never holds the warehouse service-role key or DB URL.

### 7.1 Client capture, `src/lib/attribution.ts`

- On first touch, `captureAttribution()` mints a durable `mcl_cid` (from the `mcl_cid` query param, an existing cookie, or a fresh UUID) and records first-touch UTM (source / medium / campaign / content / term), `agent`, `referrer`, and `landing_path`. First touch wins.
- The identifier and first-touch data are stored in BOTH `localStorage` (key `merciless_attribution_v1`) AND an `mcl_cid` cookie (180-day, SameSite=Lax). This survives the SPA boundary and the email-confirmation round trip, where the user leaves to their inbox and returns in a fresh context.
- `attributionForCheckout()` / `attributionUserMetadata()` produce the `mcl_cid` + UTM + landing_path + referrer map that is stamped onto Stripe at checkout and onto the auth user metadata at signup.
- `trackEvent(event, extra)` emits a funnel event to the `track` edge function with `keepalive: true`. It never throws; analytics must not break the product. Client-emitted events include `landed`, `demo_played`, `signed_up`, `chart_calculated`, `activated`, and `paywall_hit`.

### 7.2 track edge function (Merciless)

`supabase/functions/track/index.ts` validates the event against a client allowlist (money events are rejected here because they come only from the signature-verified webhook), applies a per-fingerprint rate limit, assembles a typed `AttributionEvent`, and calls `forwardEvent`.

### 7.3 forwardEvent, `_shared/attribution.ts`

`forwardEvent(ev)` POSTs `{ app: "merciless", ...ev }` to the warehouse front door (`ATTRIBUTION_INGEST_URL`, default `https://gojpffsrxybbpbdzzrvs.supabase.co/functions/v1/ingest-attribution`) with the `x-attribution-secret` header and a 5-second timeout. It is fire-and-forget: a warehouse hiccup must never break a user flow or a Stripe webhook ack, so it logs and returns false instead of throwing. If `ATTRIBUTION_INGEST_SECRET` is unset it skips emission.

### 7.4 Stripe stamping (revenue side)

`create-checkout` stamps attribution onto the Stripe customer, the checkout session, AND the subscription. Because the subscription now carries metadata (it carried none before), the webhook can read attribution back even on a `customer.subscription.deleted` churn event. `stripe-webhook` reads `session.metadata` / `sub.metadata` / `charge.metadata` via `pickAttribution` and emits `purchased` / `churned` / `refunded` server-side with stable dedupe keys.

### 7.5 Warehouse, project gojpffsrxybbpbdzzrvs

Provisioned by `_upgrade/merciless/warehouse/migrations/0001_attribution_schema.sql`. This file targets the Mindmaker OS warehouse, NOT the Merciless project, and is purely additive (it touches nothing in existing OS tables). Ownership note: the `attribution` schema is owned by the Mindmaker OS repo. It was authored from the Merciless rebuild session with granted access so the loop could close end to end; the OS repo is the sole future migrator. The six app repos only ever EMIT to `ingest-attribution`.

- `attribution.events`: the append-only fact table. App is constrained to the six known apps (`ctrl`, `onalert`, `gutted`, `merciless`, `circle`, `pulse`). Event is constrained to the known funnel + money + product events. It carries `anonymous_id` (the `mcl_cid`), `user_id`, `email`, the five UTM columns, `campaign_id`, `agent`, `referrer`, `landing_path`, `stripe_account` (constrained to `mindmaker_llc` / `fractionl_ai` / null), Stripe customer + subscription ids, `amount_cents`, `currency`, a `metadata` JSONB, and a UNIQUE `dedupe_key`. Indexed on (app, event, occurred_at), (utm_campaign, occurred_at), anonymous_id, and user_id.
- RLS is enabled with NO policies. Only the service role can write, and only through the ingest RPC. The schema is deliberately not exposed to PostgREST.
- `public.ingest_attribution_event(p jsonb)`: a SECURITY DEFINER RPC, service-role only, that inserts one row and does `ON CONFLICT (dedupe_key) DO NOTHING`. This is the deduplication backstop behind the dedupe keys the webhook mints. The `ingest-attribution` edge function (the front door the secret protects) calls this RPC.
- Read models, both service-role read only:
  - `attribution.funnel_by_campaign`: landed / signed_up / activated / purchased counts and distinct uniques grouped by app, source, medium, campaign, agent. This is Maya's CAC / channel view.
  - `attribution.revenue_by_campaign`: purchases, gross cents, refunded cents, and churns grouped by app, source, campaign, agent, and stripe_account, spanning both Stripe accounts. This is Leo's LTV / revenue view.

### 7.6 End-to-end data flow

```
Browser (mcl_cid, first-touch UTM/agent/referrer/landing_path)
   |  localStorage + cookie + (at signup) auth user_metadata
   |  trackEvent('landed' | 'demo_played' | 'signed_up' | 'chart_calculated'
   |             | 'activated' | 'paywall_hit')
   v
Merciless /functions/v1/track   (allowlist + per-fp rate limit)
   |  forwardEvent: POST { app:'merciless', ...event }
   |  header x-attribution-secret = ATTRIBUTION_INGEST_SECRET
   v
Warehouse /functions/v1/ingest-attribution  (project gojpffsrxybbpbdzzrvs)
   |  public.ingest_attribution_event(jsonb)  [SECURITY DEFINER, service_role]
   |  ON CONFLICT (dedupe_key) DO NOTHING
   v
attribution.events
   |
   +--> attribution.funnel_by_campaign   (Maya: CAC / channel)
   +--> attribution.revenue_by_campaign  (Leo: LTV / revenue)

Revenue side, server-only:
create-checkout stamps mcl_cid + UTM onto Stripe customer + session + SUBSCRIPTION
   v
Stripe -> Merciless /functions/v1/stripe-webhook
   |  signature verified, recorded in stripe_processed_events (idempotent)
   |  forwardEvent('purchased' | 'churned' | 'refunded') with attribution read back
   v
(same ingest path) -> attribution.events
```

---

## 8. Frontend architecture

### Routing

| Route | Component | Auth | Pro |
|-------|-----------|------|-----|
| `/` | Landing (with TryMeSection) | No | none |
| `/auth/callback` | AuthCallback | none | none |
| `/onboarding` | Onboarding | Yes | none |
| `/reading` | Reading | Yes | headline free, full reading Pro |
| `/oracle` | Oracle | Yes | Yes |
| `/chart` | Chart | Yes | Yes |
| `/settings` | Settings | Yes | none |
| `*` | NotFound | none | none |

`ProtectedRoute` redirects unauthenticated users to `/`. `App.tsx` redirects authenticated users away from `/`.

### Auth lifecycle (App.tsx)
1. `supabase.auth.getSession()` on mount sets user and clears loading.
2. `onAuthStateChange` tracks state.
3. Unexpected session loss surfaces a dismissible "session expired" toast.
4. An authenticated user on `/` is routed to `/reading`; one without a chart is routed to `/onboarding`.

### State management
No global store. State lives in hooks: `useNatalChart`, `useDailyReading`, `useOracle`, `useSubscription`, `useGeocoding`. Each owns its Supabase queries and loading / error state.

### Type safety
`src/types/supabase.ts` is the generated Database type. `src/lib/supabase.ts` exports `createClient<Database>(...)` so queries are type-checked against the schema. `extractFunctionErrorMessage` unwraps the real edge-function error body off `err.context` (a Response) so the UI shows the actual error, not the SDK's generic non-2xx message.

---

## 9. Deployment topology

```
GitHub: krishanraja/merciless
   |
   +-- push to main
   |     +-> Vercel auto-deploy
   |           +-- npm run build (tsc + vite build)
   |           +-- static dist/ served as SPA
   |
   +-- Edge functions
         +-> supabase functions deploy <name> --no-verify-jwt
             (functions verify the JWT in code where required; the flag lets the
              anon demo / transcribe / track paths through the gateway)
```

### Vercel
- Framework Vite, build `tsc && vite build`, output `dist/`.
- `vercel.json`: SPA rewrite, `cleanUrls`, `trailingSlash:false`, `www -> apex` redirect, security headers (`X-Content-Type-Options`, `X-Frame-Options: DENY`, HSTS preload, `Referrer-Policy`), long-cache immutable on `/assets/*` and `/signs/*`.
- All `VITE_*` env vars set in the Vercel project. `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are used by `trackEvent`.

### Supabase
- Project ref `cgkcplcamsijghalintq`, Postgres 15, Edge Functions on Deno.
- Required edge env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, the LLM keys, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` (optional), and `ATTRIBUTION_INGEST_SECRET` (the only warehouse credential the app holds). `ATTRIBUTION_INGEST_URL` is optional and defaults to the OS warehouse front door.
- Stripe account `mindmaker_llc`; price `price_1TJEo24w6vAdI2o57Rz8Cp3X`, product `prod_UHoQV8ymZNk4Um`, $4.99/mo USD.

### Product truth and agent surface
- `public/offer.json` is the single machine-readable source of product truth the fleet sells and markets from.
- `public/llms.txt` is the agent entry point.
- These plus `sitemap.xml` and `robots.txt` are excluded from the SPA rewrite.

---

## 10. Security and trust model

- **Entitlement:** `user_subscriptions` is client-read-only. Only the Stripe webhook (service role) writes subscription status. A free user can no longer self-grant Pro through the REST API.
- **Input authority:** every authenticated function derives `user_id` from the verified JWT, never from the request body. Owner tables additionally enforce `WITH CHECK (auth.uid() = user_id)`.
- **Cost and abuse control:** `demo-reading`, `transcribe-date`, and `track` use SHA-256 fingerprints, atomic Postgres counters, and fail-closed behaviour so a counter outage cannot run up an unbounded LLM or OpenAI bill. `transcribe-date` adds a 6 MB size cap and 20s timeouts.
- **Webhook integrity:** the Stripe signature is mandatory, and `stripe_processed_events` makes processing idempotent.
- **Conversation ownership:** `oracle` re-checks `user_id` on every load of an existing conversation.
- **Warehouse boundary:** the app holds only `ATTRIBUTION_INGEST_SECRET` and emits fire-and-forget; it never holds the warehouse service-role key.
- **No fabricated trust signals.** The fabricated JSON-LD `aggregateRating` (4.8 / 4200) and the "4,200+" social-proof claim have been removed. Do not reintroduce any fabricated metric, rating, or review count anywhere.
- **HTTP security headers** are set at the Vercel layer for all SPA responses.

---

## 11. Brand-voice rule (restated)

No em dashes, anywhere, ever. Use commas, colons, periods, or parentheses. The rule is enforced three ways: in every system prompt, by `sanitizeVoice` on every model output field, and by `lintVoice` (a blocking `em-dash` violation) on the fleet's auto-post gate. Hedging language and the "it is not X, it is Y" construction are blocking violations; a reflexive rule-of-three is advisory. The voice states what is.
