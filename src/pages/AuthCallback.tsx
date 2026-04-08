import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StarfieldBg from '../components/StarfieldBg'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        navigate('/reading', { replace: true })
      }
    })
  }, [navigate])

  return (
    <div className="min-h-screen bg-merciless-black flex flex-col items-center justify-center gap-4">
      <StarfieldBg />
      <img src="/merciless%20orange%20icon.png" alt="Merciless" className="h-12 w-12 animate-pulse relative z-10" />
      <p className="text-merciless-muted text-sm relative z-10">Confirming your email...</p>
    </div>
  )
}
