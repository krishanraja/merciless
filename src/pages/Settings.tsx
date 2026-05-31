import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useSubscription } from '../hooks/useSubscription'
import { useNatalChart } from '../hooks/useNatalChart'
import AppNav from '../components/AppNav'
import { getNotificationPrefs, enablePush, disablePush, setEmailDigest, setTransitAlerts, pushSupported, type NotificationPrefs } from '../lib/push'

function ToggleRow({ label, desc, on, disabled, onToggle }: { label: string; desc: string; on: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-merciless-white text-sm font-medium">{label}</div>
        <div className="text-merciless-muted text-xs mt-0.5">{desc}</div>
      </div>
      <button
        type="button" onClick={onToggle} disabled={disabled} aria-pressed={on} aria-label={label}
        className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors relative disabled:opacity-40 ${on ? 'bg-merciless-gold' : 'bg-merciless-border'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-merciless-black transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { subscription, isPro, upgradeToPro, upgrading } = useSubscription()
  const { birthData } = useNatalChart()
  const [signingOut, setSigningOut] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  const [prefs, setPrefs] = useState<NotificationPrefs>({ push_enabled: false, email_enabled: false, transit_alerts: false })
  const [notifBusy, setNotifBusy] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    getNotificationPrefs().then(setPrefs)
  }, [])

  const togglePush = async () => {
    setNotifBusy(true)
    if (prefs.push_enabled) { await disablePush(); setPrefs((p) => ({ ...p, push_enabled: false })) }
    else { const ok = await enablePush(); setPrefs((p) => ({ ...p, push_enabled: ok })) }
    setNotifBusy(false)
  }
  const toggleEmail = async () => { const v = !prefs.email_enabled; setPrefs((p) => ({ ...p, email_enabled: v })); await setEmailDigest(v) }
  const toggleTransit = async () => { const v = !prefs.transit_alerts; setPrefs((p) => ({ ...p, transit_alerts: v })); await setTransitAlerts(v) }

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
                <div className="text-merciless-muted text-sm mt-1">The full daily reading, free. Pro adds the Oracle, the chart, and the forward path.</div>
              </div>
              <button
                onClick={() => upgradeToPro('pro')}
                disabled={upgrading}
                className="w-full py-3.5 bg-merciless-gold text-merciless-black font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-gold/90 transition-all disabled:opacity-50"
              >
                {upgrading ? 'REDIRECTING...' : 'UNLOCK THE ORACLE: $4.99/mo'}
              </button>
              <button
                onClick={() => upgradeToPro('premium')}
                disabled={upgrading}
                className="w-full py-2.5 border border-merciless-violet/40 text-merciless-violet-light text-[11px] tracking-widest rounded-lg hover:border-merciless-violet transition-all disabled:opacity-50"
              >
                GO PREMIUM: $17/mo
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="merciless-card p-6 space-y-5">
          <div className="text-xs tracking-widest text-merciless-muted mb-1">NOTIFICATIONS</div>
          <ToggleRow label="Daily summons" desc="A push at your morning with the day's reading and the transit driving it." on={prefs.push_enabled} disabled={notifBusy || !pushSupported()} onToggle={togglePush} />
          <ToggleRow label="Weekly letter" desc="A Monday email recap of the week your chart sees coming." on={prefs.email_enabled} onToggle={toggleEmail} />
          <ToggleRow label="Transit alerts" desc="A rare alert only when a heavyweight transit goes exact. The chart reaching out, one tap to turn off." on={prefs.transit_alerts} onToggle={toggleTransit} />
          {!pushSupported() && <p className="text-merciless-muted text-xs">Push is not supported in this browser. Email still works.</p>}
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
