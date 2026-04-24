/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

function requireEnv(key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  const value = import.meta.env[key] as string | undefined
  if (!value || typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Set it in .env.local (dev) or Vercel project env vars (deploy).`
    )
  }
  return value
}

const supabaseUrl = requireEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = requireEnv('VITE_SUPABASE_ANON_KEY')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Supabase's functions.invoke returns a FunctionsHttpError with the generic
// message "Edge Function returned a non-2xx status code" and leaves `data`
// null. The real body lives on the underlying Response attached as `context`.
export async function extractFunctionErrorMessage(
  fnError: unknown,
  fallback = 'Something went wrong. Please try again.'
): Promise<string> {
  const err = fnError as { context?: unknown; message?: string } | null
  const response = err?.context
  if (response instanceof Response) {
    try {
      const body = await response.clone().json()
      if (body && typeof body.error === 'string' && body.error.trim()) {
        return body.error
      }
    } catch { /* body wasn't JSON, try text */ }
    try {
      const text = (await response.clone().text()).trim()
      if (text) return text
    } catch { /* ignore */ }
  }
  return err?.message || fallback
}

// Auth helpers
export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Database types
export interface UserBirthData {
  id: string
  user_id: string
  birth_date: string
  birth_time?: string
  birth_location: string
  latitude?: number
  longitude?: number
  timezone?: string
  created_at: string
  updated_at: string
}

export interface NatalChart {
  id: string
  user_id: string
  planets: Record<string, { sign: string; longitude: number; degree: number }>
  houses: HouseData[]
  aspects: Aspect[]
  ascendant?: string
  midheaven?: string
  sun_sign: string
  moon_sign: string
  rising_sign: string
  calculated_at: string
}

export interface PlanetPosition {
  sign: string
  degree: number
  longitude: number
}

export interface HouseData {
  house: number
  sign: string
  degree: number
  longitude: number
}

export interface Aspect {
  planet1: string
  planet2: string
  aspect: string
  orb: number
}

export interface DailyReading {
  id: string
  user_id: string
  reading_date: string
  brutal_headline: string
  reading_text: string
  stoic_actions: StoicAction[]
  active_transits: ActiveTransit[]
  planet_focus: string
  intensity_level: number
  shareable_card_data?: {
    sun_sign: string
    moon_sign: string
    rising_sign: string
    brutal_headline: string
    date: string
  }
  is_free_tier: boolean
  created_at: string
}

export interface ActiveTransit {
  transiting_planet: string
  natal_planet: string
  aspect: string
  orb: number
  is_applying: boolean
}

export interface StoicAction {
  action: string
  why: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface OracleConversation {
  id: string
  user_id: string
  messages: OracleMessage[]
  session_title?: string
  created_at: string
  updated_at: string
}

export interface OracleMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface UserSubscription {
  id: string
  user_id: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  stripe_price_id?: string
  status: 'active' | 'canceled' | 'past_due' | 'inactive'
  current_period_end?: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}
