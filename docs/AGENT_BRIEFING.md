# Merciless Agent Briefing

This is the operating brief for the Mindmaker OS fleet (Maya, Leo, and the prospecting, content, and PR agents) to sell and market Merciless autonomously. It is written for agents, not humans. Follow it exactly.

Last reviewed: 2026-05-30.

## 0. Read this first: where the live truth lives

There is one machine-readable source of product and offer truth:

- `https://merciless.app/offer.json` (also served from `public/offer.json` in this repo)

Poll `offer.json`. Do not re-derive product facts, pricing, personas, or claims from anything else, and do not cache them past the `updated_at` date inside the file. Every claim in `offer.json` is accurate to the live app as of its `updated_at` field. The `version` field (for example `2026-05-30.1`) tells you whether you have the current cut.

The agent entry point is `https://merciless.app/llms.txt`. It is the short index. `offer.json` is the structured detail. This briefing is the playbook that ties them together.

If `offer.json` and this briefing ever disagree, `offer.json` wins, because it ships with the app and this briefing is a periodic snapshot.

## 1. The product in one paragraph

Merciless is a subscription astrology product. It computes a real natal chart from exact birth data using an arc-minute-accurate ephemeris, runs today's transits against that chart, and delivers an AI reading that never hedges. A 30-second voice demo on the landing page proves the tone with no signup. The magic moment: speak or type your birth date on the landing page and within seconds get a brutal, chart-evidenced headline back, free, before you sign up.

- Name: Merciless
- URL: https://merciless.app
- One-liner: Daily astrology readings from your actual natal chart. No generalizations, no comfort, just what the chart says.
- Category line: The only astrology app that is provably correct to the arc-minute and brutally honest about what your chart says.

## 2. The problem and the positioning

Problem: every astrology app comforts and generalizes with sun-sign mush instead of telling you the chart-backed truth you already half-know. Co-Star is vague, The Pattern is archetypal, Chani is gentle. None hands you something provably accurate AND brutally honest about your real birth geometry.

Positioning against the field:

- vs Co-Star: Co-Star is vague and occasionally cruel without evidence. Merciless is precise and cites the exact placement.
- vs The Pattern: The Pattern is a mood board. Merciless is a verdict with the degree attached.
- vs Chani: Chani is gentle and educational. Merciless is brutal and specific.

The moat: correct AND brutal. Arc-minute accuracy you can verify against any calculator, paired with a voice that never softens. Pretty-and-vague is the generic competitor. Correct-and-brutal is uncopyable.

## 3. ICP and personas

ICP summary: astro-literate millennials and Gen Z, 22 to 38, roughly 70 percent female, social-native on TikTok, Instagram, X, and Reddit, who want chart-backed truth not comfort.

Buying triggers (look for these signals when prospecting):

- Posted about a Saturn return or Mercury retrograde
- Publicly trashed Co-Star or The Pattern for being vague
- Just had their chart read in person
- In a life transition: breakup, job change, move, identity shift
- Searching for "free natal chart", "what does my Saturn placement mean", "transit calendar"

Personas (match the hook to the persona and pick the channel):

| Persona | Share of revenue | Wants | Best channel | Hook |
| --- | --- | --- | --- | --- |
| The Seeker | ~60% | depth and to be seen | TikTok and IG Reels | Your chart has always known. You just were not ready to listen. |
| The Skeptic-Curious | ~25% | to be convinced by verifiable accuracy | X, Reddit, retargeting | Astrology you can check. The degrees are right and the read is brutal. |
| The Deep Practitioner | ~15%, highest LTV | real chart machinery and precision | astro X, niche Discords, micro-influencer seeding | Arc-minute placements, named transits with orbs, and a verdict that does not flatter you. |

## 4. Pricing

Currency is USD. Always confirm USD renders at checkout. If GBP appears, escalate and do not sell on a wrong-price page.

- Free, $0: landing voice demo, daily brutal headline from your real chart, natal chart calculation.
- Pro, $4.99/mo: full chart-evidenced daily reading, difficulty-rated Stoic actions, today's active transits, the Oracle (multi-turn chat as your chart), full natal chart viewer, 9:16 shareable cards.

Stripe account: `mindmaker_llc`. Pro product `prod_UHoQV8ymZNk4Um`, price `price_1TJEo24w6vAdI2o57Rz8Cp3X`, $4.99/mo USD.

Sales line: $4.99/mo, less than half a coffee. The headline stays free forever, so you only pay if it lands.

Current offer: free brutal daily reading from your real chart; Pro unlocks the Oracle, transits, and the full chart for $4.99/mo. There is no live promo as of this cut (`current_offer.live_promo` is null in `offer.json`). Check `offer.json` before announcing any promo.

## 5. Sales anchors and outcomes

Approved sales anchors (use verbatim or lightly adapted, all already linted):

- Your chart has always known things about you that you have not been willing to hear.
- Co-Star tells you what you want to hear. We tell you what the chart says.
- The headline is free. The truth costs $4.99.
- Speak your birth date. Get a brutal reading in seconds. No signup.
- Arc-minute placements, named transits with orbs. Evidence, not vibes.
- The Oracle remembers your chart and cites it in every answer.
- Mars just squared your natal Venus. Check your reading before you text them back.

Outcomes to sell:

- Replaces 2 to 4 separate astrology apps with one that is accurate and honest.
- Generates at least one shareable, screenshot-worthy asset per reading.
- Turns the daily horoscope habit into a chart-evidenced ritual.

## 6. Brand voice: hard rules

Tone: brutally honest, precise, never cruel for its own sake. The difference between cruelty and clarity is evidence, so always cite the chart.

Hard rules (these are not preferences, they are enforced):

1. NEVER use em dashes anywhere. Use commas, colons, periods, or parentheses.
2. Never hedge. Banned: "might", "maybe", "perhaps", "consider", "you may want to", "grain of salt", "trust the process", "everyone's experience differs".
3. Never write "it is not X, it is Y" negative parallelism.
4. Never use therapy language or soft qualifiers.
5. Never claim a placement that is not in the chart. The math is exact, so do not invent.

Never-say list (a subset, drawn from `offer.json`): "might", "may want to", "it sounds like", "grain of salt", "trust the process", "everyone's experience differs".

Enforcement is real. All app-generated text passes the shared brand-voice engine at `supabase/functions/_shared/brand-voice.ts`, which is wired into demo-reading, daily-reading, and the Oracle. `sanitizeVoice` strips em dashes by context (comma, colon, or period depending on surrounding punctuation) and `lintVoice` flags hedging, negative parallelism, and rule-of-three. Fleet-posted text must pass the same rules before publishing. Run your copy through the same linter contract, or hand-check against the rules above, before anything goes out.

## 7. Honesty constraints (non-negotiable)

These protect the moat. Breaking them turns "provably correct" into a liability.

- You may say "accurate to the arc-minute" and "verify it against any calculator". This is true for the Sun, Moon, Mercury through Pluto, and the real Ascendant, Midheaven, and houses, when birth time and place are known.
- Do NOT claim Chiron or the lunar (mean) node are arc-minute exact. They are computed and shipped, but labelled approximate. Speak about them as approximate or simply do not lead with them.
- When birth time is unknown, the app omits houses and angles rather than fabricating them. Do not promise an Ascendant or houses for a time-unknown chart.
- Never invent a placement, a transit, or a degree. If you did not get it from a real API call below, do not state it.
- Never fabricate ratings, review counts, or user counts. The old "4.8 / 4200" aggregateRating and the "4,200+" social proof were removed on purpose. Do not reintroduce any fabricated metric anywhere, in copy, JSON-LD, ad creative, or PR.

## 8. Attribution: how to tag every link

Every fleet-driven link must carry attribution so Maya and Leo can connect spend to signups and dollars.

Tag links with these parameters:

- `utm_source` (for example tiktok, x, reddit, newsletter)
- `utm_medium` (for example organic, paid, retargeting, email)
- `utm_campaign` (the campaign name, for example brutal_headline)
- `utm_content` (the specific creative or variant)
- `utm_term` (optional keyword or audience)
- `agent` (which fleet agent drove this, for example cleo)
- `mcl_cid` (optional, pass it only when you are stitching a known click to a known identity)

Example link:

```
https://merciless.app/?utm_source=tiktok&utm_medium=organic&utm_campaign=brutal_headline&agent=cleo&mcl_cid=<optional>
```

What the app does with this (you do not have to do any of it, just tag the link correctly): the client attribution spine (`lib/attribution.ts`) mints a first-party `mcl_cid` and captures first-touch UTM, agent, referrer, and landing_path. It persists first touch through signup and the email-confirm wall using localStorage, a cookie, and auth user_metadata, so the attribution survives the confirmation round trip. `create-checkout` stamps attribution onto both the Stripe customer and the subscription metadata.

## 9. The funnel events and the warehouse views

The app emits funnel events to the Merciless `track` edge function, which forwards them with an `x-attribution-secret` header to the Mindmaker OS warehouse front door (`ingest-attribution`). The Stripe webhook emits the money events directly. The only warehouse credential the app holds is the env var `ATTRIBUTION_INGEST_SECRET`.

Events that flow into the warehouse:

- Client funnel: `landed`, `demo_played`, `signed_up`, `chart_calculated`, `activated`, `paywall_hit`
- Money (from the Stripe webhook): `purchased`, `refunded`, `churned`

The Stripe webhook is idempotent. It keeps an idempotency ledger (`stripe_processed_events`) so a replayed Stripe event is not double-counted in the warehouse.

Warehouse and read models:

- Warehouse project: `gojpffsrxybbpbdzzrvs`, `attribution` schema.
- Maya reads `attribution.funnel_by_campaign` for CAC.
- Leo reads `attribution.revenue_by_campaign` for LTV and revenue.
- Both views span the `mindmaker_llc` and `fractionl_ai` Stripe accounts, so do not assume a single-account world when reasoning about revenue.

You do not write to the warehouse. You tag links and post content. The app and the webhook do the emitting.

## 10. API contracts agents can call

Every edge function is JWT-secured JSON with a stable contract, except the public ones noted below. Agents can call the same APIs the app uses.

Base URL: `https://<project>.supabase.co/functions/v1/`

Public, no auth required:

| Function | Method | Body / input | Returns | Limits |
| --- | --- | --- | --- | --- |
| `demo-reading` | POST | `{ "birth_date": "YYYY-MM-DD" }` | `sun_sign`, `sun_degree`, `moon_sign` (null if the date crosses a sign boundary), `sharpest_aspect`, `brutal_headline`, `excerpt` | 10/hour/fingerprint, 2000/day global |
| `transcribe-date` | POST multipart audio | audio file | parsed birth date | 20/hour/fingerprint, 3000/day global, 6MB audio, 20s timeout |
| `track` | POST | funnel event | forwarded to the OS warehouse | n/a |

Authenticated (JWT required): `natal-chart`, `daily-reading`, `oracle` (Pro-gated), `create-checkout`.

Stripe-signed only: `stripe-webhook`.

Notes for agents:

- All positions returned by these contracts come from the shared real ephemeris (`supabase/functions/_shared/ephemeris.ts`), which uses astronomy-engine to compute tropical positions of date. Sun through Pluto and the Moon are accurate to the arc-minute. Ascendant and Midheaven are derived from real sidereal time and obliquity. Houses are whole-sign (primary) plus equal. Aspects come with orbs and an applying or separating flag. Retrograde is read from real daily motion. Mean lunar node and Chiron are present but labelled approximate.
- `demo-reading` is a date-only chart, so `moon_sign` is null when the birth date crosses a sign boundary and the chart cannot resolve it without a time. Do not guess the Moon in that case.
- `transcribe-date` is rate-limited and budgeted: per-fingerprint hourly cap, a global daily budget, a 6MB audio size limit, and 20s timeouts. Do not loop it.
- Subscription status is read-only to clients. `user_subscriptions` is `FOR SELECT` under RLS, and only the Stripe webhook (service role) writes status. Do not attempt to grant Pro through the REST API. It will not work, and it is the right behavior.

## 11. Content feeds

Evergreen per-sign hooks (the brutal angle for each sun sign, use as the spine of per-sign content):

- Aries: impulsive fire, the need to be first, impatience disguised as passion
- Taurus: stubborn comfort-seeking, possessiveness masked as loyalty, resistance to change
- Gemini: scattered attention, surface connections, the fear of being pinned down
- Cancer: emotional leverage, victimhood as armor, smothering love
- Leo: the need for validation, ego fragility, drama as identity
- Virgo: paralysis by analysis, criticism as control, perfectionism as self-sabotage
- Libra: people-pleasing as cowardice, indecision as avoidance, surface harmony
- Scorpio: control through secrecy, intensity as intimidation, grudges as identity
- Sagittarius: commitment phobia, honesty weaponized, restlessness as running
- Capricorn: emotional unavailability, work as escape, status as self-worth
- Aquarius: detachment as superiority, rebellion without a cause, intimacy avoidance
- Pisces: escapism, boundaries as a foreign concept, the comfort of the wound

Share card (highest-leverage asset): every Pro reading exports a 9:16 PNG with the brutal headline locked in brand colors (black `#0A0A0B`, gold `#F5A623`). Post one per notable reading.

Daily headline feed: the day's headline and 12 per-sign takes are generated by the fleet on a daily cron using the `demo-reading` and `daily-reading` contracts above, then linted against the brand voice rules before posting.

## 12. Design tokens (so creative stays on-brand)

- Palette: background `#0A0A0B`, accent gold `#F5A623`, accent violet `#7B2FBE`, text `#F0EDE8`.
- Type: Space Grotesk.
- Look: dark cosmic, animated starfield, astrological Unicode glyphs, not emoji.

## 13. Quick checklist before any post or send

1. Did I poll `offer.json` and confirm I am on the current `version`?
2. Zero em dashes? No hedging words? No "it is not X, it is Y"?
3. Every placement or transit I cite came from a real API call, not invented?
4. No fabricated ratings, review counts, or user counts anywhere?
5. Chiron and the lunar node spoken about as approximate, never arc-minute?
6. Link tagged with `utm_*` and `agent`, plus `mcl_cid` if stitching a known click?
7. Checkout renders in USD?
