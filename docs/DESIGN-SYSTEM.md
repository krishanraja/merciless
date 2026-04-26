# Merciless — Design System

The visual system is engineered to support the brand's tonal claim: *direct, evidenced, unflinching.* Black + gold + violet, a single sans family, sharp typographic rhythm, generous tracking on labels.

---

## Brand assets

`public/` ships three icon variants and three logo variants:

| Asset | Use |
|---|---|
| `merciless orange icon.png` | Primary in-app icon (top nav, loading, mobile bar) |
| `merciless orange logo.png` | Hero / landing wordmark |
| `merciless black icon.png` | Light surfaces / press kit |
| `merciless black logo.png` | Light surfaces / press kit |
| `merciless white icon.png` | Dark surfaces with high contrast need |
| `merciless white logo.png` | Dark surfaces with high contrast need |

Plus full favicon set (`favicon.svg`, 16/32/192/512 PNGs, `apple-touch-icon`, `site.webmanifest`) and `og-image.png` for social cards.

Zodiac sign images live in `public/signs/` as `.webp` (12 files, cached `max-age=31536000, immutable`). Generated via `scripts/optimize-signs.mjs` (sharp).

---

## Color palette

| Token | Hex | Use |
|-------|-----|-----|
| `merciless-black` | `#0A0A0B` | Page background |
| `merciless-card` | `#111115` | Card background |
| `merciless-border` | `#1E1E24` | Borders, dividers |
| `merciless-gold` | `#F5A623` | Primary accent — headlines, CTAs, active nav |
| `merciless-gold-muted` | `#C4831A` | Gold gradient endpoint |
| `merciless-violet` | `#7B2FBE` | Secondary accent — Oracle, Pro features |
| `merciless-violet-light` | `#9D4EDD` | Violet hover/light variant |
| `merciless-white` | `#F0EDE8` | Warm body text |
| `merciless-muted` | `#6B6B7A` | Secondary text, labels |
| `merciless-danger` | `#E53E3E` | Error states, hard difficulty |

### Element colors (astrology)

| Element | Hex |
|---|---|
| Fire | `#E53E3E` |
| Earth | `#68D391` |
| Air | `#63B3ED` |
| Water | `#76E4F7` |

### Planet colors

| Planet | Hex |
|---|---|
| Sun | `#F5A623` (gold) |
| Moon | `#C0C0C0` (silver) |
| Mercury | `#9D4EDD` (violet) |
| Venus | `#E91E8C` (pink) |
| Mars | `#E53E3E` (red) |
| Jupiter | `#3B82F6` (blue) |
| Saturn | `#6B6B7A` (gray) |
| Uranus | `#00BCD4` (cyan) |
| Neptune | `#4FC3F7` (light blue) |
| Pluto | `#7B2FBE` (deep violet) |

### Aspect colors

| Aspect | Hex |
|---|---|
| Conjunction | `#F5A623` (gold) |
| Sextile | `#3B82F6` (blue) |
| Square | `#E53E3E` (red) |
| Trine | `#22C55E` (green) |
| Opposition | `#FF4444` (red) |
| Quincunx | `#9D4EDD` (violet) |

---

## Typography

**Font family:** Space Grotesk (Google Fonts).

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
```

Tailwind: `font-space: ['"Space Grotesk"', 'sans-serif']`.

### Type scale

| Element | Size | Weight | Tracking | Example |
|---|---|---|---|---|
| Hero headline | `text-2xl md:text-3xl lg:text-4xl` | bold | snug leading | Landing hero |
| Section headline | `text-xl md:text-2xl` | bold | — | "Ready for the full truth?" |
| Reading headline | `text-2xl md:text-3xl` | bold | — | Brutal headline on `/reading` |
| Card title | `text-xl` | bold | — | Upgrade card |
| Body text | `text-sm md:text-base` | normal | — | Reading text |
| Pill / label | `text-[10px] md:text-xs` | medium | `tracking-[0.2em]` to `[0.3em]` | "NATAL CHART · DAILY TRANSITS · THE ORACLE" |
| Mobile tab label | `text-[9px]` | medium | `tracking-wider` | Bottom tab bar |
| Brand mark | `text-lg` | bold | `tracking-[0.2em]` | "MERCILESS" wordmark |

### Voice rules baked into UI copy

- No em dashes anywhere — UI strings, prompts, and LLM output. The product enforces this in code (`sanitizeEmDashes` strips `—` from every LLM response before display).
- Use semicolons, periods, or colons in place of em dashes.
- Labels are uppercase + tracked.
- Body copy avoids hedging language ("might", "perhaps", "consider").

---

## Components

### Card (`.merciless-card`)

```css
background-color: #111115;
border: 1px solid #1E1E24;
border-radius: 12px;
```

Padding: `p-6` standard, `p-8` for emphasis cards.

### Glow effects

Gold (`.gold-glow`) — primary reading card:

```css
box-shadow: 0 0 20px rgba(245,166,35,0.30), 0 0 40px rgba(245,166,35,0.10);
```

Violet (`.violet-glow`) — Oracle CTA:

```css
box-shadow: 0 0 20px rgba(123,47,190,0.40), 0 0 40px rgba(123,47,190,0.15);
```

Pulse-gold animation (`.animate-pulse-gold`) loops the gold glow on the primary CTA.

### Buttons

Primary (gold, dark text):

```html
<button class="px-8 py-3.5 bg-merciless-gold text-merciless-black font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-gold/90 transition-all">
  TRY THE ORACLE
</button>
```

Violet (Oracle CTA):

```html
<button class="py-4 bg-merciless-violet text-white font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-violet-light">
  UNLOCK THE ORACLE
</button>
```

Secondary (muted outline):

```html
<button class="py-3 border border-merciless-border text-merciless-muted text-sm rounded-lg hover:border-merciless-gold/40 hover:text-merciless-white transition-colors">
  Try again
</button>
```

### Inputs

```html
<input class="w-full bg-merciless-black border border-merciless-border rounded-lg px-4 py-3 text-merciless-white placeholder-merciless-muted text-sm" />
```

Focus state: gold border + gold box-shadow (defined globally in `index.css`).

### Sign badge (`SignBadge.tsx`)

Renders a zodiac glyph + sign image (`/signs/<sign>.webp`). Variants: `default`, `minimal`. Sizes: `sm`, `md`. Used on `/reading`, `/chart`, share cards. Falls back to glyph-only if asset missing (defensive null/undefined handling for sign values).

### Demo result card (`DemoResultCard.tsx`)

Shown after the landing voice demo. Same visual language as the in-app reading card so users recognize the product they just saw on signup.

### Share card (`ShareCard.tsx`)

9:16 PNG via html2canvas at 2x scale. See [Share card spec](#share-card) below.

### Stoic action card

```
┌──────────────────────────────────────┐
│ HARD TRUTH                           │  difficulty label, color-coded
│                                      │
│ Write the unsent message.            │  action, white, bold
│                                      │
│ Mercury-Saturn transit demands       │  why, muted, smaller
│ honest communication.                │
└──────────────────────────────────────┘
```

---

## Navigation

### Desktop (≥md)

Top bar with brand mark left, horizontal links right (`Reading`, `Chart`, `Oracle`, `Settings`). Active link is `text-merciless-gold`, inactive is `text-merciless-muted` with gold hover. Tracking: `widest`.

### Mobile

Two bars:

1. Top — minimal, brand icon centered.
2. Bottom — fixed tab bar (`AppNav.tsx`):
   - 4 tabs: Reading (☉), Chart (◎), Oracle (☽), Settings (⚙).
   - Active tab is `text-merciless-gold`; inactive is `text-merciless-muted`.
   - Bottom inset uses `env(safe-area-inset-bottom)`.
   - Focus ring on keyboard nav: `ring-2 ring-merciless-gold`.
   - `aria-current="page"` on the active tab.
   - Each tab is a `Link` with descriptive `aria-label`.

The free-tier `/reading` page uses a `reading-viewport-lock` class to prevent vertical scrolling so the upgrade prompt is always in view.

---

## Animations

Defined in `tailwind.config.ts`:

| Class | Effect | Duration |
|---|---|---|
| `animate-twinkle` | Opacity pulse 0.3 → 1 → 0.3 | 3s infinite |
| `animate-fade-in` | Opacity 0 → 1 | 0.5s |
| `animate-fade-slide-up` | translateY(20px) + opacity (delayed) | 0.6s |
| `animate-slide-up` | translateY(20px) + opacity | 0.4s |
| `animate-pulse-gold` | Gold box-shadow expand/fade | 2s infinite |

Additional CSS animations in `index.css`:
- `.typing-dot` — staggered bounce for Oracle loading (3 dots).
- `.text-gold-shimmer` — gold gradient shimmer on key landing words.
- `.pill-glow` — soft gold glow on the landing pill badge.

---

## Glyph reference

### Zodiac signs

| Sign | Glyph | Image asset |
|---|---|---|
| Aries | ♈ | `/signs/aries.webp` |
| Taurus | ♉ | `/signs/taurus.webp` |
| Gemini | ♊ | `/signs/gemini.webp` |
| Cancer | ♋ | `/signs/cancer.webp` |
| Leo | ♌ | `/signs/leo.webp` |
| Virgo | ♍ | `/signs/virgo.webp` |
| Libra | ♎ | `/signs/libra.webp` |
| Scorpio | ♏ | `/signs/scorpio.webp` |
| Sagittarius | ♐ | `/signs/sagittarius.webp` |
| Capricorn | ♑ | `/signs/capricorn.webp` |
| Aquarius | ♒ | `/signs/aquarius.webp` |
| Pisces | ♓ | `/signs/pisces.webp` |

### Planets

| Planet | Glyph |
|---|---|
| Sun | ☉ |
| Moon | ☽ |
| Mercury | ☿ |
| Venus | ♀ |
| Mars | ♂ |
| Jupiter | ♃ |
| Saturn | ♄ |
| Uranus | ♅ |
| Neptune | ♆ |
| Pluto | ♇ |
| Chiron | ⚷ |
| North Node | ☊ |

### Aspects

| Aspect | Glyph |
|---|---|
| Conjunction | ☌ |
| Sextile | ⚹ |
| Square | □ |
| Trine | △ |
| Opposition | ☍ |
| Quincunx | ⚻ |

---

## Intensity scale

| Level | Label | Color |
|---|---|---|
| 1–3 | Quiet | `#22C55E` |
| 4–5 | Active | `#F5A623` |
| 6–7 | Intense | `#FF6B35` |
| 8–10 | Merciless | `#E53E3E` |

### Stoic action difficulty

| Difficulty | Label | Color |
|---|---|---|
| Easy | DO NOW | `text-green-400` |
| Medium | REQUIRES EFFORT | `text-merciless-gold` |
| Hard | HARD TRUTH | `text-red-400` |

---

## Share card

9:16 aspect ratio, dark theme, exported as PNG via html2canvas at 2× scale.

```
┌──────────────────────────┐
│ ☉ Scorpio · ☽ Cap · ↑ Vir │   signs row, top
│                          │
│                          │
│  SATURDAY, APRIL 26      │   date, muted
│                          │
│  You're Not Stuck.       │   headline, gold, 28px bold
│  You're Avoiding the     │
│  Decision You Already    │
│  Know You Need to Make.  │
│                          │
│  Saturn transiting your  │   excerpt, gray, 14px
│  natal Mercury in the    │
│  3rd house...            │
│                          │
│                          │
│ 🌕         merciless.app  │   moon + watermark, bottom
└──────────────────────────┘
```

- Background: `#0A0A0B`
- Border: `1px solid #1E1E24`, 16px radius
- Headline: `#F5A623`, 28 px, weight 700
- Excerpt: `#9B9B9B`, 14 px
- Watermark: `#F5A623`, 12 px, letter-spacing 2 px

The card is built specifically to be recognizable at thumbnail size in TikTok / IG / X feeds — black + gold is the silhouette.

---

## Starfield background

Canvas-based animated background (`StarfieldBg.tsx`):
- 180 stars, random position, size 1–2.5 px, opacity twinkle.
- Sinusoidal opacity animation at randomized speeds.
- Fixed `z-index: 0`, `pointer-events: none`.
- Radial-gradient overlay: `#0d0d14` center → `#0A0A0B` edges.

Always present behind the main app surface; provides depth without competing with content.

---

## Accessibility notes

- All interactive controls have visible focus rings (`focus-visible:ring-2 focus-visible:ring-merciless-gold`).
- Mobile bottom tabs include `aria-label` on each link and `aria-current="page"` on the active tab.
- Session-expired toast uses `role="alert"` + `aria-live="polite"`.
- Image assets always carry `alt` text (brand assets: "Merciless"; sign images: the sign name via `SignBadge`).
- Color combinations meet WCAG AA contrast against `#0A0A0B` background for body text and CTAs.
