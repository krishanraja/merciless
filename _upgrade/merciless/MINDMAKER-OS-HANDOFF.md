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

## 6. Genuinely remaining (Merciless roadmap, minor)
Optional recompute of pre-rebuild charts; regenerate src/types/supabase.ts. Next cycle: synastry front door, Living Chart, Oracle proactive/voice, full-free reading, onboarding rebuild, writable offer.json. See `_upgrade/merciless/PHASE-0.md`, `PHASE-1.md`.
