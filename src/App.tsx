import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Landing from './pages/Landing'
import AuthCallback from './pages/AuthCallback'
import Onboarding from './pages/Onboarding'
import Reading from './pages/Reading'
import Oracle from './pages/Oracle'
import Chart from './pages/Chart'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import StarfieldBg from './components/StarfieldBg'
import ErrorBoundary from './components/ErrorBoundary'
import type { User } from '@supabase/supabase-js'

function ProtectedRoute({ user, children }: { user: User | null; children: React.ReactNode }) {
  if (!user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  const hadSessionRef = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      hadSessionRef.current = !!session
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Detect unexpected session loss (was signed in, now not, not via explicit logout)
      if (event === 'SIGNED_OUT' && hadSessionRef.current && !session) {
        setSessionExpired(true)
      }
      if (session) setSessionExpired(false)
      hadSessionRef.current = !!session
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-merciless-black flex items-center justify-center">
        <StarfieldBg />
        <img src="/merciless%20orange%20icon.png" alt="Merciless" className="h-12 w-12 animate-pulse" />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-merciless-black text-merciless-white relative">
          <StarfieldBg />
          {sessionExpired && (
            <div
              role="alert"
              aria-live="polite"
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-merciless-card border border-merciless-border rounded px-4 py-3 shadow-lg flex items-center gap-3 max-w-[90vw]"
            >
              <span className="text-sm text-merciless-white">Your session expired. Please sign in again.</span>
              <button
                type="button"
                onClick={() => setSessionExpired(false)}
                aria-label="Dismiss session-expired notice"
                className="text-merciless-muted hover:text-merciless-white text-lg leading-none"
              >
                &times;
              </button>
            </div>
          )}
          <Routes>
            <Route path="/" element={user ? <Navigate to="/reading" replace /> : <Landing />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/onboarding" element={
              <ProtectedRoute user={user}>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/reading" element={
              <ProtectedRoute user={user}>
                <Reading />
              </ProtectedRoute>
            } />
            <Route path="/oracle" element={
              <ProtectedRoute user={user}>
                <Oracle />
              </ProtectedRoute>
            } />
            <Route path="/chart" element={
              <ProtectedRoute user={user}>
                <Chart />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute user={user}>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
