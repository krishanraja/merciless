# Merciless, Complete Setup Guide

Reproduce the entire Merciless stack from scratch. Follow top-to-bottom.

---

## Prerequisites

- Node.js 20 LTS or newer
- npm 9+
- Supabase CLI (`npm install -g supabase`)
- Vercel CLI (`npm install -g vercel`)
- Stripe CLI (optional, for local webhook forwarding)
- Accounts:
  - Supabase (the Merciless app project)
  - Stripe (the `mindmaker_llc` account, live + test)
  - Google AI Studio (Gemini API key)
  - OpenAI (API key, used for fallback LLM, Whisper transcription, and GPT-4o-mini date parsing)
- Access to the Mindmaker OS warehouse Supabase project (`gojpffsrxybbpbdzzrvs`) and its `ATTRIBUTION_INGEST_SECRET`. The app only ever holds the secret, never the warehouse service-role key.
- A domain (e.g. `merciless.app`)

---

## 1. Repository

```bash
git clone https://github.com/krishanraja/merciless.git
cd merciless
npm install
```

---

## 2. Supabase (Merciless app project)

### 2.1 Create project

1. Create a new project at [supabase.com](https://supabase.com).
2. Capture from **Settings, API**:
   - Project Ref
   - Project URL
   - Anon (public) key
   - Service Role key
3. Capture from **Settings, Access Tokens**:
   - A Personal Access Token (PAT) for CLI use.

### 2.2 Apply migrations

Four migrations live in `supabase/migrations/`, applied in timestamp order:

| File | Purpose |
|---|---|
| `20260406000000_initial_schema.sql` | Five user-owned tables + RLS policies (user_birth_data, natal_charts, daily_readings, oracle_conversations, user_subscriptions) |
| `20260424120000_demo_rate_limit.sql` | Service-role-only `demo_rate_limit` and `demo_global_budget` tables + atomic `demo_rate_limit_bump` and `demo_global_budget_bump` RPCs |
| `20260530120000_phase2_entitlement_hardening.sql` | Entitlement fix: `user_subscriptions` becomes read-only to clients (RLS `FOR SELECT` only; writes are service-role / Stripe-webhook only). Also adds explicit `WITH CHECK` on the owner-writable tables, an `oracle_conversations(user_id)` index, `updated_at` triggers, and a generalized `api_global_budget` table + `api_global_budget_bump` RPC. Idempotent. |
| `20260530130000_stripe_idempotency.sql` | `stripe_processed_events` ledger (service-role only, no policies). The webhook inserts the Stripe event id before processing so replays, retries, and out-of-order deliveries never double-write subscriptions or double-emit warehouse events. |

Apply via CLI:

```bash
supabase login --token <YOUR_PAT>
supabase link --project-ref <PROJECT_REF>
supabase db push
```

…or paste each `.sql` file into Supabase Studio's SQL Editor in order.

> If neither CLI option is available (e.g., no local CLI), apply via the Supabase Management API following the pattern in `~/.claude/projects/.../memory/reference_supabase_management_api.md`.

### 2.3 Deploy edge functions

All app functions deploy with `--no-verify-jwt`. The auth-required functions (`natal-chart`, `daily-reading`, `oracle`, `create-checkout`) verify the JWT internally; the demo, transcribe, webhook, and track functions are intentionally anonymous (rate-limited at the DB layer or signature-verified). The `verify_jwt` flags in `supabase/config.toml` match this.

```bash
supabase functions deploy natal-chart      --no-verify-jwt --project-ref <PROJECT_REF>
supabase functions deploy daily-reading    --no-verify-jwt --project-ref <PROJECT_REF>
supabase functions deploy oracle           --no-verify-jwt --project-ref <PROJECT_REF>
supabase functions deploy create-checkout  --no-verify-jwt --project-ref <PROJECT_REF>
supabase functions deploy stripe-webhook   --no-verify-jwt --project-ref <PROJECT_REF>
supabase functions deploy demo-reading     --no-verify-jwt --project-ref <PROJECT_REF>
supabase functions deploy transcribe-date  --no-verify-jwt --project-ref <PROJECT_REF>
supabase functions deploy track            --no-verify-jwt --project-ref <PROJECT_REF>
```

| Function | `verify_jwt` | Notes |
|---|---|---|
| `natal-chart` | true | Real ephemeris via `_shared/ephemeris.ts`. |
| `daily-reading` | true | Transits via the shared ephemeris engine; brand-voice sanitized. |
| `oracle` | true | Brand-voice sanitized. |
| `create-checkout` | true | Stamps attribution onto the Stripe customer and subscription metadata. |
| `stripe-webhook` | false | Stripe signature verified instead. Idempotency ledger + warehouse purchased/refunded/churned emits. Only writer of `user_subscriptions`. |
| `demo-reading` | false | Date-only chart via the shared ephemeris engine; brand-voice sanitized. |
| `transcribe-date` | false | Capped: per-fingerprint hourly rate limit + global daily budget + 6MB audio size limit + 20s timeouts. |
| `track` | false | Public funnel-event sink. Forwards to the warehouse with the ingest secret attached. |

The shared modules in `supabase/functions/_shared/` bundle automatically with each function that imports them:

- `ephemeris.ts`, real tropical positions of date computed via astronomy-engine (JPL-grade). Sun through Pluto plus Moon accurate to the arc-minute; real Ascendant and Midheaven from sidereal time and obliquity; whole-sign houses (primary) plus equal houses; aspects with orbs and applying/separating; retrograde from real daily motion. The mean lunar node and Chiron are labelled approximate and are not part of the arc-minute guarantee. When birth time or place is unknown, angles and houses are omitted, never fabricated. Verified by `ephemeris.test.ts` (MC right ascension equals RAMC, Ascendant altitude is 0, precession-of-date applied).
- `brand-voice.ts`, `sanitizeVoice` removes em dashes by context (comma, colon, or period, never a semicolon splice) and `lintVoice` flags hedging, negative parallelism, and rule-of-three. Wired into `demo-reading`, `daily-reading`, and `oracle`. Hard rule everywhere: no em dashes.
- `attribution.ts`, `forwardEvent` posts an event to the warehouse front door with the `x-attribution-secret` header. Fire-and-forget: a warehouse hiccup never breaks a user flow or a Stripe webhook ack.
- `llm.ts` and `schemas.ts`, LLM fallback chain and response-schema validation.

### 2.4 Set Supabase secrets (app project)

```bash
supabase secrets set GEMINI_API_KEY=...                 --project-ref <PROJECT_REF>
supabase secrets set OPENAI_API_KEY=sk-...              --project-ref <PROJECT_REF>
supabase secrets set STRIPE_SECRET_KEY=rk_live_...      --project-ref <PROJECT_REF>
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_live_... --project-ref <PROJECT_REF>
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...    --project-ref <PROJECT_REF>
supabase secrets set STRIPE_PRICE_ID=price_...          --project-ref <PROJECT_REF>
supabase secrets set ATTRIBUTION_INGEST_SECRET=...      --project-ref <PROJECT_REF>
# Optional override; defaults to the warehouse ingest URL if unset.
supabase secrets set ATTRIBUTION_INGEST_URL=https://gojpffsrxybbpbdzzrvs.supabase.co/functions/v1/ingest-attribution --project-ref <PROJECT_REF>
```

| Secret | Used by |
|---|---|
| `GEMINI_API_KEY` | `daily-reading`, `oracle`, `demo-reading` (primary LLM) |
| `OPENAI_API_KEY` | Same (fallback LLM) + `transcribe-date` (Whisper + GPT-4o-mini) |
| `STRIPE_SECRET_KEY` | `create-checkout`, `stripe-webhook` |
| `STRIPE_PUBLISHABLE_KEY` | (optional, currently informational) |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` |
| `STRIPE_PRICE_ID` | `create-checkout` (falls back to a hardcoded value if absent) |
| `ATTRIBUTION_INGEST_SECRET` | `track`, `create-checkout`, `stripe-webhook` (the only warehouse credential the app holds). If unset, `forwardEvent` logs a warning and skips the emit; user flows are unaffected. |
| `ATTRIBUTION_INGEST_URL` | `_shared/attribution.ts` (optional). Defaults to `https://gojpffsrxybbpbdzzrvs.supabase.co/functions/v1/ingest-attribution`. |
| `SUPABASE_URL` | Auto-provided by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided by Supabase |

> If `GEMINI_API_KEY` is missing, the LLM helper goes straight to OpenAI. If both are missing, the function returns 503 with a helpful error.

### 2.5 Auth configuration

In **Authentication, URL Configuration**:

- **Site URL:** `https://merciless.app`
- **Redirect URLs:** add `https://merciless.app/auth/callback`, `https://merciless.app/*`, and `http://localhost:5173/*`.

In **Authentication, Providers, Email**:

- Enable **Email** provider.
- Enable **Confirm email** for production.
- Branded confirmation email template (Supabase Studio, Auth, Email Templates). The project uses a custom branded template that links to `{{ .ConfirmationURL }}` which lands at `/auth/callback`.

The frontend behavior is: confirmation email is sent only on signup (handled in `AuthModal.tsx` via `emailRedirectTo: ${origin}/auth/callback`); subsequent signins do not re-trigger confirmation. The first-touch attribution context (mcl_cid, UTM, agent, referrer, landing_path) survives the email-confirm wall via localStorage, a cookie, and `auth.user_metadata`, so signup is attributed even across the confirm bounce.

---

## 3. Stripe

The Stripe account is `mindmaker_llc`.

### 3.1 Product and price

In Stripe Dashboard or via CLI:

- **Product:** Merciless Pro (`prod_UHoQV8ymZNk4Um`)
- **Price:** $4.99 USD / month, recurring (`price_1TJEo24w6vAdI2o57Rz8Cp3X`)

> The Stripe Price object determines the displayed currency at checkout. Confirm USD. Customers seeing GBP indicates a wrong price ID.

### 3.2 Webhook endpoint

1. **Developers, Webhooks, Add endpoint**.
2. URL: `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`
3. Events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Capture signing secret (`whsec_...`), set as `STRIPE_WEBHOOK_SECRET` in Supabase.
5. Redeploy `stripe-webhook` after setting the secret:
   ```bash
   supabase functions deploy stripe-webhook --no-verify-jwt --project-ref <PROJECT_REF>
   ```

The webhook is the only writer of `user_subscriptions`. It reads attribution off the Stripe customer and subscription metadata (stamped at checkout) and emits purchased, refunded, and churned events to the warehouse, deduplicated by the `stripe_processed_events` ledger.

### 3.3 Stripe key types in use

| Key | Format | Where it lives |
|---|---|---|
| Publishable | `pk_live_...` | Vercel env (`VITE_STRIPE_PUBLISHABLE_KEY`) |
| Secret/Restricted | `rk_live_...` or `sk_live_...` | Supabase secret (`STRIPE_SECRET_KEY`) |
| Price ID | `price_...` | Vercel env + Supabase secret |
| Webhook secret | `whsec_...` | Supabase secret |

---

## 4. Mindmaker OS warehouse (attribution back end)

The attribution warehouse lives on a separate Supabase project, `gojpffsrxybbpbdzzrvs`, and is owned by the Mindmaker OS repo going forward. Merciless never touches the warehouse schema or its service-role key; it only POSTs events with the shared `ATTRIBUTION_INGEST_SECRET`.

Artifacts for the warehouse side ship under `_upgrade/merciless/warehouse/` for reference, but are applied from the OS repo:

- An `attribution` schema + the `public.ingest_attribution_event` RPC (idempotent insert).
- The `ingest-attribution` edge function, the single front door for attribution events from all Mindmaker apps. Guarded by the `x-attribution-secret` header.
- Read models for the fleet: `attribution.funnel_by_campaign` (Maya / CAC) and `attribution.revenue_by_campaign` (Leo / LTV).

Deploy on the warehouse project (run from the OS repo):

```bash
supabase functions deploy ingest-attribution --project-ref gojpffsrxybbpbdzzrvs --no-verify-jwt
supabase secrets set ATTRIBUTION_INGEST_SECRET=... --project-ref gojpffsrxybbpbdzzrvs
```

The same `ATTRIBUTION_INGEST_SECRET` value is set on both the warehouse project (to verify the header) and the Merciless app project (to send it).

### Attribution flow, at a glance

1. Client `lib/attribution.ts` mints a first-party `mcl_cid` and captures first-touch UTM, agent, referrer, and landing_path.
2. The client emits funnel events (`landed`, `demo_played`, `signed_up`, `chart_calculated`, `activated`, `paywall_hit`, and more) to the Merciless `track` function.
3. `track` rate-limits per fingerprint and forwards each event via `_shared/attribution.ts` to the warehouse `ingest-attribution` front door with the secret attached.
4. `create-checkout` stamps attribution onto the Stripe customer and subscription metadata; `stripe-webhook` emits money events (purchased, refunded, churned) directly to the warehouse.

---

## 5. Environment variables (client)

### 5.1 Local development

Create `.env.local`:

```bash
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PRICE_ID=price_1TJEo24w6vAdI2o57Rz8Cp3X
```

> The client throws a clear error at startup if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing, see `requireEnv` in `src/lib/supabase.ts`. The warehouse ingest secret is never exposed to the browser; the client only calls the `track` function, which holds the secret server-side.

### 5.2 Vercel project env vars

Set in **Project Settings, Environment Variables** for all environments (Preview + Production):

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<PROJECT_REF>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `VITE_STRIPE_PRICE_ID` | Stripe price ID (`price_1TJEo24w6vAdI2o57Rz8Cp3X`) |

---

## 6. Vercel

### 6.1 Link & deploy

```bash
vercel link
vercel              # preview
vercel --prod       # production
```

Or just `git push origin main`, Vercel auto-deploys on every push to `main`.

### 6.2 Configuration (`vercel.json`)

The repo's `vercel.json` is preconfigured:

- Framework: `vite`. Build: `npm run build`. Output: `dist`.
- `cleanUrls: true`, `trailingSlash: false`.
- `www.merciless.app` to `merciless.app` 301 redirect.
- Security headers: HSTS preload, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Long-cache immutable on `/assets/*` and `/signs/*`.
- SPA rewrite (excludes `/api/`, `/assets/`, `/signs/`, `sitemap.xml`, `robots.txt`).

The repo also serves two product-truth files the fleet sells from: `public/offer.json` (single machine-readable source of the offer) and `public/llms.txt` (the agent entry point).

### 6.3 Domain

1. **Settings, Domains**, add `merciless.app` and `www.merciless.app`.
2. Either point nameservers to Vercel, or add `A 76.76.21.21` for apex and `CNAME cname.vercel-dns.com` for `www`.
3. Wait for SSL provisioning.

---

## 7. Deploy sequence (full, in order)

Run this end-to-end on a clean deploy or after pulling changes.

1. **Apply migrations** on the app project:
   ```bash
   supabase link --project-ref <PROJECT_REF>
   supabase db push
   ```
2. **Set Supabase secrets** on the app project (section 2.4), including `ATTRIBUTION_INGEST_SECRET` (and optionally `ATTRIBUTION_INGEST_URL`).
3. **Deploy the warehouse front door** on `gojpffsrxybbpbdzzrvs` from the OS repo (section 4), and set the matching `ATTRIBUTION_INGEST_SECRET` there. Skip if already deployed and unchanged.
4. **Deploy edge functions** on the app project (section 2.3), including `track`.
5. **Configure Stripe** product, price, and webhook (section 3); redeploy `stripe-webhook` after setting `STRIPE_WEBHOOK_SECRET`.
6. **Set Vercel env vars** (section 5.2).
7. **Deploy Vercel** (`vercel --prod`, or push to `main`).

---

## 8. Secrets summary

App project edge-function secrets:

| Secret | Source | Used by |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio | `daily-reading`, `oracle`, `demo-reading` |
| `OPENAI_API_KEY` | OpenAI | Same (fallback) + `transcribe-date` |
| `STRIPE_SECRET_KEY` | Stripe (`mindmaker_llc`) | `create-checkout`, `stripe-webhook` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard | (informational) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook setup | `stripe-webhook` |
| `STRIPE_PRICE_ID` | Stripe Price | `create-checkout` |
| `ATTRIBUTION_INGEST_SECRET` | Mindmaker OS warehouse | `track`, `create-checkout`, `stripe-webhook` |
| `ATTRIBUTION_INGEST_URL` | (optional override) | `_shared/attribution.ts` |
| `SUPABASE_URL` | Auto-provided | All functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided | All functions |

Warehouse project (`gojpffsrxybbpbdzzrvs`) secret:

| Secret | Source | Used by |
|---|---|---|
| `ATTRIBUTION_INGEST_SECRET` | shared with the app | `ingest-attribution` (verifies the inbound header) |

Vercel client-side:

| Variable | Used by |
|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts` |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `src/lib/stripe.ts` |
| `VITE_STRIPE_PRICE_ID` | `src/lib/stripe.ts` |

---

## 9. Testing checklist

### Auth

- [ ] Sign up with email/password, confirmation email arrives with branded template.
- [ ] Confirmation link lands on `/auth/callback`, then redirects into the app.
- [ ] Subsequent sign-ins do not require email confirmation.
- [ ] User without a chart, redirected to `/onboarding`.
- [ ] Authenticated user on `/`, redirected to `/reading`.
- [ ] Unexpected session loss shows the "Your session expired" toast.

### Voice demo (landing)

- [ ] Microphone permission prompt appears on first record.
- [ ] Whisper transcription returns a transcript.
- [ ] GPT-4o-mini returns a parsed date.
- [ ] `demo-reading` returns `sun_sign`, `sun_degree`, `moon_sign` (null if the date crosses a sign boundary), `sharpest_aspect`, `brutal_headline`, and `excerpt`.
- [ ] Brutal headline appears within roughly 5 seconds.
- [ ] Re-recording past the per-fingerprint hourly cap returns 429.
- [ ] Manual date picker fallback works if mic is denied.

### Onboarding

- [ ] Voice date input transcribes and confirms.
- [ ] Native date picker fallback works.
- [ ] Birth time can be marked unknown; when unknown, angles and houses are omitted (never fabricated).
- [ ] Location autocomplete (Nominatim) returns city suggestions; selecting fills lat/lng.
- [ ] Chart calculation succeeds within 45 s timeout.
- [ ] Redirects to `/reading` on success.

### Daily reading

- [ ] Loading state while fetching/generating.
- [ ] Headline displays for free users; intensity badge shows correct color.
- [ ] Full reading + Stoic actions + transits display for Pro users.
- [ ] Share card downloads as PNG (9:16, 2x scale).
- [ ] No em dashes appear anywhere in generated content.
- [ ] Refreshing the page does not regenerate the reading (idempotent).

### Stripe & entitlement

- [ ] "Upgrade to Pro" creates a Stripe Checkout session.
- [ ] Checkout currency is **USD**.
- [ ] After payment, the webhook updates `user_subscriptions.status='active'`.
- [ ] A free user **cannot** self-grant Pro by writing `user_subscriptions` through the REST API (RLS is `FOR SELECT` only).
- [ ] Returning user sees Pro content unlocked.
- [ ] Cancelling subscription updates status; user keeps access until `current_period_end`.
- [ ] Replaying the same Stripe event does not double-write or double-emit (idempotency ledger).

### Oracle

- [ ] Free users see upgrade gate.
- [ ] Pro users see chat UI; example prompts populate the input.
- [ ] Messages send; Oracle responds within roughly 5 s.
- [ ] Conversation history persists across page reloads.
- [ ] Attempting to load another user's `conversation_id` returns nothing (ownership check).
- [ ] No em dashes in any Oracle response.

### Chart viewer

- [ ] Free users see upgrade gate.
- [ ] Pro users see Big Three, planets, aspects, houses.
- [ ] PlanetTable renders all 12 bodies (10 planets + North Node + Chiron). North Node and Chiron are labelled approximate.

### Attribution

- [ ] `landed` fires on first visit and a first-party `mcl_cid` is minted.
- [ ] First-touch UTM / agent / referrer / landing_path survive the email-confirm bounce (localStorage + cookie + user_metadata).
- [ ] `signed_up`, `chart_calculated`, `activated`, `paywall_hit` reach the warehouse via `track`.
- [ ] Stripe customer and subscription carry attribution metadata; `purchased` lands in the warehouse.
- [ ] With `ATTRIBUTION_INGEST_SECRET` unset, emits are skipped with a warning and no user flow breaks.

---

## 10. Useful commands

```bash
# Local
npm run dev                                # http://localhost:5173
npm run build                              # tsc + vite build
npm run preview                            # serve dist/

# Supabase (app project)
supabase login --token <PAT>
supabase link --project-ref <REF>
supabase db push
supabase functions deploy <name> --no-verify-jwt --project-ref <REF>
supabase secrets set KEY=value             --project-ref <REF>
supabase functions logs <name>             --project-ref <REF>

# Supabase (warehouse, from the OS repo)
supabase functions deploy ingest-attribution --no-verify-jwt --project-ref gojpffsrxybbpbdzzrvs
supabase secrets set ATTRIBUTION_INGEST_SECRET=... --project-ref gojpffsrxybbpbdzzrvs

# Vercel
vercel
vercel --prod
vercel env ls
vercel logs --follow
```

---

## 11. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `Missing required environment variable: VITE_SUPABASE_URL` at app start | `.env.local` (or Vercel env) is missing the var; add and rebuild. |
| Edge function returns 401 `Unauthorized` | The function expects a user JWT; calling with anon key only. Ensure caller is signed in (or use `supabase.functions.invoke` from a signed-in client). |
| Edge function returns 500 with empty body | Check `supabase functions logs <name>`. The frontend's `extractFunctionErrorMessage` will surface the real message in the UI. |
| `daily-reading` returns "No natal chart found" | User skipped onboarding. Send them to `/onboarding`. |
| Daily reading empty / says "The stars are speaking" | LLM JSON failed schema validation. Schema-validation fallback fired. Inspect `supabase functions logs daily-reading` for the offending content. |
| Oracle returns 403 | `user_subscriptions.status !== 'active'`. Confirm the webhook ran and set the status. |
| Stripe checkout shows GBP instead of USD | Wrong Price ID configured (the Price's currency drives display). Use `price_1TJEo24w6vAdI2o57Rz8Cp3X` and set both `VITE_STRIPE_PRICE_ID` and `STRIPE_PRICE_ID`. |
| Webhook never updates subscription | `STRIPE_WEBHOOK_SECRET` missing or wrong; or webhook URL pointing at the wrong Supabase project. Confirm both, then redeploy `stripe-webhook`. |
| Demo returns 429 immediately | Per-fingerprint hourly cap or daily global budget hit. Inspect `demo_rate_limit` / `demo_global_budget` (and `api_global_budget` for the generalized budget). |
| `transcribe-date` returns 429 or 413 | Per-fingerprint hourly rate limit, global daily budget, or the 6MB audio size limit hit. |
| Voice transcription returns 503 with quota message | OpenAI quota exhausted; UI falls back to date picker. Refill quota or rotate key. |
| Attribution events not landing in the warehouse | `ATTRIBUTION_INGEST_SECRET` missing or mismatched between the app and `gojpffsrxybbpbdzzrvs`, or `ingest-attribution` not deployed. Check `supabase functions logs track` for the skip/warning line. Emits are fire-and-forget, so this never breaks a user flow. |
| Build fails on Vercel with "Cannot find module" for `Database` types | `src/types/supabase.ts` missing. Regenerate via `supabase gen types typescript --project-id <REF> > src/types/supabase.ts`. |
| Domain shows DNS error | Verify A `76.76.21.21` and CNAME `cname.vercel-dns.com` records; wait for propagation. |

---

## 12. Operational notes

- **Cost control:** the demo and transcribe flows have hard caps at the DB layer (per-fingerprint rate limits, global daily budgets, and on transcribe a 6MB size limit and 20s timeouts). Monitor `demo_global_budget` and `api_global_budget` for the current UTC day to track LLM and transcription spend.
- **Entitlement:** `user_subscriptions` is read-only to clients; only the Stripe webhook (service role) writes status. Do not re-add an owner write policy on that table.
- **Brand voice:** every LLM-output path runs through `_shared/brand-voice.ts`. Hard rule: no em dashes anywhere. If you swap LLM providers, keep `sanitizeVoice` in the path.
- **Ephemeris accuracy:** positions are real and verified to the arc-minute (Sun through Pluto plus Moon). The mean lunar node and Chiron are approximate and labelled as such. Angles and houses are omitted when birth time or place is unknown. Do not reintroduce simplified mean-element math or a fabricated ascendant.
- **Trust:** no fabricated ratings or social-proof counts. The old JSON-LD `aggregateRating` and the "4,200+" claim were removed. Do not reintroduce any fabricated metric or rating anywhere.
- **Attribution ownership:** the warehouse `attribution` schema, `ingest_attribution_event` RPC, `ingest-attribution` function, and the `funnel_by_campaign` / `revenue_by_campaign` read models are owned by the Mindmaker OS repo going forward. Merciless holds only `ATTRIBUTION_INGEST_SECRET`.
- **Product truth:** `public/offer.json` is the single machine-readable source the fleet sells from, and `public/llms.txt` is the agent entry point. Keep both in sync with the live offer.
- **Schema changes:** add a new migration file (timestamp-prefixed) and run `supabase db push`. Regenerate `src/types/supabase.ts` afterwards.
- **Adding an LLM provider:** extend `_shared/llm.ts` with another `callX` function and add it to the fallback chain in `callLLM`. Provider order is cost-optimized, keep cheapest first.
- **Rotating keys:** rotating the Supabase service role or anon key requires updating Vercel env vars and redeploying. Supabase auto-injected secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) update automatically inside edge functions. Rotating `ATTRIBUTION_INGEST_SECRET` requires setting the new value on both the app project and `gojpffsrxybbpbdzzrvs`.
