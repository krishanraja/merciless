# Merciless — Complete Setup Guide

Reproduce the entire Merciless stack from scratch. Follow top-to-bottom.

---

## Prerequisites

- Node.js 20 LTS or newer
- npm 9+
- Supabase CLI (`npm install -g supabase`)
- Vercel CLI (`npm install -g vercel`)
- Stripe CLI (optional, for local webhook forwarding)
- Accounts:
  - Supabase
  - Stripe (live + test)
  - Google AI Studio (Gemini API key)
  - OpenAI (API key — used for fallback LLM, Whisper transcription, and GPT-4o-mini date parsing)
- A domain (e.g. `merciless.app`)

---

## 1. Repository

```bash
git clone https://github.com/krishanraja/merciless.git
cd merciless
npm install
```

---

## 2. Supabase

### 2.1 Create project

1. Create a new project at [supabase.com](https://supabase.com).
2. Capture from **Settings → API**:
   - Project Ref
   - Project URL
   - Anon (public) key
   - Service Role key
3. Capture from **Settings → Access Tokens**:
   - A Personal Access Token (PAT) for CLI use.

### 2.2 Apply migrations

Two migrations live in `supabase/migrations/`:

| File | Purpose |
|---|---|
| `20260406000000_initial_schema.sql` | Five user-owned tables + RLS policies (user_birth_data, natal_charts, daily_readings, oracle_conversations, user_subscriptions) |
| `20260424120000_demo_rate_limit.sql` | Service-role-only `demo_rate_limit` and `demo_global_budget` tables + atomic `demo_rate_limit_bump` and `demo_global_budget_bump` RPCs |

Apply via CLI:

```bash
supabase login --token <YOUR_PAT>
supabase link --project-ref <PROJECT_REF>
supabase db push
```

…or paste each `.sql` file into Supabase Studio's SQL Editor in order.

> If neither CLI option is available (e.g., no local CLI), apply via the Supabase Management API following the pattern in `~/.claude/projects/.../memory/reference_supabase_management_api.md`.

### 2.3 Deploy edge functions

All seven functions deploy with `--no-verify-jwt`. The auth-required functions verify the JWT internally; the demo/transcribe functions are intentionally anonymous (rate-limited at the DB layer).

```bash
supabase functions deploy natal-chart      --no-verify-jwt --project-ref <PROJECT_REF>
supabase functions deploy daily-reading    --no-verify-jwt --project-ref <PROJECT_REF>
supabase functions deploy oracle           --no-verify-jwt --project-ref <PROJECT_REF>
supabase functions deploy create-checkout  --no-verify-jwt --project-ref <PROJECT_REF>
supabase functions deploy stripe-webhook   --no-verify-jwt --project-ref <PROJECT_REF>
supabase functions deploy demo-reading     --no-verify-jwt --project-ref <PROJECT_REF>
supabase functions deploy transcribe-date  --no-verify-jwt --project-ref <PROJECT_REF>
```

The shared modules `supabase/functions/_shared/llm.ts` and `_shared/schemas.ts` are bundled automatically with each function that imports them.

### 2.4 Set Supabase secrets

```bash
supabase secrets set GEMINI_API_KEY=...        --project-ref <PROJECT_REF>
supabase secrets set OPENAI_API_KEY=sk-...     --project-ref <PROJECT_REF>
supabase secrets set STRIPE_SECRET_KEY=rk_live_...     --project-ref <PROJECT_REF>
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_live_... --project-ref <PROJECT_REF>
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...   --project-ref <PROJECT_REF>
supabase secrets set STRIPE_PRICE_ID=price_...         --project-ref <PROJECT_REF>
```

| Secret | Used by |
|---|---|
| `GEMINI_API_KEY` | `daily-reading`, `oracle`, `demo-reading` (primary LLM) |
| `OPENAI_API_KEY` | Same (fallback LLM) + `transcribe-date` (Whisper + GPT-4o-mini) |
| `STRIPE_SECRET_KEY` | `create-checkout`, `stripe-webhook` |
| `STRIPE_PUBLISHABLE_KEY` | (optional, currently informational) |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` |
| `STRIPE_PRICE_ID` | `create-checkout` (falls back to a hardcoded value if absent) |
| `SUPABASE_URL` | Auto-provided by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided by Supabase |

> If `GEMINI_API_KEY` is missing, the LLM helper goes straight to OpenAI. If both are missing, the function returns 503 with a helpful error.

### 2.5 Auth configuration

In **Authentication → URL Configuration**:

- **Site URL:** `https://merciless.app`
- **Redirect URLs:** add `https://merciless.app/auth/callback`, `https://merciless.app/*`, and `http://localhost:5173/*`.

In **Authentication → Providers → Email**:

- Enable **Email** provider.
- Enable **Confirm email** for production.
- Branded confirmation email template (Supabase Studio → Auth → Email Templates) — the project uses a custom branded template that links to `{{ .ConfirmationURL }}` which lands at `/auth/callback`.

The frontend behavior is: confirmation email is sent only on signup (handled in `AuthModal.tsx` via `emailRedirectTo: ${origin}/auth/callback`); subsequent signins do not re-trigger confirmation.

---

## 3. Stripe

### 3.1 Product and price

In Stripe Dashboard or via CLI:

- **Product:** Merciless Pro
- **Price:** $4.99 USD / month, recurring
- Capture **Product ID** (`prod_...`) and **Price ID** (`price_...`).

> The Stripe Price object determines the displayed currency at checkout. Confirm USD. Customers seeing GBP indicates a wrong price ID.

### 3.2 Webhook endpoint

1. **Developers → Webhooks → Add endpoint**.
2. URL: `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`
3. Events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Capture signing secret (`whsec_...`) → set as `STRIPE_WEBHOOK_SECRET` in Supabase.
5. Redeploy `stripe-webhook` after setting the secret:
   ```bash
   supabase functions deploy stripe-webhook --no-verify-jwt --project-ref <PROJECT_REF>
   ```

### 3.3 Stripe key types in use

| Key | Format | Where it lives |
|---|---|---|
| Publishable | `pk_live_...` | Vercel env (`VITE_STRIPE_PUBLISHABLE_KEY`) |
| Secret/Restricted | `rk_live_...` or `sk_live_...` | Supabase secret (`STRIPE_SECRET_KEY`) |
| Price ID | `price_...` | Vercel env + Supabase secret |
| Webhook secret | `whsec_...` | Supabase secret |

---

## 4. Environment variables

### 4.1 Local development

Create `.env.local`:

```bash
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PRICE_ID=price_...
```

> The client throws a clear error at startup if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing — see `requireEnv` in `src/lib/supabase.ts`.

### 4.2 Vercel project env vars

Set in **Project Settings → Environment Variables** for all environments (Preview + Production):

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<PROJECT_REF>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `VITE_STRIPE_PRICE_ID` | Stripe price ID |

---

## 5. Vercel

### 5.1 Link & deploy

```bash
vercel link
vercel              # preview
vercel --prod       # production
```

Or just `git push origin main` — Vercel auto-deploys on every push to `main`.

### 5.2 Configuration (`vercel.json`)

The repo's `vercel.json` is preconfigured:

- Framework: `vite`. Build: `npm run build`. Output: `dist`.
- `cleanUrls: true`, `trailingSlash: false`.
- `www.merciless.app` → `merciless.app` 301 redirect.
- Security headers: HSTS preload, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Long-cache immutable on `/assets/*` and `/signs/*`.
- SPA rewrite (excludes `/api/`, `/assets/`, `/signs/`, `sitemap.xml`, `robots.txt`).

### 5.3 Domain

1. **Settings → Domains** → add `merciless.app` and `www.merciless.app`.
2. Either point nameservers to Vercel, or add `A 76.76.21.21` for apex and `CNAME cname.vercel-dns.com` for `www`.
3. Wait for SSL provisioning.

---

## 6. Secrets summary

| Secret | Source | Used by |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio | `daily-reading`, `oracle`, `demo-reading` |
| `OPENAI_API_KEY` | OpenAI | Same (fallback) + `transcribe-date` |
| `STRIPE_SECRET_KEY` | Stripe Dashboard | `create-checkout`, `stripe-webhook` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard | (informational) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook setup | `stripe-webhook` |
| `STRIPE_PRICE_ID` | Stripe Price | `create-checkout` |
| `SUPABASE_URL` | Auto-provided | All functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided | All functions |

Vercel client-side:

| Variable | Used by |
|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts` |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `src/lib/stripe.ts` |
| `VITE_STRIPE_PRICE_ID` | `src/lib/stripe.ts` |

---

## 7. Testing checklist

### Auth

- [ ] Sign up with email/password → confirmation email arrives with branded template.
- [ ] Confirmation link lands on `/auth/callback`, then redirects into the app.
- [ ] Subsequent sign-ins do not require email confirmation.
- [ ] User without a chart → redirected to `/onboarding`.
- [ ] Authenticated user on `/` → redirected to `/reading`.
- [ ] Unexpected session loss shows the "Your session expired" toast.

### Voice demo (landing)

- [ ] Microphone permission prompt appears on first record.
- [ ] Whisper transcription returns a transcript.
- [ ] GPT-4o-mini returns a parsed date.
- [ ] Brutal headline appears within ~5 seconds.
- [ ] Re-running 11 times in an hour from the same fingerprint returns 429.
- [ ] Manual date picker fallback works if mic is denied.

### Onboarding

- [ ] Voice date input transcribes and confirms.
- [ ] Native date picker fallback works.
- [ ] Birth time can be marked unknown.
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

### Stripe

- [ ] "Upgrade to Pro" creates a Stripe Checkout session.
- [ ] Checkout currency is **USD**.
- [ ] After payment, webhook updates `user_subscriptions.status='active'`.
- [ ] Returning user sees Pro content unlocked.
- [ ] Cancelling subscription updates status; user keeps access until `current_period_end`.

### Oracle

- [ ] Free users see upgrade gate.
- [ ] Pro users see chat UI; example prompts populate the input.
- [ ] Messages send; Oracle responds within ~5 s.
- [ ] Conversation history persists across page reloads.
- [ ] Attempting to load another user's `conversation_id` returns nothing (ownership check).
- [ ] No em dashes in any Oracle response.

### Chart viewer

- [ ] Free users see upgrade gate.
- [ ] Pro users see Big Three, planets, aspects, houses.
- [ ] PlanetTable renders all 12 bodies (10 planets + North Node + Chiron).

---

## 8. Useful commands

```bash
# Local
npm run dev                                # http://localhost:5173
npm run build                              # tsc + vite build
npm run preview                            # serve dist/

# Supabase
supabase login --token <PAT>
supabase link --project-ref <REF>
supabase db push
supabase functions deploy <name> --no-verify-jwt --project-ref <REF>
supabase secrets set KEY=value             --project-ref <REF>
supabase functions logs <name>             --project-ref <REF>

# Vercel
vercel
vercel --prod
vercel env ls
vercel logs --follow
```

---

## 9. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `Missing required environment variable: VITE_SUPABASE_URL` at app start | `.env.local` (or Vercel env) is missing the var; add and rebuild. |
| Edge function returns 401 `Unauthorized` | The function expects a user JWT; calling with anon key only. Ensure caller is signed in (or use `supabase.functions.invoke` from a signed-in client). |
| Edge function returns 500 with empty body | Check `supabase functions logs <name>`. The frontend's `extractFunctionErrorMessage` will surface the real message in the UI. |
| `daily-reading` returns "No natal chart found" | User skipped onboarding. Send them to `/onboarding`. |
| Daily reading empty / says "The stars are speaking" | LLM JSON failed schema validation. Schema-validation fallback fired. Inspect `supabase functions logs daily-reading` for the offending content. |
| Oracle returns 403 | `user_subscriptions.status !== 'active'`. Confirm webhook ran and set the status. |
| Stripe checkout shows GBP instead of USD | Wrong Price ID configured (the Price's currency drives display). Create a USD Price and set `VITE_STRIPE_PRICE_ID` and `STRIPE_PRICE_ID`. |
| Webhook never updates subscription | `STRIPE_WEBHOOK_SECRET` missing or wrong; or webhook URL pointing at the wrong Supabase project. Confirm both, then redeploy `stripe-webhook`. |
| Demo returns 429 immediately | Per-fingerprint hourly cap (10) or daily global cap (2,000) hit. Inspect `demo_rate_limit` / `demo_global_budget`. |
| Voice transcription returns 503 with quota message | OpenAI quota exhausted; UI falls back to date picker. Refill quota or rotate key. |
| Build fails on Vercel with "Cannot find module" for `Database` types | `src/types/supabase.ts` missing. Regenerate via `supabase gen types typescript --project-id <REF> > src/types/supabase.ts`. |
| Domain shows DNS error | Verify A `76.76.21.21` and CNAME `cname.vercel-dns.com` records; wait for propagation. |

---

## 10. Operational notes

- **Cost control:** the demo flow has hard caps at the DB layer. Monitor `demo_global_budget` for the current UTC day to track LLM spend on free demos.
- **Brand voice:** every LLM-output path strips em dashes in code. If you swap LLM providers, keep the sanitization step intact.
- **Schema changes:** add a new migration file (timestamp-prefixed) and run `supabase db push`. Regenerate `src/types/supabase.ts` afterwards.
- **Adding an LLM provider:** extend `_shared/llm.ts` with another `callX` function and add it to the fallback chain in `callLLM`. Provider order is cost-optimized — keep cheapest first.
- **Rotating keys:** rotating the Supabase service role or anon key requires updating Vercel env vars and redeploying. Supabase auto-injected secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) update automatically inside edge functions.
