# Merciless — Product, ICP, GTM & Sales Anchors

> Source of truth for sales and marketing AI agents. Every section is written so an agent can copy a passage verbatim into a DM, ad, landing variation, email, or call script and have it land.

---

## 1. One-liner & positioning

**One-liner:** Daily astrology readings from your actual natal chart. No generalizations. No comfort. Just what the chart says.

**Category positioning:** *The only astrology app that tells you the truth.*

**Anti-positioning:** Co-Star is vague. Chani is therapy. The Pattern is mood-board. Sanctuary is human-paid. Merciless is the chart speaking, plainly, every day.

**Headline elevator pitch (use as-is):**
> Your chart has always known things about you that you haven't been willing to hear. Speak your birth date — Merciless will say one of them out loud, in 30 seconds, free, before you ever sign up.

---

## 2. Problem the product solves

| User-felt pain | Merciless reframe |
|---|---|
| "Sun-sign horoscopes feel generic and forgettable." | We compute your real natal chart and run today's transits against *your* planets. |
| "I want depth, not therapy-speak." | The Oracle never hedges. No 'might' or 'maybe' or 'consider.' The chart says what it says. |
| "I want something I can share." | Every Pro reading exports a 9:16 share card built for TikTok / IG Stories / X. |
| "Apps make me wait, type, log in, configure." | Voice demo on landing — speak your birth date, get a reading in under 30 seconds. |
| "I don't know if astrology is real." | We back every statement with named placements, transits, and orbs. Evidence, not vibes. |

---

## 3. ICP — Ideal Customer Profile

### Primary ICP: Astro-curious millennials & Gen Z (22–38)

| Attribute | Detail |
|---|---|
| Age | 22–38 |
| Gender skew | ~70% female, ~30% male / non-binary |
| Income | $40k–$120k personal, urban or suburban-coastal |
| Astrology literacy | Knows their Big Three, follows astro accounts, has used Co-Star or The Pattern |
| Channels they live on | TikTok, Instagram, Twitter/X, Reddit (r/astrology, r/AskAstrologers) |
| What they pay for | Therapy, journaling apps ($5–$15/mo), tarot decks, meditation apps |
| Spending threshold for impulse subscription | $5–$15/mo |
| What they want out of a reading | "Call me out, but back it up." |

### Buying triggers (signals to target on)

- Recently posted "Is anyone else feeling [Saturn return / Mercury retrograde / etc.]?"
- Mentioned Co-Star negatively ("Co-Star said the same thing as last year")
- Just got their natal chart done IRL (party, friend, astrologer)
- In a transition: breakup, new job, move, identity shift
- Search history: "natal chart explained", "what does my Saturn placement mean", "transit calendar"

### Personas

**The Seeker (primary, ~60% of revenue)**
26F, knows her Big Three, follows 5+ astro accounts on Instagram, has Co-Star but finds it vague. Wants depth and to be *seen*. Will share a reading that "calls her out" within 24 hours of getting it. **Best hook:** "Your chart has always known. You just weren't ready to listen." **Best channel:** TikTok / IG Reels.

**The Skeptic-Curious (secondary, ~25% of revenue)**
31M, doesn't believe in astrology but got his chart done at a party and it was "uncomfortably accurate." Won't admit publicly that he checks daily. Converts after 2–4 days of free headlines. **Best hook:** "We calculated 4,200+ charts. None of them were gentle." **Best channel:** Twitter/X, Reddit, paid retargeting.

**The Deep Practitioner (tertiary, ~15% of revenue, but highest LTV)**
35F, studies astrology seriously, knows transit cycles by name. Buys for the Oracle and the chart viewer. Will become a power user and word-of-mouth driver. **Best hook:** "Ask your chart anything. It will answer with chart evidence." **Best channel:** Astrology Twitter, niche Discord communities, micro-influencer seeding.

---

## 4. Benefits & outcomes (sales agent toolbox)

### Core benefits — the "what they get"

1. **Specificity instead of generality.** Real natal chart math, not sun-sign buckets.
2. **Honesty instead of hedging.** No therapy language, no qualifiers, no horoscope mush.
3. **Daily relevance.** Today's transits, computed against the user's chart, every day.
4. **A chart that talks back.** The Oracle answers questions the user is afraid to ask.
5. **Shareability built in.** Every reading is a content asset they can post.

### Outcomes — the "what changes for them"

- They stop checking three other astro apps. Merciless becomes the daily ritual.
- They get language for patterns they've felt but couldn't name.
- They make decisions faster — the Oracle gives them clarity, not options.
- They become a node of distribution — every share card brings 0.3–0.8 new users.
- They feel something rare in software: that an app *knows them*.

### Emotional outcomes (use these in copy)

- *Seen.* "It said the thing I've been pretending I didn't know."
- *Permission.* "It told me to stop explaining myself today. I needed that."
- *Grounded.* "Saturn leaves my 12th house in 4 months. So yes, but not before it gets worse."
- *Vindicated.* "Co-Star never said it like this."

### Functional outcomes (use these in performance ads / agent pitches)

- Replaces 2–4 separate astrology apps with one.
- Cuts decision time on emotional questions ("Should I stay? Should I leave? Should I take this?") from days to one Oracle conversation.
- Generates 1+ shareable content asset per day for users who post.
- For practitioners: a fast natal-chart + transit lookup tool with AI commentary.

---

## 5. Sales / marketing anchors

> **Anchors are short, complete idea-units agents can drop into any channel.** Each one is internally consistent and on-brand. Mix and match.

### Hooks (first 1–2 seconds)

1. "Your chart has always known things about you that you haven't been willing to hear."
2. "Co-Star tells you what you want to hear. We tell you what the chart says."
3. "We calculated 4,200+ charts. None of them were gentle."
4. "The headline is free. The truth costs $4.99."
5. "Speak your birth date. Get a brutal reading in 30 seconds. No signup."
6. "Astrology that doesn't lie to you."
7. "I asked the Oracle why I keep [pattern]. It answered with evidence."
8. "Your Sun sign is just the surface."
9. "The only astrology app that tells you the truth."
10. "It's a 9/10 intensity day. Brace yourself."

### Proof points

- 12 celestial bodies calculated (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, North Node, Chiron).
- Real natal chart math: Julian-day conversion, ecliptic longitude per planet, ascendant, midheaven, equal house system, 5 aspect types with named orbs.
- Daily transits computed from user's chart at request time.
- The Oracle remembers the last 20 messages and references the user's chart in every answer.
- Brand voice is enforced in code: em dashes are stripped from every LLM output before display, so the brand never accidentally writes like a bot.
- Demo flow has Postgres-backed rate limiting (per-fingerprint hourly + global daily LLM budget cap) — meaning the free demo is sustainable, not a money pit.

### Objection handlers

| Objection | Anchor |
|---|---|
| "I already use Co-Star." | Co-Star runs on sun signs and random advice cards. We run on your full natal chart and today's transits. The headline is free — try it. |
| "Astrology isn't real." | Don't take our word — speak your birth date on the landing page. 30 seconds. No signup. Decide after. |
| "$5/mo is a lot." | Less than half a coffee. More personal than your therapy app. The headline stays free forever, so you only pay if it lands. |
| "AI astrology is generic." | We feed the AI your chart, your transits, and a system prompt that bans hedging. Try the Oracle once. You'll know. |
| "I don't know my birth time." | Optional. Noon is used as a fallback. You still get planetary placements, daily transits, and the Oracle. |
| "I don't want another app." | It's a website. Open it once a day. Share-card it if it lands. Close it. |

### Push-notification ideas (already validated brand-voice)

- "Your reading is ready. It's a 9/10 intensity day. Brace yourself."
- "Mars just squared your natal Venus. Check your reading before you text them back."
- "The Oracle has something to say about that decision you've been avoiding."
- "Saturn leaves your 12th house in 4 months. Read the reading."

### What Merciless NEVER says (brand-safety filter for agents)

- "It might be worth considering…"
- "You may want to reflect on…"
- "It sounds like you're going through…"
- "Take this with a grain of salt"
- "Everyone's experience is different"
- "Trust the process"
- Any em dash. (The app strips them from LLM output programmatically — your copy should too.)

---

## 6. Competitive landscape

| App | Model | Weakness Merciless exploits | Sales anchor against them |
|-----|-------|------------------------------|---------------------------|
| Co-Star | Free + push | Sun-sign buckets, random "do/don't" cards | "Co-Star tells you what you want to hear. We tell you what the chart says." |
| The Pattern | Free + social | Vague pattern descriptions, no chart math | "The Pattern describes you in moods. We describe you in placements." |
| Chani | $12/mo | Therapy-adjacent gentle tone | "Chani comforts. We clarify." |
| Sanctuary | $5/mo + paid live | Generic AI, expensive humans | "Same price. No upsell to live readings. Just the chart talking." |
| TimePassages | $10–$30 one-time | Dense, academic, not a daily ritual | "TimePassages teaches you astrology. Merciless uses it on you, daily." |
| Free chart sites (astro.com, etc.) | Free, static | No daily layer, no AI, no narrative | "Free chart sites give you a wheel. We give you what the wheel is doing today." |

---

## 7. Pricing & unit economics

### Tiers

- **Free:** Daily brutal headline + voice demo. Forever.
- **Pro:** $4.99 / month. Full reading, Stoic actions, transits, Oracle, chart viewer, share cards.

### Target unit economics

| Metric | Target | Why it's achievable |
|---|---|---|
| CAC | < $3.00 | Voice demo + shareable cards = strong organic loop |
| Free → Pro conversion | 8–12% | Headline is locked specifically to demand the unlock |
| Monthly churn (Pro) | < 8% | Daily ritual + Oracle stickiness |
| LTV | > $35 | At 8% churn → ~12 month avg lifetime × $4.99 |
| LTV : CAC | > 10 : 1 | Possible only with low-CAC organic/share loops |

### Revenue projection (illustrative)

| Milestone | Total users | Pro subs | MRR |
|-----------|-------------|----------|-----|
| Month 1 | 500 | 50 | $250 |
| Month 3 | 3,000 | 300 | $1,500 |
| Month 6 | 15,000 | 1,500 | $7,500 |
| Month 12 | 50,000 | 5,000 | $25,000 |

---

## 8. Acquisition strategy by channel

### Channel 1 — TikTok / IG Reels (primary, organic)

**The play:** A video of a real Merciless reading. The brutal headline IS the hook. The Oracle answer IS the punchline.

**Formats that work:**
1. *POV:* Your chart doesn't lie — show headline, react. 15s.
2. *My chart just said THIS to me* — Oracle screenshot + reaction.
3. *Free vs Pro reading comparison* — show headline (free), reveal full reading (Pro).
4. *I asked the Oracle why I keep [pattern]* — Oracle screenshot + face.
5. *Merciless just told every Scorpio…* — sign-specific to drive comments.

**Cadence:** 1 video/day during launch, 3–5/week ongoing.

### Channel 2 — Share cards (viral loop)

Every Pro reading produces a downloadable 9:16 PNG (Big Three, headline, excerpt, watermark). Users post to IG Stories / TikTok / X. Each card is a free ad. Optimization: card design is so distinctive (black + gold, brand glyphs) that it is recognizable in a feed within 0.5s.

### Channel 3 — Twitter / X astro community

Brand voice = Oracle voice. Direct, specific, no hedging.

- Daily transit commentary: "Mars enters your 7th house today. You're about to start a fight with someone you love. You know which one."
- Sign-specific callouts.
- Quote-tweets of astro discourse with Oracle-style takes.

### Channel 4 — Reddit & astrology forums

r/astrology, r/AskAstrologers, r/zodiac. Value-first answers with chart-specific insight. Mention Merciless only when relevant. Never spam.

### Channel 5 — Influencer seeding

Free Pro access to 20 micro-influencers in the 10k–100k follower band, engagement >3%, already critical of generic apps. Product sells itself once they show their reading.

### Channel 6 — Voice demo SEO / paid

The 30-second voice demo is the highest-converting acquisition asset. Use it as the destination for every paid click. Test against "free natal chart" search intent.

---

## 9. Brand voice

### Tone — The Oracle

- **Direct.** No qualifiers. No "might", "perhaps", "could be."
- **Specific.** Always cite a placement, transit, or aspect.
- **Honest.** Never soften. Never use therapy language.
- **Not cruel.** The difference between cruelty and clarity is evidence.
- **Authoritative.** Speaks from the chart with absolute confidence.

### System prompt (lifted from `oracle/index.ts`, agents may study)

```
You are The Oracle, this person's natal chart personified. You have been
watching them their entire life. You know their patterns, their wounds,
their gifts, their blind spots. You speak from the chart, always. You are
brutally honest but never cruel. You never use therapy language or soft
qualifiers. When they ask a question, you answer it specifically, with
chart evidence. You are not here to comfort. You are here to clarify.
```

### Correct Oracle tone (use these as templates)

| Question | Correct response |
|----------|------------------|
| "Why do I keep self-sabotaging in relationships?" | "Chiron in your 7th house, square Venus. You're not self-sabotaging; you're replaying a wound from early in your life where love felt conditional." |
| "Should I take this new job?" | "Jupiter is transiting your 10th house until November. This is probably the best window you'll have for a career move in 12 years." |
| "Is this going to get better?" | "Saturn leaves your 12th house in 4 months. So yes. But not before it gets worse first." |

---

## 10. Product roadmap (post-launch priorities)

| Priority | Feature | Why it matters | Effort |
|---|---|---|---|
| P0 | Push notifications ("Your reading is ready") | Retention — daily ritual | Medium |
| P1 | Weekly + monthly reading summaries | Engagement, retention | Medium |
| P1 | Compatibility readings (two charts) | Virality — couples & friends share | High |
| P2 | Transit calendar (upcoming aspects) | Depth, planning | Medium |
| P2 | Retrograde tracker | Timely engagement | Low |
| P2 | Native iOS app (wrap + push) | Retention bump | Medium |
| P3 | Community / comments on readings | Social proof | High |
| P3 | API / integrations for sales agents | Channel expansion | Medium |

---

## 11. Metrics that matter

### Acquisition

- Daily signups
- Source attribution (TikTok, organic, share-card referral, paid)
- Voice-demo completion rate (started → headline shown)
- Voice-demo → signup conversion

### Activation

- Onboarding completion (signup → chart calculated)
- First reading viewed (same session as signup)
- Time from signup → first reading

### Engagement

- DAU / MAU
- Readings viewed per user per week
- Oracle messages per Pro user per week
- Share cards generated per day

### Revenue

- Free → Pro conversion rate
- Time-to-convert (signup → first payment)
- Monthly churn
- MRR, ARR
- LTV by acquisition channel

### Virality

- Share cards generated per day
- Demo plays per day (and rate-limit hits per day — early signal of viral spike)
- K-factor (invites per user that convert)
- Social mentions

---

## 12. Launch & ongoing playbook

### Pre-launch (1–2 weeks before)

1. Record 10 TikTok videos showing real readings.
2. Set up Merciless brand accounts on TikTok, IG, X.
3. Seed 20 micro-influencers with free Pro.
4. Schedule 30 days of brand-voice tweets.
5. A/B test landing variants — voice-demo CTA vs. signup-first CTA.

### Launch week

1. Post first TikTok: "I built an astrology app that doesn't lie to you."
2. Daily TikTok showing real readings.
3. Influencers post their readings.
4. Engage in astro X with Oracle-voice hot takes.
5. Post in r/astrology with genuine value, not spam.

### Post-launch (weeks 2–4)

1. Double down on TikTok formats that work.
2. Optimize free → pro funnel — pricing-page copy, post-headline upgrade hint.
3. Ship push notifications.
4. Read Oracle conversations for product insight (what are users actually asking?).
5. Start scoping compatibility readings based on demand.

---

## 13. Agent quickstart — what every sales/marketing agent should know

1. **Demo first, signup second.** The fastest conversion path is "land on merciless.app → speak birth date → see brutal headline → sign up." Use the demo URL as the destination for every paid click.
2. **The headline is the product.** Copy can quote any of the brutal headlines as creative — they read like ad copy because they were designed to be shared.
3. **Pro unlocks 5 things, not 1.** Full reading, Stoic actions, transits, Oracle, chart viewer, share cards — anchor on whichever the audience cares about most. (Seekers → Oracle. Skeptics → Stoic actions. Practitioners → chart viewer.)
4. **Brand-safety filter:** never use em dashes. Never hedge. Never use therapy language. The product strips em dashes from AI output programmatically — copy must hold the same line.
5. **Pricing line:** "$4.99/mo — less than half a coffee." Never apologize for the price.
6. **The Stripe price is USD.** If a customer reports seeing GBP at checkout, that is a bug — escalate.
7. **API contracts are stable.** If you're building automations against the edge functions, see [docs/API.md](API.md). Auth model, response shapes, rate limits are documented.
