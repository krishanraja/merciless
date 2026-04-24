import { useState, useCallback, useRef, useEffect } from 'react'

export interface GeocodingResult {
  display_name: string
  lat: string
  lon: string
  address?: {
    city?: string
    town?: string
    village?: string
    state?: string
    country?: string
  }
}

export function useGeocoding() {
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const search = useCallback(async (query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!query || query.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          q: query,
          format: 'json',
          addressdetails: '1',
          limit: '5',
          featuretype: 'city',
        })

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          {
            signal: abortControllerRef.current.signal,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Merciless Astrology App',
            },
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch locations')
        }

        const data: GeocodingResult[] = await response.json()
        setResults(data)
      } catch (err: unknown) {
        const isAbort =
          err instanceof DOMException && err.name === 'AbortError'
        if (!isAbort) {
          setError(err instanceof Error ? err.message : 'Failed to search locations')
          setResults([])
        }
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  const clear = useCallback(() => {
    setResults([])
    setError(null)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return { results, loading, error, search, clear }
}

export function formatLocationName(result: GeocodingResult): string {
  const parts: string[] = []
  
  if (result.address) {
    const city = result.address.city || result.address.town || result.address.village
    if (city) parts.push(city)
    if (result.address.state) parts.push(result.address.state)
    if (result.address.country) parts.push(result.address.country)
  }
  
  if (parts.length > 0) {
    return parts.join(', ')
  }
  
  const displayParts = result.display_name.split(',').slice(0, 3)
  return displayParts.join(',').trim()
}
