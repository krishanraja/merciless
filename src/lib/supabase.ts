import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
export interface NatalChart {
  id: string
  user_id: string
  birth_date: string
  birth_time: string
  birth_location: string
  latitude: number
  longitude: number
  timezone: string
  planets: PlanetPosition[]
  houses: HouseData[]
  aspects: Aspect[]
  sun_sign: string
  moon_sign: string
  rising_sign: string
  created_at: string
}

export interface PlanetPosition {
  name: string
  sign: string
  degree: number
  house: number
  retrograde: boolean
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
  type: string
  orb: number
  applying: boolean
}

export interface DailyReading {
  id: string
  user_id: string
  reading_date: string
  brutal_headline: string
  reading_text: string
  stoic_actions: StoicAction[]
  intensity_score: number
  moon_phase: string
  dominant_transit: string
  created_at: string
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
  stripe_customer_id: string
  stripe_subscription_id: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  current_period_end: string
  created_at: string
  updated_at: string
}
