import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const EXAMPLE_READING = {
  headline: "You're Not Stuck. You're Avoiding the Decision You Already Know You Need to Make.",
  text: "Saturn transiting your natal Mercury in the 3rd house. Your mind is not unclear — it is too clear. You know what needs to be said and to whom. The hesitation is not uncertainty; it is fear dressed as analysis. This pattern runs through your chart: Mercury square Saturn natal means you have always made clarity wait for permission. Today that stops.",
  signs: { sun: 'Scorpio', moon: 'Capricorn', rising: 'Virgo' },
  actions: [
    { action: 'Write the unsent message.', difficulty: 'hard' },
    { action: 'Cancel one commitment you agreed to out of guilt.', difficulty: 'medium' },
    { action: 'Do not explain your decisions today. State them.', difficulty: 'easy' },
  ],
}

export default function Landing() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        setSuccess('Account created. Check your email to confirm, then sign in.')
        setMode('signin')
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        navigate('/reading')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="text-merciless-gold font-bold tracking-[0.2em] text-lg">MERCILESS</div>
        <div className="text-merciless-muted text-sm">
          <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="hover:text-merciless-white transition-colors">
            {mode === 'signin' ? 'Create account' : 'Sign in'}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-5xl mx-auto w-full">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-block text-xs tracking-[0.3em] text-merciless-muted border border-merciless-border rounded-full px-5 py-2 mb-8">
            NATAL CHART · DAILY TRANSITS · THE ORACLE
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-merciless-white leading-tight mb-6">
            Your chart has always<br />
            <span className="text-gold-gradient">known things about you</span><br />
            that you haven't been<br />
            willing to hear.
          </h1>
          <p className="text-merciless-muted text-lg max-w-xl mx-auto leading-relaxed">
            Daily readings from your actual natal chart. No generalizations. No comfort. Just what the chart says.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 w-full items-start">
          {/* Example Reading */}
          <div className="space-y-6 animate-slide-up">
            <div className="text-xs tracking-[0.3em] text-merciless-muted">EXAMPLE READING</div>

            <div className="merciless-card p-6 space-y-5">
              {/* Signs */}
              <div className="flex items-center gap-4 text-sm">
                <span className="text-merciless-muted">☉ {EXAMPLE_READING.signs.sun}</span>
                <span className="text-merciless-border">·</span>
                <span className="text-merciless-muted">☽ {EXAMPLE_READING.signs.moon}</span>
                <span className="text-merciless-border">·</span>
                <span className="text-merciless-muted">↑ {EXAMPLE_READING.signs.rising}</span>
              </div>

              {/* Headline */}
              <h2 className="text-merciless-gold font-bold text-xl leading-snug">
                {EXAMPLE_READING.headline}
              </h2>

              {/* Reading text */}
              <p className="text-merciless-muted text-sm leading-relaxed">
                {EXAMPLE_READING.text}
              </p>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-merciless-border">
                <div className="text-xs tracking-widest text-merciless-muted mb-3">TODAY'S ACTIONS</div>
                {EXAMPLE_READING.actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className={`text-xs font-mono mt-0.5 ${
                      a.difficulty === 'hard' ? 'text-red-400' :
                      a.difficulty === 'medium' ? 'text-merciless-gold' : 'text-green-400'
                    }`}>{i + 1}.</span>
                    <span className="text-merciless-white">{a.action}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-6 text-xs text-merciless-muted">
              <div>
                <span className="text-merciless-white font-semibold">4,200+</span> charts calculated
              </div>
              <div className="w-px h-3 bg-merciless-border" />
              <div>
                <span className="text-merciless-white font-semibold">Daily</span> readings from your actual chart
              </div>
            </div>
          </div>

          {/* Auth Form */}
          <div className="merciless-card p-8 animate-slide-up">
            <div className="mb-6">
              <h2 className="text-merciless-white font-bold text-2xl mb-2">
                {mode === 'signup' ? 'Get your reading' : 'Welcome back'}
              </h2>
              <p className="text-merciless-muted text-sm">
                {mode === 'signup'
                  ? 'Free to start. Your headline, every day. Pro unlocks everything.'
                  : 'Your chart is waiting.'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="text-xs tracking-widest text-merciless-muted block mb-2">EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-merciless-black border border-merciless-border rounded-lg px-4 py-3 text-merciless-white placeholder-merciless-muted text-sm"
                />
              </div>
              <div>
                <label className="text-xs tracking-widest text-merciless-muted block mb-2">PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="8+ characters"
                  className="w-full bg-merciless-black border border-merciless-border rounded-lg px-4 py-3 text-merciless-white placeholder-merciless-muted text-sm"
                />
              </div>

              {error && (
                <div className="text-merciless-danger text-sm bg-merciless-danger/10 border border-merciless-danger/20 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-3">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-merciless-gold text-merciless-black font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-gold/90 transition-all disabled:opacity-50 animate-pulse-gold"
              >
                {loading ? 'LOADING...' : mode === 'signup' ? 'START FOR FREE' : 'SIGN IN'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-merciless-border space-y-3 text-xs text-merciless-muted">
              <div className="flex items-center gap-2">
                <span className="text-merciless-gold">☉</span>
                <span>Free: Daily headline from your chart</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-merciless-violet-light">★</span>
                <span>Pro $4.99/mo: Full reading + Stoic actions + The Oracle</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-6 w-full">
          {[
            {
              icon: '☽',
              title: 'Your actual chart',
              text: 'We calculate your natal chart from your exact birth data. No sun sign generalizations. Every reading is yours alone.',
            },
            {
              icon: '♄',
              title: 'Brutally honest',
              text: 'The Oracle speaks from your chart with authority. No hedging. No "perhaps." No soft landings. The truth, evidenced.',
            },
            {
              icon: '⚡',
              title: 'Stoic actions',
              text: 'Every reading ends with three things you can do today. Chart-backed. Specific. Difficulty-rated.',
            },
          ].map((f) => (
            <div key={f.title} className="merciless-card p-6 space-y-3">
              <div className="text-3xl text-merciless-gold">{f.icon}</div>
              <h3 className="text-merciless-white font-semibold">{f.title}</h3>
              <p className="text-merciless-muted text-sm leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
