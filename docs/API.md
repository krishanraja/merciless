# Merciless — Edge Function API Reference

All edge functions are deployed to Supabase and accessed at:

```
https://<PROJECT_REF>.supabase.co/functions/v1/<function-name>
```

For the live deployment, `<PROJECT_REF>` is `cgkcplcamsijghalintq`.

---

## Auth model

| Function | Required `Authorization` | Notes |
|---|---|---|
| `natal-chart` | `Bearer <user-access-token>` | Verified with `supabase.auth.getUser(token)`. `user_id` is derived from the token, not the body. |
| `daily-reading` | `Bearer <user-access-token>` | Same. |
| `oracle` | `Bearer <user-access-token>` | Same + active subscription gate (403 otherwise). |
| `create-checkout` | `Bearer <user-access-token>` | Same. Email is taken from token. |
| `stripe-webhook` | `stripe-signature` header | Body must be raw; verified with `STRIPE_WEBHOOK_SECRET`. |
| `demo-reading` | `Bearer <SUPABASE_ANON_KEY>` | No user JWT. Postgres-backed rate limits per fingerprint and global daily LLM budget. |
| `transcribe-date` | `Bearer <SUPABASE_ANON_KEY>` | No user JWT. |

`supabase-js` adds the `Authorization: Bearer <access-token>` header automatically when you call `supabase.functions.invoke(...)` from a signed-in client. Direct `fetch` callers must set it themselves.

All functions accept `OPTIONS` for CORS preflight and reply with the headers below.

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
```

The `stripe-webhook` function additionally allows `stripe-signature`.

---

## natal-chart

Calculate (or recompute) the user's natal chart from birth data.

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
| `birth_date` | string | yes | `YYYY-MM-DD` |
| `birth_time` | string | no | `HH:MM` 24h. Defaults to `12:00` if absent. |
| `birth_location` | string | yes | Freeform display name (no geocoding done here). |
| `latitude` | number | no | Defaults to `40.7128` (NYC). |
| `longitude` | number | no | Defaults to `0`. |
| `timezone` | string | no | IANA. Defaults to `UTC`. |

> `user_id` is **not** read from the body. It is derived from the verified JWT.

### Response (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "planets": {
    "Sun":     { "sign": "Scorpio",   "longitude": 215.34, "degree": 5.34 },
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
    "Chiron":  { "sign": "Virgo", "longitude": 165.0, "degree": 15.0 }
  },
  "houses": [
    { "house": 1, "sign": "Virgo",  "longitude": 170.5 },
    { "house": 2, "sign": "Libra",  "longitude": 200.5 }
  ],
  "aspects": [
    { "planet1": "Sun", "planet2": "Moon", "aspect": "sextile", "orb": 2.5 }
  ],
  "ascendant": "Virgo",
  "midheaven": "Gemini",
  "sun_sign": "Scorpio",
  "moon_sign": "Capricorn",
  "rising_sign": "Virgo",
  "calculated_at": "2026-04-26T15:30:00.000Z"
}
```

### Side effects
- Upserts `user_birth_data`.
- Upserts `natal_charts`.

### Bodies calculated
12 total: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, NorthNode (mean), Chiron (approximate).

### Aspects
5 types — conjunction (8°), sextile (6°), square (8°), trine (8°), opposition (8°).

### Errors
- `401 { "error": "Unauthorized" }` — invalid or missing JWT.
- `500 { "error": "..." }` — DB error or computation failure.

---

## daily-reading

Generate or retrieve today's AI reading for the authenticated user.

### Request

```
POST /functions/v1/daily-reading
Authorization: Bearer <user-access-token>
Content-Type: application/json
```

```json
{}
```

> The body is currently ignored. `user_id` and `today` are derived from the token and server clock.

### Response (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "reading_date": "2026-04-26",
  "brutal_headline": "You're Not Stuck. You're Avoiding the Decision You Already Know You Need to Make.",
  "reading_text": "Saturn transiting your natal Mercury in the 3rd house...",
  "stoic_actions": [
    { "action": "Write the unsent message.",
      "why": "Mercury-Saturn transit demands honest communication.",
      "difficulty": "hard" },
    { "action": "Cancel one commitment you agreed to out of guilt.",
      "why": "Moon in Capricorn opposite natal Venus; guilt is not obligation.",
      "difficulty": "medium" },
    { "action": "Do not explain your decisions today. State them.",
      "why": "Mars trine natal Jupiter gives you authority. Use it.",
      "difficulty": "easy" }
  ],
  "active_transits": [
    { "transiting_planet": "Saturn", "natal_planet": "Mercury",
      "aspect": "conjunct", "orb": 2.1, "is_applying": true }
  ],
  "planet_focus": "Saturn conjunct Mercury",
  "intensity_level": 7,
  "shareable_card_data": {
    "sun_sign": "Scorpio",
    "moon_sign": "Capricorn",
    "rising_sign": "Virgo",
    "brutal_headline": "You're Not Stuck...",
    "date": "2026-04-26"
  },
  "is_free_tier": false,
  "created_at": "2026-04-26T06:00:00.000Z"
}
```

### Behavior
- If a row exists for `(user_id, today)`, returns it without an LLM call.
- Otherwise: loads natal chart, computes today's transits, calls LLM.
- LLM JSON output is validated against `DailyReadingLLMSchema`. On schema failure, a safe-stub row is inserted so the page can render.
- `is_free_tier` reflects subscription state at write time.

### LLM
- Primary: Google Gemini 2.5 Flash. Fallback: OpenAI GPT-4o-mini.
- `maxTokens: 1024`. Em dashes are stripped from all returned text fields.

### Errors
- `401` — invalid JWT.
- `500 { "error": "No natal chart found. Complete onboarding first." }` — user has not finished `/onboarding`.
- `503 { "error": "Reading generation is temporarily unavailable. Please try again later." }` — both LLM providers failed.

---

## oracle

Multi-turn Oracle chat. Pro-only.

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
| `message` | string | yes | The user's question. |
| `conversation_id` | string | no | Omit to start a new conversation. |

### Response (200)

```json
{
  "response": "Chiron in your 7th house, square Venus. You're not self-sabotaging...",
  "conversation_id": "uuid"
}
```

### Behavior
- 403 if `user_subscriptions.status !== 'active'`.
- Loads natal chart for system-prompt context.
- If `conversation_id` is provided, ownership is verified — only the conversation's `user_id` can append.
- Sliding window: last 20 messages, each capped to 4,000 chars before being sent to the LLM.
- Em dashes stripped from response.

### LLM
- Primary: Gemini 2.5 Flash. Fallback: OpenAI GPT-4o-mini.
- `maxTokens: 512`.

### Errors
- `401 { "error": "Unauthorized" }` — invalid JWT.
- `403 { "error": "Pro subscription required" }` — no active subscription.
- `500 { "error": "..." }` — chart missing or DB error.
- `503 { "error": "The Oracle is temporarily unavailable. Please try again later." }` — both LLMs failed.

---

## demo-reading

Public, rate-limited landing-page demo. No JWT — uses the Supabase anon key as Bearer.

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
  "brutal_headline": "Your need to fix everything is the original wound.",
  "excerpt": "Virgo Sun, the criticism you aim outward is the criticism you can't survive turning inward.",
  "birth_date": "1995-08-23"
}
```

### Behavior
- Fingerprint = SHA-256(IP + User-Agent).
- Per-fingerprint limit: **10 requests / 1 hour** (atomic Postgres window).
- Global daily limit: **2,000 LLM calls / UTC day**.
- Sun sign computed by month/day (no chart math).
- LLM call uses the sign's shadow traits as system-prompt context.
- Em dashes stripped from headline and excerpt.

### Errors
- `429 { "success": false, "error": "Too many requests. Please try again later." }` — fingerprint or global limit hit.
- `503 { "success": false, "error": "Reading generation is temporarily unavailable. Please try again later." }` — both LLMs failed.
- `500 { "success": false, "error": "Birth date is required" | "Invalid date format. Use YYYY-MM-DD" }` — bad input.

---

## transcribe-date

Transcribe a spoken date-of-birth and parse it into ISO + structured fields. Used by the landing-page voice demo and onboarding's `VoiceDateInput`.

### Request

```
POST /functions/v1/transcribe-date
Authorization: Bearer <SUPABASE_ANON_KEY>
Content-Type: multipart/form-data
```

Form field: `audio` — typically `audio/webm` (or `audio/mp4` for Safari). Whisper accepts up to 25 MB.

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
- Step 1: Whisper (`whisper-1`) transcription, English, prompted to expect a spoken DOB.
- Step 2: GPT-4o-mini parses transcript → JSON; rules: must be a valid past calendar date, year ≥ 1900, ambiguous 2-digit years interpreted plausibly.
- Validates `Date(year, month-1, day)`; rejects future dates.

### Errors
- `200 { "success": false, "error": "...", "transcript": "...", "parsed": null }` — date couldn't be parsed; UI falls back to date picker.
- `503` — Whisper or GPT-4o-mini failure (e.g. quota); user-friendly fallback message returned.

---

## create-checkout

Create a Stripe Checkout Session for a Pro subscription.

### Request

```
POST /functions/v1/create-checkout
Authorization: Bearer <user-access-token>
Content-Type: application/json
```

```json
{
  "success_url": "https://merciless.app/reading?upgraded=true",
  "cancel_url":  "https://merciless.app/reading"
}
```

`success_url` and `cancel_url` are optional; if omitted, the function falls back to `${origin}/reading?upgraded=true` and `${origin}/reading` based on the `Origin` request header.

### Response (200)

```json
{ "url": "https://checkout.stripe.com/c/pay/cs_live_..." }
```

### Behavior
- Email is read from the verified JWT — clients cannot pass a different email.
- Looks up existing `stripe_customer_id` in `user_subscriptions`; creates a customer if missing.
- Creates Checkout Session in `subscription` mode using `STRIPE_PRICE_ID` env var (fallback hardcoded to `price_1TJEo24w6vAdI2o57Rz8Cp3X`).
- Stamps `user_id` and `price_id` into Session metadata for the webhook to consume.

### Currency
The currency is determined by the Stripe Price object. The configured price is **USD**. If GBP appears at checkout, the wrong price is configured — see [SETUP.md](SETUP.md).

### Errors
- `401` — invalid JWT.
- `500` — Stripe API error.

---

## stripe-webhook

Handle subscription lifecycle from Stripe.

### Request

```
POST /functions/v1/stripe-webhook
Stripe-Signature: <header>
Content-Type: application/json
```

Body: raw Stripe event JSON (do not modify; signature is computed over the exact bytes).

### Events handled

| Event | Action |
|---|---|
| `checkout.session.completed` | Upserts `user_subscriptions` with `status='active'`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`. |
| `customer.subscription.updated` | Updates `status`, `current_period_end`, `cancel_at_period_end`. |
| `customer.subscription.deleted` | Sets `status='canceled'`. |

### Response (200)

```json
{ "received": true }
```

### Errors
- `400` — missing or invalid signature, or `STRIPE_WEBHOOK_SECRET` not set.
- `500` — DB error during handler.

### Endpoint URL

```
https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook
```

---

## Error envelope

Most errors return:

```json
{ "error": "Human-readable message" }
```

`demo-reading` and `transcribe-date` use:

```json
{ "success": false, "error": "Human-readable message", "transcript": null, "parsed": null }
```

Status code conventions:

| Code | Meaning |
|---|---|
| 200 | Success (also used by demo/transcribe for handled "success: false" responses where the input is the issue, not the server) |
| 400 | Bad request / webhook signature invalid |
| 401 | Missing or invalid JWT |
| 403 | Pro subscription required (Oracle only) |
| 429 | Rate-limited (demo-reading only) |
| 500 | Server error — check `supabase functions logs <name>` |
| 503 | Both LLM providers (or Whisper / GPT-4o-mini) unavailable |

---

## Reusing the API from external agents

The same JSON contracts power both the in-app UI and any external automation. To call as a server-side agent on behalf of a user:

1. Create a Supabase user (e.g., via admin invite or signup).
2. Sign in via `supabase.auth.signInWithPassword(...)` to obtain an `access_token`.
3. Pass that access token as `Authorization: Bearer <access_token>` to any auth-required function.

Demo and transcription endpoints accept the public anon key, suitable for unauthenticated landing-page funnels.

> Brand-voice contract: any text returned by `daily-reading`, `oracle`, or `demo-reading` is em-dash-free by construction. Agents redistributing this content into ads, DMs, or social posts can paste verbatim.
