# Merciless — PHASE 1: Product Lock + Unbounded 5X Vision + Commerce Contract

Status: COMPLETE (no code changed). Awaiting scope selection at the gate.
Date: 2026-05-30. Method: 10 surface + cross-cutting visionaries -> 2 adversarial critics (ambition + anti-generic/commercial) -> ranked synthesis. 13 agents, ~872k tokens.

Access verified live this session: Supabase token reaches all projects incl. warehouse `gojpffsrxybbpbdzzrvs` (so the OS-side ingest can be built via Management API, likely no separate warehouse service-role key needed) · GitHub PAT `repo` scope, push-capable · Vercel token reaches `merciless` (vite).

---

## 1. The one magic moment (restated at 5X)

A stranger taps a friend's share link from TikTok and lands not on a homepage but on the exact brutal verdict that hooked them, rendered server-side (no blank paint, no spinner). It pivots to address THEM: "This was hers. Yours is sharper." They speak one date and the real chart, computed by an arc-minute-accurate ephemeris, names an actual placement they did not think a free product could see, streaming token by token, with a one-tap receipt that shows the literal degree so a skeptic can verify it against any calculator. The shared link IS the product, it is provably correct, it is brutal, and every reshare mints another correct-and-cruel landing page the fleet can attribute to the post that earned it.

**Correct-and-brutal is the uncopyable thing. Pretty-and-vague is the generic-AI death we are escaping.**

## 2. Product lock

- **ICP:** astro-literate millennial/Gen Z, 22-38, ~70% female, social-native. Seeker (~60% rev, wants to be seen), Skeptic-Curious (~25%, converts on verifiable accuracy), Deep Practitioner (~15%, highest LTV, posts charts publicly, instantly catches fake math).
- **Painful problem:** every astrology app comforts and generalizes with sun-sign mush; none hands you something provably accurate AND brutally honest about your real birth geometry.
- **One-sentence pitch:** "Merciless is the only astrology product that is provably correct to the arc-minute and brutally honest about what your real chart says, delivered by one specific voice that already knows you and never flatters you."
- **Magic moment:** speak/type your birth date and, in under 8s with no signup and no paywall, watch the chart name a real second placement (not your sun sign), state the cliche everyone expects, cross it out live, and replace it with the brutal truth, with a one-tap receipt proving the degree.

---

## 3. Ranked initiatives (by leverage-per-effort)

| # | Initiative | Area | Leverage | Effort | Phase | Tier |
|---|---|---|---|---|---|---|
| 1 | Real ephemeris engine (VSOP87/Moshier WASM) verified to the arc-minute | AI spine / foundation | credibility | L | 2 | **Now** |
| 2 | Entitlement RLS fix: subscription writes service-role-only | commerce / security | revenue | S | 2 | **Now** |
| 3 | Attribution spine: unbroken `mcl_cid` first-touch -> refund + warehouse events | commerce | revenue | L | 3 | **Now** |
| 4 | Server-rendered Verdict pages `/v/{slug}` + dual @vercel/og + `?ref` (share = magic moment) | viral loop | virality | L | 3 | **Now** |
| 5 | Synastry / Relationship Verdict as the FRONT DOOR (two-sided invite, true K-factor) | growth | virality | L | 3 | Next |
| 6 | Streaming everywhere (SSE) + the wrong-then-corrected beat | AI spine | activation | M | 2 | **Now** |
| 7 | The Living Chart: accurate interactive wheel + tap-to-truth + arc-minute receipt | chart | credibility | XL | 4 | Next |
| 8 | Oracle as a present, proactive, voice-capable entity with verifiable memory | oracle | retention | XL | 4 | Next |
| 9 | Daily Reading full-free; convert on AGENCY not a truncated sentence | reading | revenue | L | 4 | Next |
| 10 | Onboarding: one utterance, wait-is-the-reveal wheel, deferred passwordless signup, honesty band | onboarding | activation | XL | 4 | Next |
| 11 | Personalization spine: chart-context object, prompt caching, persona inference, verifiable memory graph | AI spine | retention | XL | 2 | Next |
| 12 | Fleet-WRITABLE offer genome (`offer.json`) + brand-safety lint | commerce | revenue | M | 3 | Next |
| 13 | Brand-safety lint replacing the naive em-dash regex | AI spine / brand | credibility | S | 2 | **Now** |
| 14 | Transit calendar + retrograde surface + programmatic SEO pages | growth | retention | M | 3 | Later |
| 15 | Time-aware self-narrating chart (scrub the transiting sky) | chart | retention | XL | 4 | Later |
| 16 | Transit-timed retention loop: Daily Summons, perfection alerts, living streak, PWA-to-native | retention | retention | XL | 3 | Later |
| 17 | Consented transit-timed re-engagement (the chart reaching out) | commerce | activation | M | 3 | Later |
| 18 | Re-anchor pricing: premium Oracle tier above Free/Pro $4.99 | pricing | revenue | S | 3 | Later |
| 19 | Read-the-cold-visitor-with-zero-input opener | landing | activation | S | 4 | Later |
| 20 | Weekly/monthly digest + win-back resurrection surface | growth | retention | M | 3 | Later |

## 4. Recommended scope cut

**NOW (this rebuild cycle): #1 ephemeris · #2 RLS fix · #3 attribution spine · #4 server-rendered Verdict pages/viral loop · #6 streaming + wrong-then-corrected · #13 brand-safety lint.**
Logic: secure the entitlement, make the engine actually correct, make every surface attributable and shareable, and ship the felt-alive streaming layer. Five of these six need no expensive magic and four are ephemeris-free, so the fleet can measure and the loop can close THIS cycle. #4 is buildable today on the existing sun-sign demo while #1 is built in parallel.

**NEXT: #5 synastry front door · #7 Living Chart · #8 Oracle presence · #9 full-free reading + agency paywall · #10 onboarding rebuild · #11 personalization spine · #12 writable offer genome.** The visible "wow" magic, all gated behind #1 (real math) and #2 (trustworthy entitlement).

**LATER: #14-20** transit calendar/SEO, time-scrub chart, push/native retention, consented outreach, premium pricing re-anchor, zero-input opener, digests.

## 5. Autonomous fleet-commerce contract

- **Product-truth source:** a single versioned, signed, cache-busted `offer.json` on a Vercel edge route (etag + changed_at): positioning, 3 personas + best hook each, current price + live experiment arm, active offer, the brand-safety contract (never-say list + no-em-dash law) as lint rules, the day's brutal headline + 12 per-sign takes as a content payload. Fleet polls it stateless; change once, every agent sells the new thing on next poll. Bolder move (#12): make it WRITABLE by Maya inside Krish-set guardrails. Discipline: it stays one JSON, never a CMS.
- **Attribution:** mint `mcl_cid` on landing, persist across the SPA/SSG boundary AND the email-confirm gap (server cookie + localStorage + demo-fingerprint row — the fragile crux, tested not assumed), weld onto BOTH Stripe Customer and Subscription metadata at checkout (today only session carries `user_id`+`price_id`), read back in the webhook, emit every transition with `mcl_cid` + persona-guess + sign into warehouse `gojpffsrxybbpbdzzrvs` via the single `ingest-attribution` edge function.
- **Event read-back:** landed, demo_played, demo_stalled, signed_up, chart_calculated, activated, paywall_hit, purchased, refunded, churned, reactivated (edge) + share_card_created, verdict_viewed, date_spoken, synastry_pair_minted, recipient_unblurred (viral) + oracle_proactive_open, first_voice_message, engagement_minutes, memory_write (Oracle) + per-call AI provider/token/cost telemetry so Leo reports true COGS (not the fabricated 4.8/4200).
- **Content feeds:** agents pull the headline + 12 per-sign takes + per-persona hooks from `offer.json`; consume highest-engagement `/v/{slug}` and `/us/:pairId` pages as ready OG assets; repost the most brutal real readings (anonymized, brutality/shareability-classified, brand-safety-linted) and feed win-rate back. Auto-post gated by lint + classifier; human-in-loop fallback until the classifier is proven (one off-brand post on a 70%-female ICP costs more than the loop earns).
- **Lead signals:** deferred passwordless signup carries originating reading/pair id as intent; `demo_stalled` becomes a warm transit-timed lead ONLY via explicit opt-in, re-engaged as the chart's voice, one-tap-off, never a discount, post-consent-test only; synastry relationship-type is a high-intent consented profile signal.
- **Stripe account:** `mindmaker_llc`. Keep $4.99 USD Pro as the mid tier; attribution needs net-new Customer+Subscription metadata. Any premium tier / Couple SKU created here as new price objects (proposed).

## 6. Pricing proposal (validate before moving the anchor)

Keep a genuinely complete **free** brutal daily reading (free depth is the acquisition thesis). Keep $4.99/mo as a mid tier. Introduce a **premium ~$15-19/mo** for the voice Oracle relationship, persistent verifiable memory, the dated forward transit path, and unlimited synastry, plus a one-time **Couple unlock** SKU. Charge for AGENCY (forward path, the Oracle to argue with, the memory that holds you to your choices), not for the rest of a withheld sentence. The ICP already pays $15/mo for Chani/therapy apps; anchoring a voice entity that knows your whole chart at half-a-coffee caps LTV against the >10:1 target. Do not change the anchor until the attribution spine reports real cohort LTV.

## 7. Biggest risks
1. **False-locked ephemeris is the master risk.** The engine is theater; build + verify to arc-minute against astro.com before any chart-evidenced claim ships.
2. **Entitlement RLS leak inverts unit economics.** Fix to service-role-only writes before any expensive-surface investment.
3. **Mis-sequencing by phase label** — front-loading XL magic on fake data. The Now tier reorders to measure-and-secure first.
4. **COGS hand-waving** (voice-out, nightly prefetch, frontier Oracle). Build per-call COGS telemetry first; default prefetch to active streaks; memory text-only; voice behind a higher tier.
5. **Dark-pattern + creepiness on a sensitive ICP** — the cliffhanger paywall and unconsented outreach. Convert on agency; make any outreach opt-in, one-tap-off, the chart's voice.
6. **Attribution fragility at the confirm wall** — `mcl_cid` must survive the SSG boundary + email-confirm gap or every CAC/LTV number is wrong. Test explicitly.
7. **Generic-AI-magic risk** — token-typing/TTS are table stakes; the durable moats are arc-minute receipts, falsifiable Oracle wagers, tappable-provenance memory, two-sided synastry, the visible wrong-then-corrected beat.
8. **Memory hallucination is brand-fatal** — append-only, provenance-linked, high-confidence-gated writes; precision over recall.
9. **Pseudo-rectification is fake astrology** — delete the birth-time-from-life-events idea and the silent noon default; sell the honest uncertainty band.

## 8. Gate decisions (see chat) — scope+sequencing · monetization shape · synastry front door · fleet autonomy ceiling. Consented outreach (#17) defaults to Later behind a consent test unless cut.
