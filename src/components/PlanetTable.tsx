import { PLANET_GLYPHS, PLANET_COLORS, ZODIAC_GLYPHS, HOUSE_MEANINGS, formatDegree } from '../lib/astrology'
import type { ZodiacSign } from '../lib/astrology'

interface PlanetPosition {
  planet: string
  sign: string
  house: number
  degree: number
  retrograde?: boolean
}

interface PlanetTableProps {
  planets: PlanetPosition[]
}

export default function PlanetTable({ planets }: PlanetTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-merciless-border">
            <th className="text-left text-merciless-muted text-xs tracking-widest font-normal pb-3 pr-4">PLANET</th>
            <th className="text-left text-merciless-muted text-xs tracking-widest font-normal pb-3 pr-4">SIGN</th>
            <th className="text-left text-merciless-muted text-xs tracking-widest font-normal pb-3 pr-4">DEG</th>
            <th className="text-left text-merciless-muted text-xs tracking-widest font-normal pb-3">HOUSE</th>
          </tr>
        </thead>
        <tbody className="space-y-2">
          {planets.map((p) => {
            const color = PLANET_COLORS[p.planet] || '#F0EDE8'
            const glyph = PLANET_GLYPHS[p.planet] || '◦'
            const signGlyph = ZODIAC_GLYPHS[p.sign as ZodiacSign] || ''
            return (
              <tr key={p.planet} className="border-b border-merciless-border/30 hover:bg-merciless-card/50 transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono" style={{ color }}>{glyph}</span>
                    <span className="text-merciless-white font-medium">
                      {p.planet}
                      {p.retrograde && <span className="text-merciless-muted ml-1 text-xs">℞</span>}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-merciless-muted mr-1">{signGlyph}</span>
                  <span className="text-merciless-white">{p.sign}</span>
                </td>
                <td className="py-3 pr-4 font-mono text-merciless-muted">{formatDegree(p.degree)}</td>
                <td className="py-3">
                  <div>
                    <span className="text-merciless-gold font-mono text-xs">H{p.house}</span>
                    <span className="text-merciless-muted text-xs ml-2">{HOUSE_MEANINGS[p.house]}</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
