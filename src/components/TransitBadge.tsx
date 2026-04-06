import { PLANET_GLYPHS, ASPECT_GLYPHS, ASPECT_COLORS } from '../lib/astrology'

interface Transit {
  transiting_planet: string
  natal_planet: string
  aspect: string
  orb: number
  is_applying: boolean
}

interface TransitBadgeProps {
  transits: Transit[]
}

export default function TransitBadge({ transits }: TransitBadgeProps) {
  if (!transits || transits.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {transits.map((t, i) => {
        const color = ASPECT_COLORS[t.aspect] || '#F5A623'
        const glyph = ASPECT_GLYPHS[t.aspect] || '◦'
        return (
          <div
            key={i}
            className="inline-flex items-center gap-1 bg-merciless-card border border-merciless-border rounded px-2 py-1 text-xs"
            style={{ borderColor: `${color}40` }}
          >
            <span style={{ color }} className="font-mono">
              {PLANET_GLYPHS[t.transiting_planet] || t.transiting_planet}
            </span>
            <span className="text-merciless-muted font-mono">{glyph}</span>
            <span className="text-merciless-white">
              {PLANET_GLYPHS[t.natal_planet] || t.natal_planet}
            </span>
            <span className="text-merciless-muted ml-1">
              {t.is_applying ? '→' : '←'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
