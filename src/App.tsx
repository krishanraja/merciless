import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Landing from './pages/Landing'
import AuthCallback from './pages/AuthCallback'
import Onboarding from './pages/Onboarding'
import Reading from './pages/Reading'
import Oracle from './pages/Oracle'
import Chart from './pages/Chart'
import Settings from './pages/Settings'
import StarfieldBg from './components/StarfieldBg'
import type { User } from '@supabase/supabase-js'

function ProtectedRoute({ user, children }: { user: User | null; children: React.ReactNode }) {
  if (!user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
    <BrowserRouter>
      <div className="min-h-screen bg-merciless-black text-merciless-white relative">
        <StarfieldBg />
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
        </Routes>
      </div>
    </BrowserRouter>
  )
}
