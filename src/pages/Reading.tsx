import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDailyReading } from '../hooks/useDailyReading'
import { useNatalChart } from '../hooks/useNatalChart'
import { useSubscription } from '../hooks/useSubscription'
import StoicActionCard from '../components/StoicActionCard'
import ShareCard from '../components/ShareCard'
import { getIntensityLabel } from '../lib/astrology'

const NAV_LINKS = [
  { path: '/reading', label: 'READING' },
  { path: '/chart', label: 'CHART' },
  { path: '/oracle', label: 'ORACLE' },
  { path: '/settings', label: 'SETTINGS' },
]

export default function Reading() {
  const navigate = useNavigate()
  const { chart, loading: chartLoading } = useNatalChart()
  const { reading, loading, generating, error, refetch } = useDailyReading()
  const { isPro, upgradeToPro, upgrading } = useSubscription()

  useEffect(() => {
    if (!chartLoading && !chart) {
      navigate('/onboarding')
    }
  }, [chartLoading, chart, navigate])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const intensityConfig = reading ? getIntensityLabel(reading.intensity_level) : null

  return (
    <div className="relative z-10 min-h-screen">
      <nav className="border-b border-merciless-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="text-merciless-gold font-bold tracking-[0.2em] text-sm">MERCILESS</div>
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.path}
                to={l.path}
                className={`text-xs tracking-widest font-medium transition-colors ${
                  l.path === '/reading' ? 'text-merciless-gold' : 'text-merciless-muted hover:text-merciless-gold'
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
        {chart && (
          <div className="flex items-start justify-between">
            <div>
              <div className="text-merciless-muted text-xs tracking-widest mb-1">{today.toUpperCase()}</div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-merciless-white">☉ {chart.sun_sign}</span>
                <span className="text-merciless-border">·</span>
                <span className="text-merciless-white">☽ {chart.moon_sign}</span>
                <span className="text-merciless-border">·</span>
                <span className="text-merciless-white">↑ {chart.rising_sign}</span>
              </div>
            </div>
            {reading && intensityConfig && (
              <div className="text-right">
                <div className="text-xs tracking-widest text-merciless-muted mb-1">INTENSITY</div>
                <div className="text-sm font-bold" style={{ color: intensityConfig.color }}>
                  {intensityConfig.label.toUpperCase()} · {reading.intensity_level}/10
                </div>
              </div>
            )}
          </div>
        )}

        {(loading || generating) && (
          <div className="merciless-card p-12 text-center space-y-6">
            <div className="text-5xl animate-pulse text-merciless-gold">☽</div>
            <div>
              <div className="text-merciless-white font-semibold mb-2">
                {generating ? 'Generating your reading...' : 'Loading...'}
              </div>
              <div className="text-merciless-muted text-sm">
                {generating ? "The Oracle is reading your chart against today's transits." : ''}
              </div>
            </div>
          </div>
        )}

        {error && !loading && !generating && (
          <div className="merciless-card p-8 text-center space-y-4">
            <div className="text-merciless-danger text-xl">⚠</div>
            <div>
              <div className="text-merciless-white font-semibold mb-2">Reading failed</div>
              <div className="text-merciless-muted text-sm mb-4">{error}</div>
              {error.includes('natal chart') ? (
                <button
                  onClick={() => navigate('/onboarding')}
                  className="px-6 py-3 bg-merciless-gold text-merciless-black font-bold text-sm rounded-lg"
                >
                  Complete onboarding
                </button>
              ) : (
                <button
                  onClick={refetch}
                  className="px-6 py-3 border border-merciless-border text-merciless-white text-sm rounded-lg hover:border-merciless-gold/40 transition-colors"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        )}

        {reading && !loading && !generating && (
          <div className="space-y-6 animate-fade-in">
            <div className="merciless-card p-6 gold-glow">
              <div className="text-xs tracking-widest text-merciless-muted mb-3">TODAY'S TRUTH</div>
              <h1 className="text-2xl md:text-3xl font-bold text-merciless-gold leading-snug">
                {reading.brutal_headline}
              </h1>
              {reading.planet_focus && (
                <div className="mt-4 text-xs text-merciless-muted">
                  Driven by: <span className="text-merciless-white">{reading.planet_focus}</span>
                </div>
              )}
            </div>

            {isPro ? (
              <>
                <div className="merciless-card p-6">
                  <div className="text-xs tracking-widest text-merciless-muted mb-4">FULL READING</div>
                  <p className="text-merciless-white leading-relaxed text-sm md:text-base">
                    {reading.reading_text}
                  </p>
                </div>

                {reading.active_transits && reading.active_transits.length > 0 && (
                  <div className="merciless-card p-6">
                    <div className="text-xs tracking-widest text-merciless-muted mb-4">ACTIVE TRANSITS</div>
                    <div className="flex flex-wrap gap-2">
                      {reading.active_transits.slice(0, 6).map((transit, i) => (
                        <span
                          key={i}
                          className="text-xs bg-merciless-black border border-merciless-border rounded px-3 py-1.5 text-merciless-muted"
                        >
                          {`${transit.transiting_planet} ${transit.aspect} ${transit.natal_planet}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {reading.stoic_actions && reading.stoic_actions.length > 0 && (
                  <div className="merciless-card p-6">
                    <div className="text-xs tracking-widest text-merciless-muted mb-4">TODAY'S ACTIONS</div>
                    <StoicActionCard actions={reading.stoic_actions} />
                  </div>
                )}

                {reading.shareable_card_data && (
                  <div className="merciless-card p-6">
                    <div className="text-xs tracking-widest text-merciless-muted mb-4">SHARE YOUR READING</div>
                    <ShareCard
                      data={{
                        brutalHeadline: reading.brutal_headline,
                        excerpt: reading.reading_text.slice(0, 120) + '...',
                        sunSign: reading.shareable_card_data.sun_sign,
                        moonSign: reading.shareable_card_data.moon_sign,
                        risingSign: reading.shareable_card_data.rising_sign,
                        date: today,
                      }}
                    />
                  </div>
                )}

                <div className="merciless-card p-6 violet-glow" style={{ borderColor: 'rgba(123,47,190,0.3)' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs tracking-widest text-merciless-muted mb-2">THE ORACLE</div>
                      <p className="text-merciless-white text-sm leading-relaxed">
                        Ask your chart anything. The Oracle speaks from your natal chart with authority.
                      </p>
                    </div>
                    <Link
                      to="/oracle"
                      className="ml-6 flex-shrink-0 px-4 py-2 bg-merciless-violet text-white text-xs font-bold tracking-widest rounded-lg hover:bg-merciless-violet-light transition-colors"
                    >
                      ASK →
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="merciless-card p-8 text-center space-y-6" style={{ borderColor: 'rgba(245,166,35,0.2)' }}>
                <div>
                  <div className="text-xs tracking-widest text-merciless-muted mb-3">PRO — $4.99/mo</div>
                  <h2 className="text-merciless-white font-bold text-xl mb-3">
                    The headline is free.<br />The truth costs $4.99.
                  </h2>
                  <p className="text-merciless-muted text-sm leading-relaxed">
                    Full readings. Stoic actions. The Oracle. All backed by your actual natal chart.
                  </p>
                </div>

                <div className="space-y-3 text-sm text-left max-w-xs mx-auto">
                  {[
                    '150-200 word daily reading',
                    'Chart-specific Stoic actions',
                    'Active transit analysis',
                    'Unlimited Oracle conversations',
                    'Shareable reading cards',
                    'Full natal chart viewer',
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-merciless-muted">
                      <span className="text-merciless-gold">✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={upgradeToPro}
                  disabled={upgrading}
                  className="w-full max-w-xs mx-auto block py-4 bg-merciless-gold text-merciless-black font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-gold/90 transition-all disabled:opacity-50 animate-pulse-gold"
                >
                  {upgrading ? 'REDIRECTING...' : 'UPGRADE TO PRO'}
                </button>
              </div>
            )}
          </div>
        )}

        {!reading && !loading && !generating && !error && chart && (
          <div className="merciless-card p-12 text-center space-y-6">
            <div className="text-merciless-muted text-sm">No reading for today yet.</div>
            <button
              onClick={refetch}
              className="px-6 py-3 bg-merciless-gold text-merciless-black font-bold text-sm rounded-lg"
            >
              Generate Reading
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
