import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useSubscription } from '../hooks/useSubscription'
import { useNatalChart } from '../hooks/useNatalChart'
import AppNav from '../components/AppNav'

export default function Settings() {
  const navigate = useNavigate()
  const { subscription, isPro, upgradeToPro, upgrading } = useSubscription()
  const { birthData } = useNatalChart()
  const [signingOut, setSigningOut] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/')
  }

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="relative z-10 min-h-screen pb-16 md:pb-0">
      <AppNav />

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <h1 className="text-2xl font-bold text-merciless-white">Settings</h1>

        {/* Account */}
        <div className="merciless-card p-6 space-y-4">
          <div className="text-xs tracking-widest text-merciless-muted mb-2">ACCOUNT</div>
          {user && (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-merciless-white text-sm font-medium">{user.email}</div>
                <div className="text-merciless-muted text-xs mt-0.5">
                  Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="text-xs px-3 py-1 rounded-full border" style={{
                borderColor: isPro ? 'rgba(245,166,35,0.4)' : 'rgba(107,107,122,0.4)',
                color: isPro ? '#F5A623' : '#6B6B7A'
              }}>
                {isPro ? 'PRO' : 'FREE'}
              </div>
            </div>
          )}
        </div>

        {/* Subscription */}
        <div className="merciless-card p-6 space-y-4">
          <div className="text-xs tracking-widest text-merciless-muted mb-2">SUBSCRIPTION</div>

          {isPro ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-merciless-white font-semibold">Merciless Pro</div>
                  <div className="text-merciless-muted text-sm mt-1">$4.99/month · All features unlocked</div>
                  {periodEnd && (
                    <div className="text-merciless-muted text-xs mt-1">
                      {subscription?.cancel_at_period_end
                        ? `Cancels on ${periodEnd}`
                        : `Renews ${periodEnd}`}
                    </div>
                  )}
                </div>
                <div className="text-merciless-gold text-lg">★</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  'Daily full readings',
                  'Stoic actions',
                  'Oracle conversations',
                  'Natal chart viewer',
                  'Transit analysis',
                  'Shareable cards',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-merciless-muted">
                    <span className="text-merciless-gold">✓</span>
                    {f}
                  </div>
                ))}
              </div>

              {subscription?.cancel_at_period_end ? (
                <div className="text-merciless-muted text-sm bg-merciless-black border border-merciless-border rounded-lg px-4 py-3">
                  Your subscription is set to cancel on {periodEnd}. Contact support to reactivate.
                </div>
              ) : (
                <div className="text-merciless-muted text-xs">
                  To cancel, contact support or manage through Stripe customer portal.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-merciless-white font-semibold">Free plan</div>
                <div className="text-merciless-muted text-sm mt-1">Daily headline only</div>
              </div>
              <button
                onClick={upgradeToPro}
                disabled={upgrading}
                className="w-full py-3.5 bg-merciless-gold text-merciless-black font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-gold/90 transition-all disabled:opacity-50"
              >
                {upgrading ? 'REDIRECTING...' : 'UPGRADE TO PRO: $4.99/mo'}
              </button>
            </div>
          )}
        </div>

        {/* Birth Data */}
        {birthData && (
          <div className="merciless-card p-6 space-y-4">
            <div className="text-xs tracking-widest text-merciless-muted mb-2">BIRTH DATA</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-merciless-muted text-xs mb-1">DATE</div>
                <div className="text-merciless-white">{birthData.birth_date}</div>
              </div>
              {birthData.birth_time && (
                <div>
                  <div className="text-merciless-muted text-xs mb-1">TIME</div>
                  <div className="text-merciless-white">{birthData.birth_time}</div>
                </div>
              )}
              <div className="col-span-2">
                <div className="text-merciless-muted text-xs mb-1">LOCATION</div>
                <div className="text-merciless-white">{birthData.birth_location}</div>
              </div>
            </div>
            <Link
              to="/onboarding"
              className="inline-block text-xs text-merciless-muted hover:text-merciless-gold transition-colors"
            >
              Recalculate chart →
            </Link>
          </div>
        )}

        {/* Danger Zone */}
        <div className="merciless-card p-6 space-y-4" style={{ borderColor: 'rgba(229,62,62,0.2)' }}>
          <div className="text-xs tracking-widest text-merciless-muted mb-2">SESSION</div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="px-6 py-3 border border-merciless-border text-merciless-muted text-sm rounded-lg hover:border-merciless-danger/40 hover:text-merciless-danger transition-all disabled:opacity-50"
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </main>
    </div>
  )
}
