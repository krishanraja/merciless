import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { attributionUserMetadata, trackEvent } from '../lib/attribution'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'signin' | 'signup'
}

export default function AuthModal({ isOpen, onClose, initialMode = 'signup' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'signup') {
        const redirectTo = `${window.location.origin}/auth/callback`
        // Persist first-touch attribution onto the auth user so it survives the
        // email-confirmation round trip (the user leaves to their inbox).
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo, data: attributionUserMetadata() },
        })
        if (err) throw err
        void trackEvent('signed_up', { email })
        setSuccess('Check your inbox, tap the link to unlock your reading.')
        setMode('signin')
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        navigate('/reading')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (err) setError(err.message)
  }

  const handleMagicLink = async () => {
    if (!email) { setError('Enter your email first.'); return }
    setLoading(true); setError(null); setSuccess(null)
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: attributionUserMetadata() },
    })
    setLoading(false)
    if (err) setError(err.message)
    else setSuccess('Check your inbox for a one-tap magic link.')
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5 animate-modal-fade-in"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal card */}
      <div
        className="relative merciless-card p-8 w-full max-w-md animate-modal-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign-in dialog"
          className="absolute top-4 right-4 text-merciless-muted hover:text-merciless-white transition-colors text-xl leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-merciless-gold rounded"
        >
          &times;
        </button>

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

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full py-3 mb-4 bg-white text-merciless-black font-semibold text-sm rounded-lg hover:bg-white/90 transition-all flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 002.18 7.06L5.84 9.9C6.71 7.3 9.14 4.75 12 4.75z"/></svg>
          Continue with Google
        </button>
        <div className="flex items-center gap-3 mb-4"><div className="flex-1 h-px bg-merciless-border" /><span className="text-merciless-muted text-xs">or</span><div className="flex-1 h-px bg-merciless-border" /></div>

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
            aria-busy={loading}
            className="w-full py-3.5 bg-merciless-gold text-merciless-black font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-gold/90 transition-all disabled:opacity-50 animate-pulse-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-merciless-gold focus-visible:ring-offset-2 focus-visible:ring-offset-merciless-black"
          >
            {loading ? 'LOADING...' : mode === 'signup' ? 'START FOR FREE' : 'SIGN IN'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setSuccess(null) }}
            className="text-merciless-muted text-sm hover:text-merciless-white transition-colors"
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
          <button
            type="button"
            onClick={handleMagicLink}
            disabled={loading}
            className="block mx-auto mt-3 text-merciless-muted text-xs hover:text-merciless-gold transition-colors disabled:opacity-50"
          >
            Email me a magic link instead
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-merciless-border space-y-3 text-xs text-merciless-muted">
          <div className="flex items-center gap-2">
            <span className="text-merciless-gold">☉</span>
            <span>Free: the full daily reading from your chart</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-merciless-violet-light">★</span>
            <span>Pro $4.99/mo: the Oracle, the chart, the forward path</span>
          </div>
        </div>
      </div>
    </div>
  )
}
