import { useState, useEffect } from 'react'
import { supabase, extractFunctionErrorMessage } from '../lib/supabase'

export interface DailyReadingData {
  id: string
  reading_date: string
  reading_text: string
  brutal_headline: string
  stoic_actions: Array<{
    action: string
    why: string
    difficulty: 'easy' | 'medium' | 'hard'
  }>
  active_transits: Array<{
    transiting_planet: string
    natal_planet: string
    aspect: string
    orb: number
    is_applying: boolean
  }>
  planet_focus: string
  intensity_level: number
  shareable_card_data?: any
  is_free_tier: boolean
}

export function useDailyReading() {
  const [reading, setReading] = useState<DailyReadingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReading()
  }, [])

  const loadReading = async () => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('daily_readings')
        .select('*')
        .eq('user_id', user.id)
        .eq('reading_date', today)
        .single()

      if (data) {
        setReading(data)
      } else {
        await generateReading()
      }
    } catch {
      // Will trigger generation
    } finally {
      setLoading(false)
    }
  }

  const generateReading = async () => {
    try {
      setGenerating(true)
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: { session } } = await supabase.auth.getSession()
      const res = await supabase.functions.invoke('daily-reading', {
        body: { user_id: user.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (res.error) {
        throw new Error(
          await extractFunctionErrorMessage(
            res.error,
            'Reading generation is temporarily unavailable. Please try again later.'
          )
        )
      }
      setReading(res.data)
    } catch (err: any) {
      setError(err.message || 'Failed to generate reading')
    } finally {
      setGenerating(false)
      setLoading(false)
    }
  }

  return { reading, loading, generating, error, refetch: loadReading }
}
