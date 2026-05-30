# Merciless, Edge Function API Reference

All edge functions are deployed to Supabase and accessed at:

```
https://<PROJECT_REF>.supabase.co/functions/v1/<function-name>
```

For the live deployment, `<PROJECT_REF>` is `cgkcplcamsijghalintq`.

The chart math behind these endpoints is a real ephemeris (astronomy-engine, JPL-grade) in `supabase/functions/_shared/ephemeris.ts`. Tropical positions of date for Sun through Pluto and the Moon are accurate to the arc-minute, with a real Ascendant and Midheaven derived from sidereal time and obliquity, whole-sign houses (primary) plus equal houses, aspects with orbs and applying/separating state, and retrograde from real daily motion. The mean lunar node and Chiron are labelled approximate and are not covered by the arc-minute guarantee. When birth time or place is unknown, angles and houses are omitted, never fabricated.

All AI text returned by `daily-reading`, `oracle`, and `demo-reading` passes the shared brand-voice engine (`supabase/functions/_shared/brand-voice.ts`). `sanitizeVoice` strips em dashes by context (replacing with a comma, colon, or period). The hard rule across the whole product is: no em dashes, ever.

---

## Auth model

| Function | Required `Authorization` | Notes |
|---|---|---|
| `natal-chart` | `Bearer <user-access-token>` | Verified with `supabase.auth.getUser(token)`. `user_id` is derived from the token, not the body. |
| `daily-reading` | `Bearer <user-access-token>` | Same. |
| `oracle` | `Bearer <user-access-token>` | Same, plus an active subscription gate (403 otherwise). |
| `create-checkout` | `Bearer <user-access-token>` | Same. Email is taken from the token. |
| `stripe-webhook` | `stripe-signature` header | Body must be raw; verified with `STRIPE_WEBHOOK_SECRET`. No JWT. |
| `demo-reading` | `Bearer <SUPABASE_ANON_KEY>` | No user JWT. Postgres-backed rate limits per fingerprint plus a global daily LLM budget. |
| `transcribe-date` | `Bearer <SUPABASE_ANON_KEY>` | No user JWT. Per-fingerprint hourly limit, global daily budget, 6 MB audio cap, 20s timeouts. |
| `track` | `Bearer <SUPABASE_ANON_KEY>` | No user JWT. Public funnel-event sink. Holds the warehouse secret server-side and forwards. |

`supabase-js` adds the `Authorization: Bearer <access-token>` header automatically when you call `supabase.functions.invoke(...)` from a signed-in client. Direct `fetch` callers must set it themselves.

All functions accept `OPTIONS` for CORS preflight and reply with the headers below.

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
```

The `stripe-webhook` function additionally allows `stripe-signature`.

### Entitlement note

`user_subscriptions` is read-only to clients (RLS `FOR SELECT`). Only the Stripe webhook, running under the service role, writes subscription status. A client cannot self-grant Pro through the REST API. The Pro gate in `oracle` reads `user_subscriptions.status === 'active'`, and that status can only have been written by the signature-verified webhook. (Migration: `supabase/migrations/20260530120000_phase2_entitlement_hardening.sql`.)

---

## natal-chart

Calculate (or recompute) the user's natal chart from birth data using the real ephemeris.

### Request

```
POST /functions/v1/natal-chart
Authorization: Bearer <user-access-token>
Content-Type: application/json
```

```json
{
  "birth_date": "1994-11-08",
  "birth_time": "14:30",
  "birth_location": "New York, USA",
  "latitude": 40.7128,
  "longitude": -74.006,
  "timezone": "America/New_York"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `birth_date` | string | yes | `YYYY-MM-DD`. A non-matching string is a 400. |
| `birth_time` | string | no | `HH:MM` 24h. If absent, noon is assumed for the planet math, and angles plus houses are omitted (time is not known). |
| `birth_location` | string | no | Freeform display name (no geocoding done here). Stored as-is. |
| `latitude` | number | no | Used only when both latitude and longitude are numbers. |
| `longitude` | number | no | Used only when both latitude and longitude are numbers. |
| `timezone` | string | no | IANA name, used to convert local birth time to UTC. |

> `user_id` is **not** read from the body. It is derived from the verified JWT.

### Angles and houses are conditional

Ascendant, Midheaven, and houses are computed only when the birth time is known **and** a place (both latitude and longitude) is supplied. If either is missing, `ascendant` and `midheaven` are `null`, `houses` is empty, and no `Ascendant` / `Midheaven` pseudo-entries are added to `planets`. Nothing is fabricated.

### Response (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "planets": {
    "Sun":     { "sign": "Scorpio",   "longitude": 215.34, "degree": 5.34, "speed": 1.01, "retrograde": false },
    "Moon":    { "sign": "Capricorn", "longitude": 285.12, "degree": 15.12 },
    "Mercury": { "sign": "Scorpio",   "longitude": 220.5,  "degree": 10.5 },
    "Venus":   { "...": "..." },
    "Mars":    { "...": "..." },
    "Jupiter": { "...": "..." },
    "Saturn":  { "...": "..." },
    "Uranus":  { "...": "..." },
    "Neptune": { "...": "..." },
    "Pluto":   { "...": "..." },
    "NorthNode": { "sign": "Sagittarius", "longitude": 270.1, "degree": 0.1 },
    "Chiron":  { "sign": "Virgo", "longitude": 165.0, "degree": 15.0 },
    "Ascendant": { "sign": "Virgo",  "longitude": 170.5, "degree": 20.5, "body": "Ascendant", "speed": 0, "retrograde": false },
    "Midheaven": { "sign": "Gemini", "longitude": 75.2,  "degree": 15.2, "body": "Midheaven", "speed": 0, "retrograde": false }
  },
  "houses": [
    { "house": 1, "sign": "Virgo",  "longitude": 170.5 },
    { "house": 2, "sign": "Libra",  "longitude": 200.5 }
  ],
  "aspects": [
    { "planet1": "Sun", "planet2": "Moon", "aspect": "sextile", "orb": 2.5, "applying": true }
  ],
  "ascendant": "Virgo",
  "midheaven": "Gemini",
  "sun_sign": "Scorpio",
  "moon_sign": "Capricorn",
  "rising_sign": "Virgo"
}
```

The `Ascendant` and `Midheaven` keys appear inside `planets` only when angles were computed. When the time or place is unknown they are absent, and `ascendant` / `midheaven` / `rising_sign` are `null`.

### Side effects
- Upserts `user_birth_data` on `user_id`. `birth_time`, `latitude`, and `longitude` are stored as `null` when not known.
- Upserts `natal_charts` on `user_id`, then returns the saved row.

### Bodies and approximate labels
Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto are arc-minute accurate. `NorthNode` (mean node) and `Chiron` are computed but labelled approximate; do not present them as arc-minute exact.

### Errors
- `400 { "error": "Unauthorized" }` is not used; missing JWT is 401 (see below).
- `401 { "error": "Unauthorized" }`, missing `Authorization` header or invalid token.
- `400 { "error": "Invalid request body" }`, body was not valid JSON.
- `400 { "error": "A valid birth date (YYYY-MM-DD) is required." }`, missing or malformed `birth_date`.
- `500 { "error": "Could not save your birth data. Please try again." }`, `user_birth_data` upsert failed.
- `500 { "error": "Could not calculate your chart. Please try again." }`, `natal_charts` upsert failed.
- `500 { "error": "Chart calculation is temporarily unavailable. Please try again." }`, unhandled failure.

---

## daily-reading

Generate or retrieve today's AI reading for the authenticated user. Transits are computed by the shared ephemeris against the stored natal longitudes.

### Request

```
POST /functions/v1/daily-reading
Authorization: Bearer <user-access-token>
Content-Type: application/json
```

```json
{}
```

> The body is ignored. `user_id` and `today` are derived from the token and the server clock (UTC date).

### Response (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "reading_date": "2026-05-30",
  "brutal_headline": "You are not stuck. You are avoiding the decision you already know you need to make.",
  "reading_text": "Saturn transiting your natal Mercury in the 3rd house...",
  "stoic_actions": [
    { "action": "Write the unsent message.",
      "why": "Mercury-Saturn transit demands honest communication.",
      "difficulty": "hard" },
    { "action": "Cancel one commitment you agreed to out of guilt.",
      "why": "Moon in Capricorn opposite natal Venus. Guilt is not obligation.",
      "difficulty": "medium" },
    { "action": "Do not explain your decisions today. State them.",
      "why": "Mars trine natal Jupiter gives you authority. Use it.",
      "difficulty": "easy" }
  ],
  "active_transits": [
    { "transiting_planet": "Saturn", "natal_planet": "Mercury",
      "aspect": "conjunct", "orb": 2.1, "applying": true }
  ],
  "planet_focus": "Saturn conjunct Mercury",
  "intensity_level": 7,
  "shareable_card_data": {
    "sun_sign": "Scorpio",
    "moon_sign": "Capricorn",
    "rising_sign": "Virgo",
    "brutal_headline": "You are not stuck...",
    "date": "2026-05-30"
  },
  "is_free_tier": false,
  "created_at": "2026-05-30T06:00:00.000Z"
}
```

### Behavior
- Idempotent. If a row exists for `(user_id, reading_date)`, it is returned without an LLM call.
- Otherwise: loads the natal chart, computes today's transits with the shared engine, calls the LLM.
- LLM JSON output is validated against `DailyReadingLLMSchema`. On schema failure the function returns 503 and does **not** persist anything, so a malformed reading is never cached for the day.
- All text fields (`brutal_headline`, `reading_text`, every `stoic_actions[].action` and `.why`) are run through `sanitizeVoice` before saving.
- `is_free_tier` reflects subscription state at write time (`true` when no active subscription).
- A unique-violation on insert (concurrent first request) is handled by re-reading and returning the existing row.

### LLM
- Driven by the shared `callLLM` helper. `maxTokens: 1024`.

### Errors
- `401 { "error": "Unauthorized" }`, missing or invalid JWT.
- `400 { "error": "Invalid request body" }`, body was not valid JSON.
- `409 { "error": "No natal chart found. Complete onboarding first.", "code": "no_chart" }`, the user has no `natal_charts` row yet. Clients should branch on `code === "no_chart"` and route to onboarding.
- `503 { "error": "Your reading is taking longer than usual. Please try again in a moment." }`, the LLM call failed.
- `503 { "error": "Your reading did not come through cleanly. Please try again." }`, LLM output failed schema validation.
- `500 { "error": "Could not save your reading. Please try again." }`, save failed and no existing row was found.
- `500 { "error": "Reading generation is temporarily unavailable. Please try again." }`, unhandled failure.

---

## oracle

Multi-turn Oracle chat, Pro-only. The Oracle speaks as the user's natal chart and cites placements.

### Request

```
POST /functions/v1/oracle
Authorization: Bearer <user-access-token>
Content-Type: application/json
```

```json
{
  "message": "Why do I keep self-sabotaging in relationships?",
  "conversation_id": "uuid-or-null"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | string | yes | The user's question. Trimmed; empty is a 400. |
| `conversation_id` | string | no | Omit to start a new conversation. An unknown or unowned id is treated as a new conversation, never an update of someone else's row. |

### Response (200)

```json
{
  "response": "Chiron in your 7th house, square Venus. You are not self-sabotaging...",
  "conversation_id": "uuid"
}
```

### Behavior
- Hard Pro gate: 403 unless `user_subscriptions.status === 'active'`.
- Loads the natal chart for system-prompt context.
- If `conversation_id` is provided, the row is loaded only when its `user_id` matches the caller; ownership is enforced on both read and write.
- Sliding window: the last 20 messages are sent to the LLM, each truncated to 4,000 chars.
- The response is run through `sanitizeVoice`.
- The conversation is persisted (insert for a new conversation, update for an owned one). A persistence failure is logged but the response is still returned.

### LLM
- Driven by the shared `callLLM` helper. `maxTokens: 512`.

### Errors
- `401 { "error": "Unauthorized" }`, missing or invalid JWT.
- `400 { "error": "Invalid request body" }`, body was not valid JSON.
- `400 { "error": "Ask the Oracle something." }`, empty `message`.
- `403 { "error": "Pro subscription required" }`, no active subscription.
- `409 { "error": "No natal chart found. Complete onboarding first.", "code": "no_chart" }`, the user has no chart yet.
- `503 { "error": "The Oracle is gathering itself. Please ask again in a moment." }`, the LLM call failed.
- `500 { "error": "The Oracle is temporarily unavailable. Please try again." }`, unhandled failure.

---

## demo-reading

Public, rate-limited landing-page demo. No user JWT; uses the Supabase anon key as Bearer. Builds a real date-only chart (accurate Sun and Moon, with an honest intra-day caveat on the Moon, plus the sharpest slow-body aspect) and writes a brutal verdict.

### Request

```
POST /functions/v1/demo-reading
Authorization: Bearer <SUPABASE_ANON_KEY>
Content-Type: application/json
```

```json
{ "birth_date": "1995-08-23" }
```

### Response (200)

```json
{
  "success": true,
  "sun_sign": "Virgo",
  "sun_degree": 0,
  "moon_sign": "Sagittarius",
  "sharpest_aspect": "Saturn square Neptune",
  "brutal_headline": "Your need to fix everything is the original wound.",
  "excerpt": "Virgo Sun, the criticism you aim outward is the criticism you cannot survive turning inward.",
  "birth_date": "1995-08-23"
}
```

| Field | Type | Notes |
|---|---|---|
| `success` | boolean | `true` on a generated verdict. |
| `sun_sign` | string | From the real date-only chart. |
| `sun_degree` | number | Whole-degree Sun position (rounded). |
| `moon_sign` | string or null | The Moon sign, or `null` when the date crosses a sign boundary and the sign cannot be stated with certainty without a birth time. |
| `sharpest_aspect` | string or null | The tightest reliable slow-body aspect (for example `"Saturn square Neptune"`), or `null` if none qualifies. |
| `brutal_headline` | string | Em-dash-free, 12 to 15 words. |
| `excerpt` | string | Em-dash-free teaser, 20 to 30 words. |
| `birth_date` | string | Echoed back. |

### Behavior
- Fingerprint = SHA-256(IP + User-Agent), computed from `x-forwarded-for` / `cf-connecting-ip` plus the User-Agent.
- Per-fingerprint limit: **10 requests / 1 hour** (atomic Postgres window via `demo_rate_limit_bump`).
- Global daily limit: **2,000 LLM calls / UTC day** (via `demo_global_budget_bump`). Both checks fail closed.
- The Sun sign's shadow traits are used as system-prompt context. `headline` and `excerpt` are run through `sanitizeVoice`.
- If the LLM output fails schema validation, the function falls back to a templated brutal headline and excerpt and still returns 200 with `success: true`.

### Errors
- `429 { "success": false, "error": "Too many requests. Please try again later." }`, fingerprint or global limit hit.
- `400 { "success": false, "error": "Invalid request body" }`, body was not valid JSON.
- `400 { "success": false, "error": "A valid birth date (YYYY-MM-DD) is required." }`, missing or malformed `birth_date`.
- `503 { "success": false, "error": "The Oracle is overwhelmed right now. Please try again in a moment." }`, the LLM call failed.
- `500 { "success": false, "error": "Failed to generate your demo reading. Please try again." }`, unhandled failure.

---

## transcribe-date

Transcribe a spoken date of birth and parse it into ISO plus structured fields. Used by the landing-page voice demo and onboarding's `VoiceDateInput`. This endpoint is unauthenticated and calls two paid OpenAI APIs, so it is capped on every axis.

### Request

```
POST /functions/v1/transcribe-date
Authorization: Bearer <SUPABASE_ANON_KEY>
Content-Type: multipart/form-data
```

Form field: `audio`, typically `audio/webm` (or `audio/mp4` for Safari).

### Caps and limits
- Per-fingerprint limit: **20 attempts / 1 hour** (namespaced `tx|` fingerprint via `demo_rate_limit_bump`).
- Global daily budget: **3,000 transcriptions / UTC day** (via `api_global_budget_bump` with bucket `transcribe`).
- Audio size cap: **6 MB**. Larger uploads are rejected with 413 before any OpenAI call.
- Each upstream OpenAI request is bounded by a **20-second** timeout.
- All checks fail closed: a missing key or a failing limiter returns a user-friendly fallback rather than calling OpenAI.

### Response (200)

```json
{
  "success": true,
  "transcript": "July 3rd 1987",
  "parsed": {
    "iso": "1987-07-03",
    "display": "Friday, July 3, 1987",
    "day": 3,
    "month": 7,
    "year": 1987,
    "confidence": "high",
    "interpretation": "Standard month-day-year format with 4-digit year"
  }
}
```

### Behavior
- Step 1: Whisper (`whisper-1`) transcription, English, prompted to expect a spoken date of birth.
- Step 2: GPT-4o-mini parses the transcript into JSON. Rules: a valid past calendar date, year between 1900 and today, two-digit years interpreted to a plausible birth year.
- The parsed date is re-validated server-side (real calendar date, not in the future, year >= 1900) before it is returned.

### Errors
- `429 { "success": false, ... }`, per-fingerprint or global daily limit hit. Message points the user at the date picker.
- `400 { "success": false, "error": "Invalid upload." }`, the request was not valid multipart form data.
- `400 { "success": false, "error": "No audio file provided." }`, the `audio` field was missing or not a file.
- `400 { "success": false, "error": "No speech detected. Please try again." }`, the uploaded file was empty (0 bytes).
- `413 { "success": false, "error": "That recording is too long. Please say just your birth date." }`, audio over 6 MB.
- `200 { "success": false, "error": "...", "transcript": "...", "parsed": null }`, transcription succeeded but the date could not be parsed or validated (empty transcript, unparseable, invalid calendar date, future date, year before 1900). The UI falls back to the date picker.
- `503 { "success": false, ... }`, OpenAI key missing, Whisper timeout or failure, or GPT-4o-mini failure. Fallback message returned.
- `500 { "success": false, "error": "Failed to process audio. Please use the date picker." }`, unhandled failure.

All error bodies carry the `{ success, error, transcript, parsed }` shape so the client can render a consistent fallback.

---

## create-checkout

Create a Stripe Checkout Session for a Pro subscription on the `mindmaker_llc` Stripe account, and stamp attribution onto the customer, the session, and the subscription.

### Request

```
POST /functions/v1/create-checkout
Authorization: Bearer <user-access-token>
Content-Type: application/json
```

```json
{
  "success_url": "https://merciless.app/reading?upgraded=true",
  "cancel_url":  "https://merciless.app/reading",
  "attribution": {
    "mcl_cid": "b1a2...",
    "utm_source": "tiktok",
    "utm_medium": "organic",
    "utm_campaign": "brutal_headline",
    "utm_content": "voice_demo",
    "utm_term": null,
    "agent": "cleo",
    "landing_path": "/?utm_source=tiktok",
    "referrer": "https://www.tiktok.com/"
  }
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `success_url` | string | no | Falls back to `${origin}/reading?upgraded=true`. |
| `cancel_url` | string | no | Falls back to `${origin}/reading`. |
| `attribution` | object | no | First-party click id plus first-touch UTM, agent, landing path, and referrer. Only the recognised keys are forwarded, each coerced to a string and truncated to 450 chars. The client builds this with `attributionForCheckout()` (see `src/lib/attribution.ts`). |

Recognised `attribution` keys: `mcl_cid`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `agent`, `landing_path`, `referrer`. Unknown keys are dropped.

### Response (200)

```json
{ "url": "https://checkout.stripe.com/c/pay/cs_live_..." }
```

### Behavior
- Email is read from the verified JWT; clients cannot pass a different email.
- Looks up an existing `stripe_customer_id` in `user_subscriptions`. If none, a Stripe customer is created with `metadata: { user_id, ...attribution }`. If one exists, the customer's metadata is refreshed with the latest attribution (best effort; a failure is logged, not fatal).
- Creates a Checkout Session in `subscription` mode using the `STRIPE_PRICE_ID` env var (fallback hardcoded to `price_1TJEo24w6vAdI2o57Rz8Cp3X`, product `prod_UHoQV8ymZNk4Um`, $4.99/mo USD).
- Stamps `{ user_id, price_id, ...attribution }` onto the **session** metadata and `{ user_id, ...attribution }` onto the **subscription** metadata. The webhook reads these back to link the purchase to a campaign.

### Currency
The currency is determined by the Stripe Price object. The configured price is **USD**. If GBP appears at checkout, the wrong price is configured; see [SETUP.md](SETUP.md).

### Errors
- `401 { "error": "Unauthorized" }`, missing or invalid JWT.
- `503 { "error": "Checkout is temporarily unavailable. Please try again later." }`, `STRIPE_SECRET_KEY` not set.
- `500 { "error": "Could not start checkout. Please try again." }`, Stripe API error or unhandled failure.

A non-JSON body is tolerated: it is treated as an empty object, so URLs fall back to the origin and no attribution is stamped.

---

## stripe-webhook

Handle subscription lifecycle from Stripe and emit money events to the attribution warehouse. No JWT; authenticity is the Stripe signature.

### Request

```
POST /functions/v1/stripe-webhook
Stripe-Signature: <header>
Content-Type: application/json
```

Body: raw Stripe event JSON. Do not modify it; the signature is computed over the exact bytes.

### Idempotency
Every event id is inserted into `stripe_processed_events` before handling. A unique-violation (`23505`) means the event was already processed (replay, retry, or out-of-order delivery) and the function returns `{ "received": true, "duplicate": true }` without re-running the handler. (Migration: `supabase/migrations/20260530130000`.)

### Events handled

| Event | Subscription action | Warehouse emit |
|---|---|---|
| `checkout.session.completed` | Upserts `user_subscriptions` with `status='active'`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`. | `purchased` (with amount, currency, attribution from session metadata). |
| `customer.subscription.updated` | Updates `status`, `current_period_end`, `cancel_at_period_end`. | none |
| `customer.subscription.deleted` | Sets `status='canceled'`. | `churned` (attribution from subscription metadata). |
| `charge.refunded` | none | `refunded` (refund amount, currency, attribution from charge metadata). |

Each emit carries a `dedupe_key` of the form `merciless:<event>:<stripe_event_id>` and `stripe_account: "mindmaker_llc"`. Money events originate **only** here, never from the browser.

### Response (200)

```json
{ "received": true }
```

### Errors
- `400`, missing or invalid signature, or `STRIPE_WEBHOOK_SECRET` not set.
- `500 { "error": "handler error" }`, a DB or handler error after the signature verified.

### Endpoint URL

```
https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook
```

---

## track

Public client-side funnel-event sink. The browser cannot hold the warehouse ingest secret, so it posts events here and this function forwards them to the Mindmaker OS warehouse with the secret attached.

### Request

```
POST /functions/v1/track
Authorization: Bearer <SUPABASE_ANON_KEY>
Content-Type: application/json
```

```json
{
  "event": "demo_played",
  "anonymous_id": "b1a2c3...",
  "user_id": null,
  "email": null,
  "utm_source": "tiktok",
  "utm_medium": "organic",
  "utm_campaign": "brutal_headline",
  "utm_content": "voice_demo",
  "utm_term": null,
  "agent": "cleo",
  "referrer": "https://www.tiktok.com/",
  "landing_path": "/?utm_source=tiktok",
  "metadata": {},
  "dedupe_key": null
}
```

| Field | Type | Notes |
|---|---|---|
| `event` | string | Required. Must be one of the allowed client events below; anything else is a 400. |
| `anonymous_id` | string or null | The first-party `mcl_cid`. |
| `user_id`, `email` | string or null | Present after signup. |
| `utm_*`, `agent`, `referrer`, `landing_path` | string or null | First-touch attribution. |
| `metadata` | object | Free-form; defaults to `{}`. |
| `dedupe_key` | string or null | Optional client-supplied dedupe key. |

### Allowed client events
`landed`, `demo_played`, `demo_stalled`, `signed_up`, `chart_calculated`, `activated`, `paywall_hit`, `verdict_viewed`, `share_card_created`, `synastry_pair_minted`, `recipient_unblurred`.

Money events (`purchased`, `refunded`, `churned`) are **not** acceptable here; they come only from the signature-verified `stripe-webhook`.

### Response (200)

```json
{ "ok": true }
```

### Behavior
- Method must be `POST` (otherwise 405).
- Best-effort per-fingerprint rate limit of **120 events / 1 hour** (namespaced `track|` fingerprint). A rate-limit hiccup never blocks emission; only an explicit over-limit count returns 429.
- The event is normalized into the shared `AttributionEvent` shape and forwarded with `forwardEvent`, which attaches `app: "merciless"` and the `x-attribution-secret` header. Forwarding is fire-and-forget and never throws.

### Errors
- `405 { "ok": false }`, method other than POST.
- `400 { "ok": false, "error": "Invalid body" }`, body was not valid JSON.
- `400 { "ok": false, "error": "unsupported event" }`, `event` not in the allowed set.
- `429 { "ok": false, "error": "rate limited" }`, per-fingerprint hourly limit hit.

---

## Attribution

Merciless runs a first-party attribution spine. The client mints a durable `mcl_cid` on first touch and captures first-touch UTM, `agent`, `referrer`, and `landing_path`. First touch wins and is stored in both `localStorage` and a cookie so it survives the SPA boundary and the email-confirm round trip; it is also written to the auth user's metadata at signup. The implementation is `src/lib/attribution.ts`.

### Event contract

Every funnel event resolves to a single shape (`AttributionEvent`, defined in `supabase/functions/_shared/attribution.ts`):

```json
{
  "app": "merciless",
  "event": "demo_played",
  "occurred_at": "2026-05-30T12:00:00.000Z",
  "anonymous_id": "b1a2c3... (the mcl_cid)",
  "user_id": "uuid-or-null",
  "email": "string-or-null",
  "utm_source": "tiktok",
  "utm_medium": "organic",
  "utm_campaign": "brutal_headline",
  "utm_content": "voice_demo",
  "utm_term": null,
  "campaign_id": null,
  "agent": "cleo",
  "referrer": "https://www.tiktok.com/",
  "landing_path": "/?utm_source=tiktok",
  "stripe_account": "mindmaker_llc",
  "stripe_customer_id": "cus_...",
  "stripe_subscription_id": "sub_...",
  "amount_cents": 499,
  "currency": "usd",
  "metadata": {},
  "dedupe_key": "merciless:purchased:evt_..."
}
```

The full funnel: `landed`, `demo_played`, `signed_up`, `chart_calculated`, `activated`, `paywall_hit` (client, via `track`), then `purchased`, `refunded`, `churned` (server, from `stripe-webhook`). The client also emits `demo_stalled`, `verdict_viewed`, `share_card_created`, `synastry_pair_minted`, and `recipient_unblurred`.

### Two emit paths
1. **Client funnel events** go to the Merciless `track` function with the anon key. `track` validates the event name, rate-limits, and forwards.
2. **Money events** come from `stripe-webhook`, which reads attribution out of Stripe session / subscription / charge metadata (stamped by `create-checkout`) and forwards `purchased` / `refunded` / `churned`.

### Warehouse front door
Both paths forward through `forwardEvent`, which POSTs to the Mindmaker OS warehouse ingest function:

```
POST https://gojpffsrxybbpbdzzrvs.supabase.co/functions/v1/ingest-attribution
x-attribution-secret: <ATTRIBUTION_INGEST_SECRET>
content-type: application/json
```

Merciless holds **only** `ATTRIBUTION_INGEST_SECRET` (overridable target via `ATTRIBUTION_INGEST_URL`); it never holds the warehouse service-role key or DB URL. The call is timeout-bounded (5s) and fire-and-forget: a warehouse outage never breaks a user flow or a webhook ack. If `ATTRIBUTION_INGEST_SECRET` is unset, emission is skipped silently.

The warehouse (project `gojpffsrxybbpbdzzrvs`) writes to an `attribution` schema and exposes two read models: `attribution.funnel_by_campaign` (Maya, for CAC) and `attribution.revenue_by_campaign` (Leo, for LTV / revenue), spanning the `mindmaker_llc` and `fractionl_ai` Stripe accounts. Warehouse artifacts live under `_upgrade/merciless/warehouse`.

### Tagging links
Tag fleet-driven links with `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, and `agent`. Optionally pass `mcl_cid` to stitch a known click.

```
https://merciless.app/?utm_source=tiktok&utm_medium=organic&utm_campaign=brutal_headline&agent=cleo&mcl_cid=<optional>
```

---

## Error envelope

Auth and lifecycle functions return:

```json
{ "error": "Human-readable message" }
```

Some carry a machine-readable `code` (currently `no_chart`, returned with 409 by `daily-reading` and `oracle`).

`demo-reading` and `transcribe-date` use the success-flag shape:

```json
{ "success": false, "error": "Human-readable message", "transcript": null, "parsed": null }
```

(`transcript` and `parsed` are present only on `transcribe-date`.)

`track` uses:

```json
{ "ok": false, "error": "Human-readable message" }
```

### Status code conventions

| Code | Meaning |
|---|---|
| 200 | Success. Also used by `demo-reading` and `transcribe-date` for handled `success: false` cases where the input, not the server, is the issue. |
| 400 | Bad request, malformed body, missing field, unsupported event, or webhook signature invalid. |
| 401 | Missing or invalid JWT. |
| 403 | Pro subscription required (`oracle`). |
| 405 | Method not allowed (`track`, non-POST). |
| 409 | No natal chart yet (`daily-reading`, `oracle`); body carries `code: "no_chart"`. |
| 413 | Payload too large (`transcribe-date`, audio over 6 MB). |
| 429 | Rate-limited (`demo-reading`, `transcribe-date`, `track`). |
| 500 | Server error. Check `supabase functions logs <name>`. |
| 503 | Upstream unavailable (LLM, Whisper, GPT-4o-mini, or a missing required secret). |

---

## Reusing the API from external agents

The same JSON contracts power both the in-app UI and any external automation. To call as a server-side agent on behalf of a user:

1. Create a Supabase user (for example via admin invite or signup).
2. Sign in via `supabase.auth.signInWithPassword(...)` to obtain an `access_token`.
3. Pass that access token as `Authorization: Bearer <access_token>` to any auth-required function.

`demo-reading`, `transcribe-date`, and `track` accept the public anon key, suitable for unauthenticated landing-page funnels. `public/offer.json` is the single machine-readable source of product and offer truth the fleet sells from, and `public/llms.txt` is the agent entry point.

> Brand-voice contract: any text returned by `daily-reading`, `oracle`, or `demo-reading` is em-dash-free by construction. Agents redistributing this content into ads, DMs, or social posts can paste it verbatim.
