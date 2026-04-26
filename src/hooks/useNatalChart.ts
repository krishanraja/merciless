import { useState, useEffect } from 'react'
import { supabase, type Tables } from '../lib/supabase'

type NatalChartRow = Tables['natal_charts']['Row']
type BirthDataRow = Tables['user_birth_data']['Row']

function mapNatalChart(row: NatalChartRow): NatalChartData {
  return {
    id: row.id,
    user_id: row.user_id ?? undefined,
    planets: row.planets as NatalChartData['planets'],
    houses: row.houses as NatalChartData['houses'],
    aspects: row.aspects as NatalChartData['aspects'],
    ascendant: row.ascendant ?? '',
    midheaven: row.midheaven ?? '',
    sun_sign: row.sun_sign ?? '',
    moon_sign: row.moon_sign ?? '',
    rising_sign: row.rising_sign ?? '',
    calculated_at: row.calculated_at ?? undefined,
  }
}

function mapBirthData(row: BirthDataRow): BirthData {
  return {
    birth_date: row.birth_date,
    birth_time: row.birth_time ?? undefined,
    birth_location: row.birth_location,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    timezone: row.timezone ?? undefined,
  }
}

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

      if (chartData) setChart(mapNatalChart(chartData))
      if (bd) setBirthData(mapBirthData(bd))
    } catch (err) {
      // No chart yet - normal for new users
    } finally {
      setLoading(false)
    }
  }

  const calculateChart = async (data: BirthData) => {
    try {
      setCalculating(true)
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user?.id) {
        throw new Error('User not authenticated')
      }
      
      const res = await supabase.functions.invoke('natal-chart', {
        body: { ...data, user_id: user.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (res.error) throw new Error(res.error.message)
      const mapped = res.data ? mapNatalChart(res.data as NatalChartRow) : null
      if (mapped) setChart(mapped)
      await loadChart()
      return mapped
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to calculate chart')
      throw err
    } finally {
      setCalculating(false)
    }
  }

  return { chart, birthData, loading, calculating, error, calculateChart, refetch: loadChart }
}
