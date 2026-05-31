// Web-push subscription + notification preferences (the daily summons #16, the
// weekly email digest #20, transit alerts #17). The VAPID public key is public
// by design, safe in the bundle.
import { supabase } from './supabase'

const VAPID_PUBLIC = 'BEfr8H_BdEyenVWyzJe5NyPCk2EP_DczV9uqknJvpbJb3r4iwMvGmdpKeqeZVXKXDthbN9tInDk1Yb_ubFIsgt4'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export interface NotificationPrefs {
  push_enabled: boolean
  email_enabled: boolean
  transit_alerts: boolean
}

export function pushSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const def = { push_enabled: false, email_enabled: false, transit_alerts: false }
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return def
    const { data } = await supabase.from('notification_prefs').select('push_enabled,email_enabled,transit_alerts').eq('user_id', user.id).single()
    return data ? { push_enabled: !!data.push_enabled, email_enabled: !!data.email_enabled, transit_alerts: !!data.transit_alerts } : def
  } catch { return def }
}

async function savePrefs(patch: Partial<NotificationPrefs>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('notification_prefs').upsert({
    user_id: user.id,
    utc_offset_minutes: -new Date().getTimezoneOffset(),
    unsubscribed: false,
    ...patch,
  }, { onConflict: 'user_id' })
}

// Registers the SW, asks permission, subscribes, and stores it. Returns true on success.
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return false
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource })
    const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    await supabase.from('push_subscriptions').upsert({
      user_id: user.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent,
    }, { onConflict: 'endpoint' })
    await savePrefs({ push_enabled: true })
    return true
  } catch { return false }
}

export async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) { await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe() }
  } catch { /* ignore */ }
  await savePrefs({ push_enabled: false })
}

export async function setEmailDigest(on: boolean): Promise<void> { await savePrefs({ email_enabled: on }) }
export async function setTransitAlerts(on: boolean): Promise<void> { await savePrefs({ transit_alerts: on }) }
