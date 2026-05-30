# Merciless — PHASE 0: Sync + Recon

Status: COMPLETE. No code changed (recon only). Gate decisions pending.
Date: 2026-05-30. Branch base: `main` @ `6a94d56` (clean, 44 commits).

---

## 1. SETUP verification

| Step | Result |
|---|---|
| Clone | `krishanraja/merciless` cloned to local root; remote/branch confirmed |
| Tree state | `main` clean, tracking `origin/main`, fast-forward current |
| Install | `npm install` clean (exit 0) |
| Typecheck | `tsc` clean |
| Lint | `eslint` clean (0 errors/warnings) |
| Build | `vite build` green in 883ms, 97 modules |
| Bundle note | `html2canvas` (200kB) already code-split into its own chunk; not in first load |

Hygiene flag: the GitHub PAT is embedded in `.git/config` (`origin` URL) from the clone. Cosmetic for read-only work; worth swapping to a credential helper before push.

No automated tests exist in the repo; the quality gate is `tsc + vite build` on Vercel push only.

---

## 2. Section 3 ground-truth row — CONFIRMED (with precision notes)

| Field | Verdict |
|---|---|
| Live = merciless.app | Correct (Vercel SPA, `www` 301 to apex) |
| What it is | Correct: brutally honest daily astrology from a computed natal chart |
| ICP | Correct: astro-curious millennial/Gen Z, 22-38, ~70% female, social-native |
| Magic moment | Correct experience, ONE precision: the landing voice demo returns a **sun-sign-grade** headline (month/day only, no chart math/transits). The fully chart-evidenced reading is the post-signup `/reading`. Docs are technically accurate ("sun-sign-grade") but marketing can over-promise. |
| Stack | Correct: Vite 8 + React 19 + TS + Tailwind v4 + RR7; backend is **Supabase Edge (Deno)**, not Vercel functions; Gemini 2.5 Flash primary + GPT-4o-mini fallback + Whisper |
| "Youngest app" | Consistent with 44 commits; not stated in docs |
| Share-card viral loop = GTM | Correct; note PRODUCT.md ranks TikTok/IG Reels organic as the primary channel, share cards as the compounding loop |
| Dark cosmic look | Correct: `#0A0A0B` black + `#F5A623` gold + `#7B2FBE` violet, animated starfield, Space Grotesk |

---

## 3. Product ground truth (source of truth for the fleet)

- **ICP:** astro-literate millennial/Gen Z (knows their Big Three, follows 5+ astro accounts, used Co-Star/The Pattern and finds them vague). Pays $5-15/mo for therapy/journaling/tarot. Core want: "Call me out, but back it up." Three personas: Seeker (26F, ~60% rev), Skeptic-Curious (31M, ~25%), Deep Practitioner (35F, ~15% rev / highest LTV).
- **The one painful problem:** existing astrology apps comfort and generalize instead of telling you the specific, chart-backed truth you already half-know.
- **One-sentence pitch:** "Daily astrology readings from your actual natal chart — no generalizations, no comfort, just what the chart says." Category line: "The only astrology app that tells you the truth."
- **The single magic moment:** speak your birth date on the landing page, get a brutal headline back in ~30s, free, no signup.
- **Pricing:** Free ($0: demo + daily headline + chart calc) / Pro ($4.99/mo: full reading, 3 Stoic actions, transits, Oracle, chart viewer, share cards). Stripe `prod_UHoQV8ymZNk4Um` / `price_1TJEo24w6vAdI2o57Rz8Cp3X` (MUST be USD).
- **Target unit economics:** CAC < $3, free→Pro 8-12%, churn < 8%/mo, LTV > $35, LTV:CAC > 10:1.

---

## 4. Architecture map

### 4.1 Data model + RLS
7 tables. 5 user-scoped (`user_birth_data`, `natal_charts`, `daily_readings`, `oracle_conversations`, `user_subscriptions`) + 2 service-only (`demo_rate_limit`, `demo_global_budget`, RLS-on / zero-policy = correct default-deny). Two atomic SECURITY DEFINER RPCs (`demo_rate_limit_bump`, `demo_global_budget_bump`), least-privilege, race-safe.

RLS findings (verified directly against the migration):
- **CRITICAL / revenue leak — `user_subscriptions` is client-writable.** Policy is `FOR ALL USING (auth.uid() = user_id)` with no column constraint. `authenticated` has table INSERT/UPDATE by Supabase default; RLS only checks ownership, not `status`. A free user can `INSERT`/`UPDATE` their own row to `status='active'` via the REST API and self-grant Pro. `isPro`, the paywall, and the server-side Oracle 403 gate all read this `status`. **Fix:** subscription writes must be service-role only (change the user policy to `FOR SELECT`).
- Missing `WITH CHECK` on the other four owner policies is NOT exploitable for cross-user forgery (Postgres falls back to `USING` as `WITH CHECK`). Still worth adding explicit `WITH CHECK (auth.uid() = user_id)` for clarity. App writes go through service role anyway.
- No cross-user SELECT leakage; all read predicates are correctly bound to `auth.uid()`.
- Missing index on `oracle_conversations(user_id)` (per-user list = seq scan).
- Migrations: `CREATE POLICY` statements are not idempotent (no `DROP ... IF EXISTS`); re-running the initial migration aborts. Type drift: `src/types/supabase.ts` omits the two demo tables + both RPCs and reports PostgrestVersion 14.5 while `config.toml` pins PG 17 → regenerate types.
- No `updated_at` trigger anywhere; `updated_at` is stale after updates unless set in app code.

### 4.2 AI pipelines
`_shared/llm.ts`: Gemini 2.5 Flash → GPT-4o-mini fallback, 30s timeout per call, 2 attempts/provider, 4xx excluded from retry (except 408/429) via message-regex. **No streaming anywhere.**

| Fn | Model | Auth | Stream | Rate limit | Top risk |
|---|---|---|---|---|---|
| natal-chart | none (math) | JWT | n/a | none | crude mean-element math; fabricated ascendant; lat default NYC but lng default 0 |
| daily-reading | Gemini→OpenAI, 1024 tok | JWT | no | per-user daily cache only; **no global cap** | schema-fail fallback dumps raw LLM output into `reading_text` |
| oracle | Gemini→OpenAI, 512 tok | JWT + Pro | no | **none** | unbounded Pro spend; conversation writes unchecked (silent loss) |
| demo-reading | Gemini→OpenAI, 256 tok | anon | no | 10/hr/fp + 2000/day global, fail-closed | fingerprint spoofable; `DemoReadingLLMSchema` defined but unused; can throw on undefined headline |
| transcribe-date | Whisper + GPT-4o-mini (direct, no shared llm) | **anon, no limit** | no | **none, no timeout, no size cap** | **worst hardening gap: unauthenticated, uncapped, two paid OpenAI calls/request = cost-DoS** |

Cross-cutting: no streaming; raw `error.message` leaked in 500s; `Authorization!` non-null assertion → 500 instead of clean 401; all functions run service-role (RLS bypassed), correctness depends on manual `.eq('user_id')` filters; CORS `*` everywhere.

### 4.3 Frontend journey + render
First-time path: Land `/` → hero CTA scrolls to demo → mic → `transcribe-date` → `demo-reading` → DemoResultCard typewriter (**magic moment, no signup**) → AuthModal (email+password only) → email-confirm round-trip → `/auth/callback` → `/reading` → redirect to `/onboarding` (3 steps) → `natal-chart` → `/reading` (free = headline + hard paywall).

- **Render: pure client-rendered SPA, blank first paint.** `index.html` ships empty `<div id="root">`; full-screen loader until `getSession()` resolves. Public routes: `/`, `/auth/callback`, `*`. Protected: onboarding/reading/oracle/chart/settings.
- States: TryMeSection, Reading, Oracle, Onboarding well-covered (loading/empty/error/success). Gaps: Chart has no error state; Settings no loading skeleton + no self-serve cancel / Stripe portal; AuthCallback can strand forever (no timeout/error path).
- Friction: hero "TRY THE ORACLE" only scrolls (feels like a no-op); email-confirm wall before any value; two magic moments split by an immediate paywall; no OAuth/magic-link/forgot-password; onboarding accepts a free-typed city with no resolved lat/lng (degrades chart silently).
- **No `prefers-reduced-motion` handling anywhere** (grep = 0). StarfieldBg rAF canvas (180 stars) runs on every route incl. app pages — battery + vestibular concern.
- Share flow: client `html2canvas` rasterize; share text/link is bare `merciless.app` (no per-reading deep link, no per-reading OG, no referral/attribution param); failures only `console.error`. The viral loop currently produces no crawlable/unfurlable per-share asset.

### 4.4 Commerce + attribution
- Checkout: `create-checkout` creates Stripe customer (metadata `{user_id}` only) + Checkout Session (metadata `{user_id, price_id}`). **`subscription_data.metadata` is never set → the Subscription object carries no metadata at all.**
- Webhook: `stripe-webhook` verifies signature (good), handles `checkout.session.completed` / `subscription.updated` / `subscription.deleted`, writes only `user_subscriptions`. **No event.id idempotency / dedup ledger.**
- **Attribution: NONE.** Verified by full-tree grep: no UTM/source/referrer capture on landing, nothing persisted through signup (`signUp` sends no `options.data`), nothing stamped to Stripe beyond `user_id`/`price_id`.
- **Event emission: NONE.** No analytics SDK, no event bus, no warehouse path. Zero funnel instrumentation.
- Stripe account: inferred `mindmaker_llc` (ACCESS block: dedicated `rk_live` key for Merciless). No `acct_`/`prod_` literals in code.

### 4.5 Public surface + SEO
- `index.html`: complete static OG/Twitter/JSON-LD. **`og:url`/`canonical` hardcoded to `/` on every route = self-canonicalization bug** if deep links ever crawl.
- **No prerender / SSR / SSG.** `vercel.json` rewrites all non-asset routes to `index.html`. Fleet-driven deep links render blank on first paint; all social unfurlers see the single root OG card regardless of destination. This directly undercuts the share-card GTM.
- **Fabricated trust signal:** JSON-LD `aggregateRating` 4.8 / 4,200 ratings (index.html L67-71) for a pre-launch product → Google structured-data policy violation + FTC risk. Same "4,200+ charts" social proof hardcoded in 4 places.
- sitemap.xml = 1 URL. robots.txt blocks authed routes (sensible). No per-sign / per-transit pages exist (Section 5g opportunity, blocked on the prerender gap).

---

## 5. Top findings, ranked by leverage

1. **[CRITICAL, revenue] Self-grant Pro via RLS.** Free users can flip their own `user_subscriptions.status` to `active`. Fix = service-role-only writes.
2. **[HIGH, cost] `transcribe-date` is an unauthenticated, uncapped, no-timeout endpoint hitting two paid OpenAI APIs.** Cost-DoS vector. Add auth/fingerprint + budget cap + timeout + size limit.
3. **[HIGH, GTM] Blank-first-paint SPA + single static OG.** Every fleet/share link renders blank and unfurls the generic root card. The viral loop has no crawlable per-share asset. (Drives the 5a recommendation.)
4. **[HIGH, GTM] Zero attribution + zero event emission.** No way for Maya/Leo to attribute a signup or dollar. (Drives the 5c/5d build.)
5. **[MED, trust/legal] Fabricated 4.8/4,200 rating + hardcoded social proof.** Remove or back with real data.
6. **[MED, credibility] Natal engine is a simplified mean-element model, not Swiss Ephemeris**, while the product sells "real chart math / evidence not vibes." Over-claim risk for the highest-LTV persona; ephemeris swap is the headline accuracy 5X seed.
7. **[MED, reliability] No streaming; raw errors leaked; no `prefers-reduced-motion`; AuthCallback can strand; no self-serve cancel.**
8. **[LOW] Webhook idempotency, type-drift regeneration, oracle index, idempotent migrations.**

---

## 6. SPA rendering recommendation (5a)

**Recommend: stay Vite (no Next.js migration). Add build-time prerender/SSG for the public + programmatic-SEO routes, PLUS a Vercel edge `@vercel/og` function for per-share / per-reading deep links. Keep the authed app a pure SPA.**

Concretely:
- Prerender `/` (landing) and the future `/astrology/<sign>` + `/transit/<event>` programmatic pages to real HTML at build (Vike / vite-react-ssg, or a puppeteer prerender step). Real content in the initial response → fleet links convert + Google indexes.
- Add a public per-reading deep-link route (e.g. `/r/:shareId`) served by a Vercel edge function that emits route-specific `<head>` (title/description/og:image) and a dynamically generated 9:16 / 1200x630 OG image. This makes every shared card unfurl correctly, gives the viral loop an indexable landing target, and lets us drop client `html2canvas` for instant, font-consistent, crawlable cards.
- Fix the hardcoded-root canonical/`og:url` so each public route self-canonicalizes.

Tradeoff: this is more moving parts than a single prerender pass, but it is the minimum that makes the share-card GTM actually work, and it avoids the Section-10-discouraged Next.js migration. Gutted (Next.js) stays the quality reference, not the target.

---

## 7. Warehouse read-back recommendation (5d)

**Recommend: agree with the central Mindmaker OS warehouse (`gojpffsrxybbpbdzzrvs`) + single front door, exactly as Section 5d specifies.** Merciless holds ONLY `ATTRIBUTION_INGEST_SECRET`, never the warehouse service-role key, and POSTs to the OS `ingest-attribution` function.

Merciless emit plan:
- Capture first-touch UTM + referrer + landing_path on landing → localStorage (survives the email-confirm round-trip) + auth `user_metadata` at `signUp`.
- Stamp attribution onto Stripe `customer.metadata` AND `subscription_data.metadata` at checkout (today neither carries UTM; the subscription carries no metadata at all — gap to fix).
- Emit `landed` / `signed_up` / `activated` from the app; `purchased` / `refunded` / `churned` from `stripe-webhook` (after adding idempotency).
- `app = merciless`, `stripe_account = mindmaker_llc`.

Blockers (see Section 8): the ingest function + `attribution` schema are OS-repo-owned and not yet built; warehouse creds + ingest secret + the Merciless Stripe webhook secret are all unset.

---

## 8. Open blockers (must resolve before 5c/5d can close)

1. `MERCILESS_STRIPE_WEBHOOK_SECRET` is empty in the ACCESS block. The webhook function exists in code but no verified endpoint/secret → purchase/refund events cannot flow. Set up early.
2. Warehouse service-role key + DB URL for `gojpffsrxybbpbdzzrvs` are not in the dump; `ingest-attribution` + `ATTRIBUTION_INGEST_SECRET` do not exist yet. Per Section 5d the warehouse is migrated ONLY from the OS repo — which is not cloned this session.
3. Stripe restricted key (`rk_live`) must actually carry checkout + customer + subscription scopes or `create-checkout` silently 500s.

---

## 9. Defaults I am taking unless you object
- `stripe_account = mindmaker_llc` for Merciless attribution.
- Phase 1 will generate the UNBOUNDED 5X vision across all six surfaces first, then we cut scope together at that gate (per Section 1).
- I will NOT migrate to Next.js.

---

## 10. Gate questions — see chat (batched via AskUserQuestion)
SPA approach · security fast-track · warehouse build scope/OS-repo access · ephemeris accuracy scope · fabricated-rating removal.
