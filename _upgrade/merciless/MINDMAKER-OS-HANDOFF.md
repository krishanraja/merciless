# Merciless: Mindmaker OS Wiring Handoff

Date: 2026-05-30. For: a Mindmaker OS session that will verify the fleet/warehouse wiring and own the warehouse-side artifacts. A copy of this file was also placed at `C:\Users\krish\Downloads\app OS summaries\Merciless.md`.

Status: LIVE on `main` (commit `d2d3b2f`), Vercel production READY. Migrations applied and functions deployed to both the Merciless project and the OS warehouse. End-to-end smoke tests passed.

## 1. What Merciless emits to the OS warehouse
- Warehouse project `gojpffsrxybbpbdzzrvs`. New ADDITIVE schema `attribution` (events table + `public.ingest_attribution_event(jsonb)` RPC + views `funnel_by_campaign` for Maya/CAC and `revenue_by_campaign` for Leo/LTV).
- Front door: `ingest-attribution` edge function on the warehouse, guarded by `x-attribution-secret`.
- Shared secret on BOTH projects (`ATTRIBUTION_INGEST_SECRET`): `ec3e9797613fe04758c19e6f64f3d2ad8705866d6c2da1ed7a35cf9e0da24716`
- Ingest URL: `https://gojpffsrxybbpbdzzrvs.supabase.co/functions/v1/ingest-attribution`
- Events: landed, demo_played, demo_stalled, signed_up, chart_calculated, activated, paywall_hit, verdict_viewed, share_card_created (from the app via the `track` fn) and purchased, churned, refunded (from `stripe-webhook`, carrying amount + stripe_account=mindmaker_llc + stamped attribution). `mcl_cid` stitches landing to purchase.

## 2. OS session to-do
1. Own the warehouse artifacts: commit `_upgrade/merciless/warehouse/migrations/0001_attribution_schema.sql` and `_upgrade/merciless/warehouse/supabase/functions/ingest-attribution/index.ts` into the OS repo; OS repo is the sole future migrator of `attribution`.
2. Confirm Maya reads `attribution.funnel_by_campaign`, Leo reads `attribution.revenue_by_campaign`.
3. Point the fleet at the product truth: `https://merciless.app/offer.json`, `/llms.txt`, `docs/AGENT_BRIEFING.md`.
4. Tag every link with utm_source/medium/campaign/content/term + agent (example in offer.json).
5. Replicate the contract across the other five apps (same ingest front door, per-app secret).
6. Confirm the mindmaker_llc Stripe webhook endpoint points at the Merciless `stripe-webhook` fn and is subscribed to checkout.session.completed, customer.subscription.updated/deleted, charge.refunded. `STRIPE_WEBHOOK_SECRET` is already set on the project.

## 3. App changes (what the fleet is selling)
Real arc-minute ephemeris (verified), entitlement RLS fix (self-grant-Pro leak closed), transcribe-date cost cap, brand-voice engine, Gemini-thinking fix, removed fabricated metrics. Free + Pro $4.99/mo (mindmaker_llc, price_1TJEo24w6vAdI2o57Rz8Cp3X). Premium tier + Couple SKU are a data-validated proposal, not live.

## 4. Verification (run against production)
demo-reading returns real chart data + fresh em-dash-free headline; track -> ingest -> warehouse confirmed (test row inserted, verified, deleted); entitlement policy confirmed SELECT-only; Vercel d2d3b2f READY; offer.json + llms.txt serve 200.

## 5. Also LIVE (full approved Now-cut shipped)
Oracle SSE streaming (callLLMStream, live tokens, persist on close) and server-rendered Verdict pages: public_verdicts table; daily/demo mint a share slug; /v/{slug} = real crawlable HTML + per-reading OG; /og/{slug} = @vercel/og 1200x630 image; share cards deep-link to /v/{slug}. Verified live (/v 200 HTML server-rendered headline, /og 200 image/png ~100KB). New warehouse events: verdict_viewed, share_card_created.

## 6. Next + Later cycles ALSO shipped + verified live (through commit 63370ec)
(A/#9) Full-free reading: complete reading + actions + transits + share card free for all; Pro converts on AGENCY (Oracle, chart, forward path), NOT the reading text; viewport-lock removed. (B/#5) Synastry front door: synastry edge fn (real two-chart aspects + verdict) + SynastrySection (two dates, the other half teased behind signup) + /v/{slug} shares; event synastry_pair_minted. (C/#14) Programmatic SEO: /astrology/{sign} x12 + /compatibility/{a}-{b} x66 (canonicalized) edge pages + schema.org; sitemap 79 URLs. (D/#12) Writable offer genome: /functions/v1/offer (live merged offer) + /functions/v1/offer-admin (Maya write path, header x-fleet-secret = FLEET_ADMIN_SECRET = a9ede337dc8680e745803c0fd564483f1db4afc7deabca8a). (D/#11) persona tone by birth-time-known. (E/#19) zero-input cold opener. (E/#7 v1) chart whole-sign house bug fixed + real retrograde. (E/#18) premium tier = data-gated proposal, not live. New events: verdict_viewed, share_card_created, synastry_pair_minted.

## 6b. Flagship XL items ALSO shipped + browser-verified (Playwright)
(#7) interactive SVG natal chart wheel on /chart (real longitudes, whole-sign houses, aspect lines, ASC/MC, retrograde, tap-to-interpret). (#8) Oracle speaks first with the day's sharpest transit + voice via new public tts fn (OpenAI tts-1) + "hear it" button. (#15) time-scrub: transit-timeline fn (27 weekly frames) + cyan moving-sky overlay + date slider on the wheel. New public edge fns: tts, transit-timeline. Verified against a local dev preview (no prod mutation).

## 7. Remaining (needs Krish input / a credential / auto mode off)
- #10 onboarding rebuild: Google OAuth needs dashboard client config (auto mode off); magic-link needs email QA; funnel-risk, not shipped blind.
- #16 push/PWA: web-push VAPID + cron + real-device deliverability QA (founder flagged as ~native-app project).
- #20 weekly digest: needs RESEND_API_KEY (not in env dump).
- #17 consented outreach: founder-gated behind a tested consent rate (product decision).
- Authed-surface PROD visual QA (reading/chart/oracle as Pro): classifier blocked creating a Pro user in the live DB (auto mode off); verified via local dev preview instead.
- Oracle voice INPUT (mic) needs a real microphone; #18 premium Stripe price gated on attribution LTV data. Minor: recompute pre-rebuild charts; regenerate src/types/supabase.ts. See `_upgrade/merciless/PHASE-0.md`, `PHASE-1.md`.
