# Merciless — Complete Setup Guide

This document contains everything needed to replicate the entire Merciless stack from scratch.

---

## Prerequisites

- Node.js 20+ (LTS)
- npm 9+
- Supabase CLI (`npm install -g supabase`)
- Vercel CLI (`npm install -g vercel`)
- Stripe CLI (optional, for local webhook testing)
- A Stripe account
- An Anthropic API key (Claude access)
- A domain (merciless.app or similar)

---

## 1. Repository Setup

```bash
git clone https://github.com/krishanraja/merciless.git
cd merciless
npm install
```

---

## 2. Supabase Setup

### 2.1 Create Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project Ref**, **URL**, **Anon Key**, and **Service Role Key** from Settings > API

### 2.2 Apply Database Schema

Run the migration SQL against your Supabase database:

```bash
supabase login --token <YOUR_SUPABASE_PAT>
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push
```

Or manually execute `supabase/migrations/20260406000000_initial_schema.sql` in the Supabase SQL Editor.

This creates 5 tables with RLS:

| Table | Purpose |
|-------|---------|
| `user_birth_data` | Birth date, time, location, lat/lng, timezone |
| `natal_charts` | Planets (JSONB), houses, aspects, sun/moon/rising signs |
| `daily_readings` | AI reading, headline, stoic actions, transits, intensity |
| `oracle_conversations` | Multi-turn Oracle message history |
| `user_subscriptions` | Stripe customer/subscription IDs, status |

### 2.3 Deploy Edge Functions

```bash
supabase functions deploy natal-chart --no-verify-jwt
supabase functions deploy daily-reading --no-verify-jwt
supabase functions deploy oracle --no-verify-jwt
supabase functions deploy create-checkout --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
```

### 2.4 Set Supabase Secrets

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref <PROJECT_REF>
supabase secrets set STRIPE_SECRET_KEY=rk_live_... --project-ref <PROJECT_REF>
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_live_... --project-ref <PROJECT_REF>
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref <PROJECT_REF>
```

> **Note:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in edge functions.

### 2.5 Auth Configuration

In Supabase Dashboard > Authentication > Settings:
- **Site URL:** `https://merciless.app` (or your domain)
- **Redirect URLs:** Add `https://merciless.app/*` and `http://localhost:5173/*`
- **Email Auth:** Enabled (default)
- **Email confirmations:** Enable for production, disable for development

---

## 3. Stripe Setup

### 3.1 Create Product and Price

In Stripe Dashboard or via API:

- **Product Name:** Merciless Pro
- **Price:** $4.99/month (recurring)
- Note the **Product ID** (`prod_...`) and **Price ID** (`price_...`)

### 3.2 Create Webhook Endpoint

1. Go to Stripe Dashboard > Developers > Webhooks > Add endpoint
2. **URL:** `https://<YOUR_SUPABASE_REF>.supabase.co/functions/v1/stripe-webhook`
3. **Events to listen for:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the **Signing Secret** (`whsec_...`)
5. Set it in Supabase:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref <PROJECT_REF>
   ```
6. Redeploy the webhook function:
   ```bash
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```

### 3.3 Stripe Keys

You need:
- **Publishable Key** (`pk_live_...`) — used in frontend
- **Secret/Restricted Key** (`rk_live_...` or `sk_live_...`) — used in edge functions
- **Webhook Signing Secret** (`whsec_...`) — used in stripe-webhook function

---

## 4. Environment Variables

### 4.1 Local Development

Create `.env.local` in the project root:

```bash
VITE_SUPABASE_URL=https://<YOUR_PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PRICE_ID=price_...
```

### 4.2 Vercel Environment Variables

Set these in Vercel Dashboard > Project Settings > Environment Variables (all environments):

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://<REF>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key |
| `VITE_STRIPE_PRICE_ID` | Your Stripe price ID |

---

## 5. Vercel Deployment

### 5.1 Link Project

```bash
vercel link
```

### 5.2 Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### 5.3 Domain Configuration

1. In Vercel Dashboard > Project > Settings > Domains
2. Add your domain (e.g., `merciless.app`)
3. Configure DNS:
   - If using Vercel nameservers: Point domain nameservers to Vercel
   - If using external DNS: Add the A record (`76.76.21.21`) and CNAME (`cname.vercel-dns.com`)
4. Wait for DNS propagation and SSL certificate provisioning

### 5.4 Vercel Configuration

The project uses `vercel.json` for SPA routing:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 6. Supabase Edge Function Secrets Summary

| Secret | Source | Used By |
|--------|--------|---------|
| `ANTHROPIC_API_KEY` | Anthropic Console | daily-reading, oracle |
| `STRIPE_SECRET_KEY` | Stripe Dashboard | create-checkout, stripe-webhook |
| `STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard | create-checkout |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Setup | stripe-webhook |
| `SUPABASE_URL` | Auto-provided | All functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided | All functions |

---

## 7. Testing Checklist

### Auth Flow
- [ ] Sign up with email/password
- [ ] Receive confirmation email (if enabled)
- [ ] Sign in successfully
- [ ] Redirect to `/onboarding` on first login (no chart)
- [ ] Redirect to `/reading` on subsequent logins

### Onboarding
- [ ] Enter birth date (required)
- [ ] Enter birth time (or check "unknown")
- [ ] Enter birth location (required)
- [ ] Optional lat/lng fields work
- [ ] Chart calculation succeeds
- [ ] Redirect to `/reading` after calculation

### Daily Reading
- [ ] Loading state shows while fetching/generating
- [ ] Auto-generates if no reading exists for today
- [ ] Headline displays for free users
- [ ] Full reading + actions + transits display for pro users
- [ ] Intensity badge shows correct color/label
- [ ] Share card generates and downloads PNG

### Stripe Subscription
- [ ] "Upgrade to Pro" button creates Stripe checkout session
- [ ] Redirects to Stripe Checkout
- [ ] After payment, webhook fires and updates `user_subscriptions`
- [ ] User sees pro content on return
- [ ] Subscription cancellation updates status

### Oracle (Pro only)
- [ ] Free users see upgrade gate
- [ ] Pro users see chat interface
- [ ] Example prompts populate input
- [ ] Messages send and Oracle responds
- [ ] Conversation history persists
- [ ] New conversation button resets chat

### Chart Viewer (Pro only)
- [ ] Free users see upgrade gate
- [ ] Pro users see Big Three, planets, aspects, houses
- [ ] Planet table renders all 12 bodies
- [ ] Aspects show with correct glyphs and colors

---

## 8. Useful Commands

```bash
# Local dev
npm run dev                  # Start dev server (localhost:5173)
npm run build                # TypeScript check + Vite build
npm run preview              # Preview production build

# Supabase
supabase login --token <PAT>
supabase link --project-ref <REF>
supabase functions deploy <name> --no-verify-jwt
supabase secrets set KEY=value --project-ref <REF>
supabase functions logs <name> --project-ref <REF>
supabase db push             # Apply migrations

# Vercel
vercel                       # Preview deploy
vercel --prod                # Production deploy
vercel env ls                # List env vars
```

---

## 9. Troubleshooting

| Issue | Fix |
|-------|-----|
| "Missing Supabase environment variables" in console | Check `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| Edge function returns 500 | Check `supabase functions logs <name>` for errors |
| "No natal chart found" on reading page | User needs to complete onboarding first |
| Stripe checkout doesn't redirect | Verify `STRIPE_SECRET_KEY` is set in Supabase secrets |
| Webhook not updating subscription | Verify `STRIPE_WEBHOOK_SECRET` is set and endpoint is correct |
| Oracle returns 403 | User doesn't have active subscription — check `user_subscriptions` table |
| Domain shows "DNS configuration error" | Verify A/CNAME records in Vercel Domains settings |
| Build fails on Vercel | Check that all `VITE_*` env vars are set in Vercel dashboard |
