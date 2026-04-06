import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface NatalChartData {
  id?: string
  user_id?: string
  planets: Record<string, { sign: string; longitude: number; degree: number }> | Array<{
    planet: string
    sign: string
    house: number
    degree: number
    retrograde?: boolean
  }>
  houses: Array<{
    house: number
    sign: string
    longitude?: number
    degree?: number
  }>
  aspects: Array<{
    planet1: string
    planet2: string
    aspect: string
    orb: number
  }>
  ascendant: string
  midheaven: string
  sun_sign: string
  moon_sign: string
  rising_sign: string
  calculated_at?: string
}

export interface BirthData {
  birth_date: string
  birth_time?: string
  birth_location: string
  latitude?: number
  longitude?: number
  timezone?: string
}

export function useNatalChart() {
  const [chart, setChart] = useState<NatalChartData | null>(null)
  const [birthData, setBirthData] = useState<BirthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadChart()
  }, [])

  const loadChart = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: chartData }, { data: bd }] = await Promise.all([
        supabase.from('natal_charts').select('*').eq('user_id', user.id).single(),
        supabase.from('user_birth_data').select('*').eq('user_id', user.id).single(),
      ])

      if (chartData) setChart(chartData)
      if (bd) setBirthData(bd)
    } catch (err) {
      // No chart yet — normal for new users
    } finally {
      setLoading(false)
    }
  }

  const calculateChart = async (data: BirthData) => {
    try {
      setCalculating(true)
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      const res = await supabase.functions.invoke('natal-chart', {
        body: data,
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (res.error) throw new Error(res.error.message)
      setChart(res.data)
      await loadChart()
      return res.data
    } catch (err: any) {
      setError(err.message || 'Failed to calculate chart')
      throw err
    } finally {
      setCalculating(false)
    }
  }

  return { chart, birthData, loading, calculating, error, calculateChart, refetch: loadChart }
}
