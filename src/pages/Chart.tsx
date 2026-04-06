import { Link } from 'react-router-dom'
import { useNatalChart } from '../hooks/useNatalChart'
import { useSubscription } from '../hooks/useSubscription'
import PlanetTable from '../components/PlanetTable'
import { SIGN_ELEMENTS, SIGN_MODALITIES, ELEMENT_COLORS, ASPECT_COLORS, ASPECT_GLYPHS } from '../lib/astrology'
import type { ZodiacSign } from '../lib/astrology'

const NAV_LINKS = [
  { path: '/reading', label: 'READING' },
  { path: '/chart', label: 'CHART' },
  { path: '/oracle', label: 'ORACLE' },
  { path: '/settings', label: 'SETTINGS' },
]

export default function Chart() {
  const { chart, birthData, loading } = useNatalChart()
  const { isPro, upgradeToPro, upgrading } = useSubscription()

  // Transform chart planets into PlanetTable format
  const planetRows = chart
    ? Object.entries(chart.planets).map(([planet, data]: [string, any], i) => ({
        planet,
        sign: data.sign,
        house: chart.houses[i % 12]?.house || 1,
        degree: data.degree,
        retrograde: false,
      }))
    : []

  return (
    <div className="relative z-10 min-h-screen">
      <nav className="border-b border-merciless-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/reading">
            <img src="/merciless%20orange%20icon.png" alt="Merciless" className="h-7 w-7" />
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.path}
                to={l.path}
                className={`text-xs tracking-widest font-medium transition-colors ${
                  l.path === '/chart' ? 'text-merciless-gold' : 'text-merciless-muted hover:text-merciless-gold'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="md:hidden flex gap-4">
            {NAV_LINKS.map((l) => (
              <Link key={l.path} to={l.path} className="text-xs text-merciless-muted hover:text-merciless-gold transition-colors">
                {l.label.slice(0, 1)}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-merciless-white">Your Natal Chart</h1>
          {birthData && (
            <p className="text-merciless-muted text-sm mt-1">
              {birthData.birth_date} · {birthData.birth_location}
            </p>
          )}
        </div>

        {loading && (
          <div className="merciless-card p-12 text-center">
            <div className="text-5xl animate-pulse text-merciless-gold">☽</div>
          </div>
        )}

        {!loading && !chart && (
          <div className="merciless-card p-8 text-center space-y-4">
            <div className="text-merciless-muted text-sm">No chart calculated yet.</div>
            <Link
              to="/onboarding"
              className="inline-block px-6 py-3 bg-merciless-gold text-merciless-black font-bold text-sm rounded-lg"
            >
              Calculate My Chart
            </Link>
          </div>
        )}

        {chart && !isPro && (
          <div className="merciless-card p-8 text-center space-y-6" style={{ borderColor: 'rgba(245,166,35,0.2)' }}>
            <div>
              <h2 className="text-merciless-white font-bold text-xl mb-3">Chart viewer is Pro only</h2>
              <p className="text-merciless-muted text-sm leading-relaxed">
                See every planetary placement, house position, and aspect in your natal chart. Understand what's actually driving you.
              </p>
            </div>
            <button
              onClick={upgradeToPro}
              disabled={upgrading}
              className="px-8 py-4 bg-merciless-gold text-merciless-black font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-gold/90 transition-all disabled:opacity-50"
            >
              {upgrading ? 'REDIRECTING...' : 'UNLOCK CHART — $4.99/mo'}
            </button>
          </div>
        )}

        {chart && isPro && (
          <div className="space-y-6 animate-fade-in">
            {/* Big Three */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'SUN', value: chart.sun_sign, symbol: '☉', color: '#F5A623' },
                { label: 'MOON', value: chart.moon_sign, symbol: '☽', color: '#C0C0C0' },
                { label: 'RISING', value: chart.rising_sign, symbol: '↑', color: '#9D4EDD' },
              ].map((item) => (
                <div key={item.label} className="merciless-card p-5 text-center">
                  <div className="text-2xl mb-2" style={{ color: item.color }}>{item.symbol}</div>
                  <div className="text-merciless-white font-bold text-lg">{item.value}</div>
                  <div className="text-merciless-muted text-xs tracking-widest mt-1">{item.label}</div>
                </div>
              ))}
            </div>

            {/* Ascendant / Midheaven */}
            <div className="grid grid-cols-2 gap-4">
              <div className="merciless-card p-5">
                <div className="text-xs tracking-widest text-merciless-muted mb-2">ASCENDANT</div>
                <div className="text-merciless-white font-bold text-lg">{chart.ascendant}</div>
                <div className="text-merciless-muted text-xs mt-1">1st house cusp · persona</div>
              </div>
              <div className="merciless-card p-5">
                <div className="text-xs tracking-widest text-merciless-muted mb-2">MIDHEAVEN</div>
                <div className="text-merciless-white font-bold text-lg">{chart.midheaven}</div>
                <div className="text-merciless-muted text-xs mt-1">10th house cusp · legacy</div>
              </div>
            </div>

            {/* Planet Table */}
            <div className="merciless-card p-6">
              <div className="text-xs tracking-widest text-merciless-muted mb-6">PLANETARY POSITIONS</div>
              <PlanetTable planets={planetRows} />
            </div>

            {/* Key Aspects */}
            {chart.aspects && chart.aspects.length > 0 && (
              <div className="merciless-card p-6">
                <div className="text-xs tracking-widest text-merciless-muted mb-4">KEY ASPECTS</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {chart.aspects.slice(0, 10).map((asp: any, i: number) => {
                    const color = ASPECT_COLORS[asp.aspect] || '#F5A623'
                    const glyph = ASPECT_GLYPHS[asp.aspect] || '◦'
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 bg-merciless-black border border-merciless-border rounded-lg px-4 py-3 text-sm"
                      >
                        <span className="text-merciless-white font-medium">{asp.planet1}</span>
                        <span className="font-mono" style={{ color }}>{glyph}</span>
                        <span className="text-merciless-white font-medium">{asp.planet2}</span>
                        <span className="text-merciless-muted text-xs ml-auto">{asp.aspect} · {asp.orb}°</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Houses */}
            {chart.houses && chart.houses.length > 0 && (
              <div className="merciless-card p-6">
                <div className="text-xs tracking-widest text-merciless-muted mb-4">HOUSE CUSPS</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {chart.houses.map((house: any) => {
                    const sign = house.sign as ZodiacSign
                    const element = SIGN_ELEMENTS[sign]
                    const modality = SIGN_MODALITIES[sign]
                    const elementColor = ELEMENT_COLORS[element] || '#F0EDE8'
                    return (
                      <div key={house.house} className="bg-merciless-black border border-merciless-border rounded-lg px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-merciless-gold text-xs font-mono font-bold">H{house.house}</span>
                          <span className="text-xs font-medium" style={{ color: elementColor }}>{element}</span>
                        </div>
                        <div className="text-merciless-white text-sm font-medium">{house.sign}</div>
                        <div className="text-merciless-muted text-xs">{modality}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
