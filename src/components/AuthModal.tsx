import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        })
        if (err) throw err
        setSuccess('Check your inbox — tap the link to unlock your reading.')
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
        </div>

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
  )
}
