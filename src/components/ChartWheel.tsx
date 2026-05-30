import { useState } from 'react'

// Interactive natal chart wheel. Renders the real chart (planets at their true
// ecliptic longitudes, whole-sign houses, aspect lines) as an SVG. Tap any
// planet to get its placement and a brutal one-line read. The Ascendant sits at
// the left (9 o'clock) and longitude increases counterclockwise, the standard
// orientation.

const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']
const SIGN_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  NorthNode: '☊', SouthNode: '☋', Chiron: '⚷', Ascendant: 'Asc', Midheaven: 'MC',
}
const ELEMENT_COLOR: Record<string, string> = { Fire: '#E5533E', Earth: '#68D391', Air: '#63B3ED', Water: '#76E4F7' }
const SIGN_ELEMENT = ['Fire', 'Earth', 'Air', 'Water', 'Fire', 'Earth', 'Air', 'Water', 'Fire', 'Earth', 'Air', 'Water']
const ASPECT_COLOR: Record<string, string> = {
  conjunction: '#F5A623', sextile: '#63B3ED', square: '#E5533E', trine: '#68D391', opposition: '#9D4EDD',
}
// One brutal line per sign, for the tap detail.
const SIGN_WOUND: Record<string, string> = {
  Aries: 'starts fires it will not tend', Taurus: 'calls being stuck being steady',
  Gemini: 'talks so it never has to choose', Cancer: 'gives care with a receipt attached',
  Leo: 'needs the audience to believe it matters', Virgo: 'fixes others to avoid being seen',
  Libra: 'calls cowardice fairness', Scorpio: 'withholds to stay in control',
  Sagittarius: 'calls running freedom', Capricorn: 'climbs to avoid feeling',
  Aquarius: 'calls distance principle', Pisces: 'calls the fog depth',
}

interface PlanetPos { sign: string; longitude: number; degree: number; retrograde?: boolean }
export interface ChartLike {
  planets: Record<string, PlanetPos>
  houses?: Array<{ house: number; longitude: number; sign: string }>
  aspects?: Array<{ planet1: string; planet2: string; aspect: string; orb: number }>
}

const norm = (x: number) => ((x % 360) + 360) % 360
const PLOT_ORDER = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'NorthNode', 'Chiron']

interface TransitFrame { date: string; lon: Record<string, number> }

export default function ChartWheel({ chart, transits }: { chart: ChartLike; transits?: TransitFrame[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [frame, setFrame] = useState(0)

  const ascLon = chart.planets?.Ascendant?.longitude
  const hasAsc = typeof ascLon === 'number'
  const baseLon = hasAsc ? ascLon : (chart.planets?.Sun?.longitude ?? 0)

  const S = 360, cx = S / 2, cy = S / 2
  const rOuter = 172, rZodiac = 150, rTransit = 138, rPlanet = 112, rAspect = 92
  const tf: TransitFrame | undefined = transits && transits.length ? transits[Math.min(frame, transits.length - 1)] : undefined

  // Ecliptic longitude -> screen point. ASC at left (180deg), CCW with longitude.
  const pt = (lon: number, r: number) => {
    const theta = (180 + (norm(lon) - baseLon)) * Math.PI / 180
    return { x: cx + r * Math.cos(theta), y: cy - r * Math.sin(theta) }
  }

  // Planets, with simple collision spreading when too close.
  const planetList = PLOT_ORDER
    .filter((n) => chart.planets?.[n] && typeof chart.planets[n].longitude === 'number')
    .map((n) => ({ name: n, ...chart.planets[n] }))
    .sort((a, b) => norm(a.longitude - baseLon) - norm(b.longitude - baseLon))
  const drawLon: Record<string, number> = {}
  let prev = -999
  for (const p of planetList) {
    let rel = norm(p.longitude - baseLon)
    if (rel - prev < 9) rel = prev + 9
    prev = rel
    drawLon[p.name] = norm(rel + baseLon)
  }

  const sel = selected ? chart.planets?.[selected] : null

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[360px]" role="img" aria-label="Natal chart wheel">
        <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="#1E1E24" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={rZodiac} fill="none" stroke="#1E1E24" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={rAspect} fill="none" stroke="#15151c" strokeWidth="1" />

        {/* Sign sectors + glyphs */}
        {SIGN_NAMES.map((name, i) => {
          const start = pt(i * 30, rZodiac), end = pt(i * 30, rOuter)
          const mid = pt(i * 30 + 15, (rZodiac + rOuter) / 2)
          return (
            <g key={name}>
              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#1E1E24" strokeWidth="1" />
              <text x={mid.x} y={mid.y} fontSize="15" fill={ELEMENT_COLOR[SIGN_ELEMENT[i]]} textAnchor="middle" dominantBaseline="central" opacity="0.85">{SIGN_GLYPHS[i]}</text>
            </g>
          )
        })}

        {/* House cusp lines (whole-sign) */}
        {(chart.houses || []).map((h) => {
          const a = pt(h.longitude, 0), b = pt(h.longitude, rZodiac)
          const lbl = pt(h.longitude + 2, 30)
          return (
            <g key={h.house}>
              <line x1={cx} y1={cy} x2={b.x} y2={b.y} stroke="#15151c" strokeWidth={h.house === 1 || h.house === 10 ? 1.5 : 0.6} />
              <text x={lbl.x} y={lbl.y} fontSize="8" fill="#4a4a55" textAnchor="middle" dominantBaseline="central">{h.house}</text>
            </g>
          )
        })}

        {/* Aspect lines */}
        {(chart.aspects || []).slice(0, 24).map((asp, i) => {
          const p1 = chart.planets?.[asp.planet1], p2 = chart.planets?.[asp.planet2]
          if (!p1 || !p2 || drawLon[asp.planet1] === undefined || drawLon[asp.planet2] === undefined) return null
          const a = pt(p1.longitude, rAspect), b = pt(p2.longitude, rAspect)
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={ASPECT_COLOR[asp.aspect] || '#333'} strokeWidth="0.7" opacity="0.5" />
        })}

        {/* Planets */}
        {planetList.map((p) => {
          const pos = pt(drawLon[p.name], rPlanet)
          const tick1 = pt(p.longitude, rZodiac), tick2 = pt(p.longitude, rPlanet + 10)
          const isSel = selected === p.name
          return (
            <g key={p.name} onClick={() => setSelected(isSel ? null : p.name)} style={{ cursor: 'pointer' }}>
              <line x1={tick1.x} y1={tick1.y} x2={tick2.x} y2={tick2.y} stroke="#3a3a45" strokeWidth="0.6" />
              <circle cx={pos.x} cy={pos.y} r="13" fill={isSel ? '#F5A623' : '#111115'} stroke={isSel ? '#F5A623' : '#2a2a33'} strokeWidth="1" />
              <text x={pos.x} y={pos.y} fontSize="13" fill={isSel ? '#0A0A0B' : '#F0EDE8'} textAnchor="middle" dominantBaseline="central">{PLANET_GLYPHS[p.name] || '?'}</text>
              {p.retrograde && <text x={pos.x + 11} y={pos.y - 9} fontSize="8" fill="#E5533E" textAnchor="middle">℞</text>}
            </g>
          )
        })}

        {/* Transiting overlay (time-scrub): the moving sky on the selected date */}
        {tf && Object.entries(tf.lon).map(([name, lon]) => {
          const pos = pt(lon, rTransit)
          let hit: (typeof planetList)[number] | null = null
          for (const np of planetList) { let d = Math.abs(norm(lon) - norm(np.longitude)); if (d > 180) d = 360 - d; if (d <= 3) { hit = np; break } }
          return (
            <g key={`t-${name}`}>
              {hit && (() => { const n = pt(hit!.longitude, rPlanet); return <line x1={pos.x} y1={pos.y} x2={n.x} y2={n.y} stroke="#76E4F7" strokeWidth="1" opacity="0.7" /> })()}
              <circle cx={pos.x} cy={pos.y} r="8" fill="#0A0A0B" stroke="#76E4F7" strokeWidth="0.8" opacity="0.92" />
              <text x={pos.x} y={pos.y} fontSize="9" fill="#76E4F7" textAnchor="middle" dominantBaseline="central">{PLANET_GLYPHS[name] || '?'}</text>
            </g>
          )
        })}

        {/* ASC / MC markers (kept inside the ring so they never clip) */}
        {hasAsc && (() => { const a = pt(ascLon, rOuter - 13); return <text x={a.x} y={a.y} fontSize="9" fill="#9D4EDD" textAnchor="middle" dominantBaseline="central" fontWeight="bold">ASC</text> })()}
        {typeof chart.planets?.Midheaven?.longitude === 'number' && (() => { const m = pt(chart.planets.Midheaven.longitude, rOuter - 13); return <text x={m.x} y={m.y} fontSize="9" fill="#F5A623" textAnchor="middle" dominantBaseline="central" fontWeight="bold">MC</text> })()}
      </svg>

      {transits && transits.length > 1 && (
        <div className="w-full max-w-[360px] mt-3">
          <input
            type="range" min={0} max={transits.length - 1} value={frame}
            onChange={(e) => setFrame(Number(e.target.value))}
            className="w-full" style={{ accentColor: '#76E4F7' }}
            aria-label="Scrub the transit date"
          />
          <div className="flex justify-between text-[10px] text-merciless-muted">
            <span>now</span>
            <span style={{ color: '#76E4F7' }}>{tf?.date}</span>
            <span>+{transits.length - 1}wk</span>
          </div>
          <p className="text-center text-[10px] text-merciless-muted mt-1">Cyan is the sky on {tf?.date}. Lines show where it lands on your chart.</p>
        </div>
      )}

      <div className="mt-4 w-full max-w-[360px] min-h-[72px]">
        {sel ? (
          <div className="merciless-card p-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="text-merciless-white font-bold">
                {selected} in {sel.sign} {Math.round(sel.degree)}&deg;{sel.retrograde ? ' ℞' : ''}
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close" className="text-merciless-muted hover:text-merciless-white text-lg leading-none">&times;</button>
            </div>
            <p className="text-merciless-muted text-sm mt-1.5">
              {selected === 'Ascendant' || selected === 'Midheaven'
                ? `The angle that shapes how the rest of the chart lands.`
                : `${selected} in ${sel.sign}: it ${SIGN_WOUND[sel.sign] || 'shows you a truth you keep avoiding'}.`}
            </p>
          </div>
        ) : (
          <p className="text-center text-merciless-muted text-xs">Tap a planet to hear what it says about you.</p>
        )}
      </div>
    </div>
  )
}
