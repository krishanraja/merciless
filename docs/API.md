# Merciless — Edge Function API Reference

All edge functions are deployed to Supabase and accessed at:
```
https://<PROJECT_REF>.supabase.co/functions/v1/<function-name>
```

All requests require `Authorization: Bearer <supabase-anon-key>` header (except stripe-webhook which uses Stripe signature verification).

---

## natal-chart

**Calculate natal chart from birth data.**

### Request

```
POST /functions/v1/natal-chart
Content-Type: application/json
Authorization: Bearer <anon-key>
```

```json
{
  "birth_date": "1994-11-08",
  "birth_time": "14:30",
  "birth_location": "New York, USA",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "timezone": "America/New_York",
  "user_id": "uuid-here"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `birth_date` | string | Yes | ISO date format (YYYY-MM-DD) |
| `birth_time` | string | No | 24h format (HH:MM). Defaults to 12:00 if omitted |
| `birth_location` | string | Yes | Freeform city/country |
| `latitude` | number | No | Defaults to 40.7128 (NYC) if omitted |
| `longitude` | number | No | Defaults to 0 if omitted |
| `timezone` | string | No | IANA timezone. Defaults to UTC |
| `user_id` | string | Yes | Supabase auth user ID |

### Response (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "planets": {
    "Sun": { "sign": "Scorpio", "longitude": 215.34, "degree": 5.34 },
    "Moon": { "sign": "Capricorn", "longitude": 285.12, "degree": 15.12 },
    "Mercury": { "sign": "Scorpio", "longitude": 220.5, "degree": 10.5 },
    "...": "..."
  },
  "houses": [
    { "house": 1, "sign": "Virgo", "longitude": 170.5 },
    { "house": 2, "sign": "Libra", "longitude": 200.5 },
    "..."
  ],
  "aspects": [
    { "planet1": "Sun", "planet2": "Moon", "aspect": "sextile", "orb": 2.5 },
    "..."
  ],
  "ascendant": "Virgo",
  "midheaven": "Gemini",
  "sun_sign": "Scorpio",
  "moon_sign": "Capricorn",
  "rising_sign": "Virgo",
  "calculated_at": "2026-04-06T15:30:00.000Z"
}
```

### Side Effects
- Upserts `user_birth_data` row
- Upserts `natal_charts` row

### Celestial Bodies Calculated
Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, North Node, Chiron (12 total)

---

## daily-reading

**Generate or retrieve today's AI reading.**

### Request

```
POST /functions/v1/daily-reading
Content-Type: application/json
Authorization: Bearer <access-token>
```

```json
{
  "user_id": "uuid-here"
}
```

### Response (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "reading_date": "2026-04-06",
  "brutal_headline": "You're Not Stuck. You're Avoiding the Decision You Already Know You Need to Make.",
  "reading_text": "Saturn transiting your natal Mercury in the 3rd house...",
  "stoic_actions": [
    {
      "action": "Write the unsent message.",
      "why": "Mercury-Saturn transit demands honest communication.",
      "difficulty": "hard"
    },
    {
      "action": "Cancel one commitment you agreed to out of guilt.",
      "why": "Moon in Capricorn opposite natal Venus — guilt is not obligation.",
      "difficulty": "medium"
    },
    {
      "action": "Do not explain your decisions today. State them.",
      "why": "Mars trine natal Jupiter gives you authority. Use it.",
      "difficulty": "easy"
    }
  ],
  "active_transits": [
    {
      "transiting_planet": "Saturn",
      "natal_planet": "Mercury",
      "aspect": "conjunct",
      "orb": 2.1,
      "is_applying": true
    }
  ],
  "planet_focus": "Saturn conjunct Mercury",
  "intensity_level": 7,
  "shareable_card_data": {
    "sun_sign": "Scorpio",
    "moon_sign": "Capricorn",
    "rising_sign": "Virgo",
    "brutal_headline": "You're Not Stuck...",
    "date": "2026-04-06"
  },
  "is_free_tier": false,
  "created_at": "2026-04-06T06:00:00.000Z"
}
```

### Behavior
- If a reading exists for today, returns it immediately (no AI call)
- If no reading exists, generates one via Claude API and stores it
- Requires natal chart to exist (returns 500 with "No natal chart found" otherwise)

### AI Model
- **Model:** claude-sonnet-4-6
- **Max tokens:** 1024
- **System prompt:** Oracle persona
- **Response format:** JSON with fallback regex parsing

### Side Effects
- Inserts into `daily_readings` if generating new reading

---

## oracle

**Multi-turn conversational Oracle (Pro only).**

### Request

```
POST /functions/v1/oracle
Content-Type: application/json
Authorization: Bearer <access-token>
```

```json
{
  "user_id": "uuid-here",
  "message": "Why do I keep self-sabotaging in relationships?",
  "conversation_id": "uuid-or-null"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `user_id` | string | Yes | Must have active subscription |
| `message` | string | Yes | User's question |
| `conversation_id` | string | No | Omit for new conversation |

### Response (200)

```json
{
  "response": "Chiron in your 7th house, square Venus. You're not self-sabotaging...",
  "conversation_id": "uuid"
}
```

### Response (403) — No subscription

```json
{
  "error": "Pro subscription required"
}
```

### Behavior
- Checks `user_subscriptions` for `status = 'active'`
- Loads natal chart for system prompt context
- Sends last 20 messages to Claude for context
- Creates new `oracle_conversations` record if no `conversation_id` provided
- Updates existing conversation if `conversation_id` provided

### AI Model
- **Model:** claude-sonnet-4-6
- **Max tokens:** 512
- **System prompt:** Oracle persona + full chart context

---

## create-checkout

**Create Stripe checkout session for Pro subscription.**

### Request

```
POST /functions/v1/create-checkout
Content-Type: application/json
Authorization: Bearer <anon-key>
```

```json
{
  "user_id": "uuid-here",
  "email": "user@example.com",
  "price_id": "price_1TJEo24w6vAdI2o57Rz8Cp3X",
  "success_url": "https://merciless.app/reading?upgraded=true",
  "cancel_url": "https://merciless.app/reading"
}
```

### Response (200)

```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_live_..."
}
```

### Behavior
- Checks for existing Stripe customer via `user_subscriptions` table
- Creates new Stripe customer if none exists
- Creates checkout session in `subscription` mode
- Stores `user_id` and `price_id` in session metadata (used by webhook)

---

## stripe-webhook

**Handle Stripe subscription lifecycle events.**

### Request

```
POST /functions/v1/stripe-webhook
Content-Type: application/json
Stripe-Signature: <stripe-signature-header>
```

Body: Raw Stripe event JSON

### Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Upsert `user_subscriptions` with `status=active`, store `stripe_customer_id`, `stripe_subscription_id` |
| `customer.subscription.updated` | Update `status`, `current_period_end`, `cancel_at_period_end` |
| `customer.subscription.deleted` | Set `status=canceled` |

### Response (200)

```json
{
  "received": true
}
```

### Webhook Signature Verification
- If `STRIPE_WEBHOOK_SECRET` is set and not `"PLACEHOLDER_SET_AFTER_VERCEL_DEPLOY"`, verifies signature
- If not set, accepts raw JSON body (development mode)

### Webhook Endpoint URL
```
https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook
```

---

## Error Responses

All functions return errors in this format:

```json
{
  "error": "Human-readable error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / webhook signature invalid |
| 403 | Subscription required (Oracle only) |
| 500 | Server error (check Supabase function logs) |

---

## CORS

All functions include these headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
```

OPTIONS requests return `200 OK` with CORS headers.
