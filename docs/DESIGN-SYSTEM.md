# Merciless — Design System

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `merciless-black` | `#0A0A0B` | Page background |
| `merciless-card` | `#111115` | Card backgrounds |
| `merciless-border` | `#1E1E24` | Borders, dividers |
| `merciless-gold` | `#F5A623` | Primary accent — headlines, CTAs, active states |
| `merciless-gold-muted` | `#C4831A` | Gold gradient endpoint |
| `merciless-violet` | `#7B2FBE` | Secondary accent — Oracle, pro features |
| `merciless-violet-light` | `#9D4EDD` | Violet hover/light variant |
| `merciless-white` | `#F0EDE8` | Warm body text |
| `merciless-muted` | `#6B6B7A` | Secondary text, labels |
| `merciless-danger` | `#E53E3E` | Error states, hard difficulty |

### Element Colors (Astrology)
| Element | Hex |
|---------|-----|
| Fire | `#E53E3E` |
| Earth | `#68D391` |
| Air | `#63B3ED` |
| Water | `#76E4F7` |

### Planet Colors
| Planet | Hex |
|--------|-----|
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

### Aspect Colors
| Aspect | Hex |
|--------|-----|
| Conjunction | `#F5A623` (gold) |
| Sextile | `#3B82F6` (blue) |
| Square | `#E53E3E` (red) |
| Trine | `#22C55E` (green) |
| Opposition | `#FF4444` (red) |
| Quincunx | `#9D4EDD` (violet) |

---

## Typography

**Font Family:** Space Grotesk (Google Fonts)

Loaded via:
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
```

Tailwind config: `font-space: ['"Space Grotesk"', 'sans-serif']`

### Type Scale (common usage)

| Element | Size | Weight | Tracking | Example |
|---------|------|--------|----------|---------|
| Page headline | `text-5xl md:text-7xl` | `font-bold` | — | Landing hero |
| Section headline | `text-2xl md:text-3xl` | `font-bold` | — | Reading headline |
| Card title | `text-xl` | `font-bold` | — | Upgrade CTA |
| Body text | `text-sm md:text-base` | `font-normal` | — | Reading text |
| Label | `text-xs` | `font-medium` | `tracking-widest` | "TODAY'S TRUTH" |
| Muted label | `text-xs` | `font-normal` | `tracking-widest` | Date, section heads |
| Nav link | `text-xs` | `font-medium` | `tracking-widest` | "READING" |
| Brand mark | `text-lg` | `font-bold` | `tracking-[0.2em]` | "MERCILESS" |

---

## Components

### Cards (`.merciless-card`)

```css
background-color: #111115;
border: 1px solid #1E1E24;
border-radius: 12px;
```

Padding: `p-6` (standard) or `p-8` (emphasis)

### Glow Effects

**Gold glow** (`.gold-glow`) — used on primary reading card:
```css
box-shadow: 0 0 20px rgba(245, 166, 35, 0.3), 0 0 40px rgba(245, 166, 35, 0.1);
```

**Violet glow** (`.violet-glow`) — used on Oracle CTA:
```css
box-shadow: 0 0 20px rgba(123, 47, 190, 0.4), 0 0 40px rgba(123, 47, 190, 0.15);
```

### Buttons

**Primary CTA:**
```html
<button class="py-3.5 bg-merciless-gold text-merciless-black font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-gold/90 transition-all">
  UPGRADE TO PRO
</button>
```

**Secondary:**
```html
<button class="py-3 border border-merciless-border text-merciless-muted text-sm rounded-lg hover:border-merciless-gold/40 hover:text-merciless-white transition-colors">
  Try again
</button>
```

**Violet CTA (Oracle):**
```html
<button class="py-4 bg-merciless-violet text-white font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-violet-light transition-all">
  UNLOCK THE ORACLE
</button>
```

### Inputs

```html
<input class="w-full bg-merciless-black border border-merciless-border rounded-lg px-4 py-3 text-merciless-white placeholder-merciless-muted text-sm" />
```

Focus state: gold border + gold box-shadow (set in `index.css`).

### Navigation

Desktop: horizontal links with `tracking-widest`, active state in `text-merciless-gold`, inactive in `text-merciless-muted`.

Mobile: single-letter abbreviations (R, C, O, S).

Brand mark always top-left: `text-merciless-gold font-bold tracking-[0.2em] text-sm`.

---

## Animations

Defined in `tailwind.config.ts`:

| Class | Effect | Duration |
|-------|--------|----------|
| `animate-twinkle` | Opacity pulse 0.3→1→0.3 | 3s infinite |
| `animate-fade-in` | Opacity 0→1 | 0.5s |
| `animate-slide-up` | translateY(20px) + opacity | 0.4s |
| `animate-pulse-gold` | Gold box-shadow expand/fade | 2s infinite |

Additional CSS animations in `index.css`:
- `.typing-dot` — bounce animation for Oracle loading indicator (3 dots, staggered delay)

---

## Astrology Glyphs

### Zodiac Signs
| Sign | Glyph |
|------|-------|
| Aries | ♈ |
| Taurus | ♉ |
| Gemini | ♊ |
| Cancer | ♋ |
| Leo | ♌ |
| Virgo | ♍ |
| Libra | ♎ |
| Scorpio | ♏ |
| Sagittarius | ♐ |
| Capricorn | ♑ |
| Aquarius | ♒ |
| Pisces | ♓ |

### Planets
| Planet | Glyph |
|--------|-------|
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
|--------|-------|
| Conjunction | ☌ |
| Sextile | ⚹ |
| Square | □ |
| Trine | △ |
| Opposition | ☍ |
| Quincunx | ⚻ |

---

## Intensity Scale

| Level | Label | Color |
|-------|-------|-------|
| 1-3 | Quiet | `#22C55E` (green) |
| 4-5 | Active | `#F5A623` (gold) |
| 6-7 | Intense | `#FF6B35` (orange) |
| 8-10 | Merciless | `#E53E3E` (red) |

### Difficulty Ratings (Stoic Actions)

| Difficulty | Label | Color |
|------------|-------|-------|
| Easy | DO NOW | `text-green-400` |
| Medium | REQUIRES EFFORT | `text-merciless-gold` |
| Hard | HARD TRUTH | `text-red-400` |

---

## Share Card Design

9:16 aspect ratio, dark theme:

```
┌────────────────────────┐
│ ☉ Scorpio · ☽ Cap · ↑ Virgo │  (signs row, top)
│                              │
│                              │
│  SATURDAY, APRIL 6           │  (date, muted)
│                              │
│  You're Not Stuck.           │  (headline, gold, 28px bold)
│  You're Avoiding the         │
│  Decision You Already        │
│  Know You Need to Make.      │
│                              │
│  Saturn transiting your      │  (excerpt, gray, 14px)
│  natal Mercury in the 3rd... │
│                              │
│                              │
│ 🌕              merciless.app │  (moon + watermark, bottom)
└────────────────────────┘
```

Background: `#0A0A0B`
Border: `1px solid #1E1E24`, 16px radius
Headline: `#F5A623`, 28px, weight 700
Excerpt: `#9B9B9B`, 14px
Watermark: `#F5A623`, 12px, letter-spacing 2px

Exported via `html2canvas` at 2x scale as PNG.

---

## Starfield Background

Canvas-based animated background (`StarfieldBg.tsx`):
- 180 stars
- Random position, size (1-2.5px), and opacity
- Twinkling: sinusoidal opacity animation at random speeds
- Fixed position, z-index 0, pointer-events none
- Radial gradient overlay: `#0d0d14` center → `#0A0A0B` edges
