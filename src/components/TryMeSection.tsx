import { useState, useRef, useCallback } from 'react'
import { supabase, extractFunctionErrorMessage } from '../lib/supabase'
import DemoResultCard from './DemoResultCard'

type DemoState = 'idle' | 'recording' | 'transcribing' | 'generating' | 'result' | 'error'

interface DemoResult {
  sunSign: string
  brutalHeadline: string
  excerpt: string
  birthDate: string
}

interface TranscriptionResponse {
  success: boolean
  transcript: string | null
  parsed: {
    iso: string
    display: string
    day: number
    month: number
    year: number
    confidence: 'high' | 'medium' | 'low'
    interpretation: string
  } | null
  error?: string
}

interface DemoReadingResponse {
  success: boolean
  sun_sign: string
  brutal_headline: string
  excerpt: string
  birth_date: string
  error?: string
}

interface TryMeSectionProps {
  onSignupClick: () => void
}

export default function TryMeSection({ onSignupClick }: TryMeSectionProps) {
  const [state, setState] = useState<DemoState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DemoResult | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [manualDate, setManualDate] = useState('')
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setResult(null)

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      })

      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        
        if (chunksRef.current.length === 0) {
          setError('No audio recorded. Please try again.')
          setState('idle')
          return
        }

        setState('transcribing')

        const audioBlob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        })

        await processAudio(audioBlob)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setState('recording')

      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording()
        }
      }, 5000)

    } catch (err: unknown) {
      const error = err as Error & { name?: string }
      if (error.name === 'NotAllowedError') {
        setError('Microphone access denied. Use the date picker instead.')
        setShowDatePicker(true)
      } else {
        setError('Could not access microphone. Use the date picker instead.')
        setShowDatePicker(true)
      }
      setState('idle')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const processAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const { data, error: fnError } = await supabase.functions.invoke<TranscriptionResponse>(
        'transcribe-date',
        { body: formData }
      )

      if (fnError) {
        throw new Error(await extractFunctionErrorMessage(fnError, 'Voice transcription is temporarily unavailable. Use the date picker below.'))
      }

      if (!data?.success || !data.parsed) {
        setError(data?.error || 'Could not understand. Try again or use the date picker.')
        setShowDatePicker(true)
        setState('idle')
        return
      }

      // Got the date, now generate the demo reading
      await generateDemoReading(data.parsed.iso)

    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || 'Failed to process audio. Try the date picker.')
      setShowDatePicker(true)
      setState('idle')
    }
  }

  const generateDemoReading = async (birthDate: string) => {
    setState('generating')
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke<DemoReadingResponse>(
        'demo-reading',
        { body: { birth_date: birthDate } }
      )

      if (fnError) {
        throw new Error(await extractFunctionErrorMessage(fnError, 'Failed to generate reading. Please try again.'))
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to generate reading')
      }

      setResult({
        sunSign: data.sun_sign,
        brutalHeadline: data.brutal_headline,
        excerpt: data.excerpt,
        birthDate: data.birth_date,
      })
      setState('result')

    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || 'Failed to generate reading. Please try again.')
      setState('idle')
    }
  }

  const handleManualDateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualDate) return
    
    setError(null)
    await generateDemoReading(manualDate)
  }

  const handleReset = () => {
    setState('idle')
    setResult(null)
    setError(null)
    setManualDate('')
  }

  const toggleRecording = useCallback(() => {
    if (state === 'recording') {
      stopRecording()
    } else if (state === 'idle') {
      startRecording()
    }
  }, [state, startRecording, stopRecording])

  // Result state
  if (state === 'result' && result) {
    return (
      <DemoResultCard
        result={result}
        onReset={handleReset}
        onSignupClick={onSignupClick}
      />
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="text-xs tracking-[0.3em] text-merciless-gold mb-2">TRY THE ORACLE</div>
        <p className="text-merciless-muted text-sm">
          Speak your birth date. Get a taste of what your chart has to say.
        </p>
      </div>

      <div className="bg-merciless-card border border-merciless-border rounded-2xl p-6 md:p-8">
        {/* Voice Input */}
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={state === 'transcribing' || state === 'generating'}
            aria-label={
              state === 'recording'
                ? 'Stop recording birth date'
                : state === 'transcribing'
                ? 'Transcribing your voice'
                : state === 'generating'
                ? 'Generating reading'
                : 'Start voice input for birth date'
            }
            aria-busy={state === 'transcribing' || state === 'generating'}
            aria-pressed={state === 'recording'}
            className={`relative flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-merciless-gold focus-visible:ring-offset-2 focus-visible:ring-offset-merciless-card ${
              state === 'recording'
                ? 'bg-red-500 text-white scale-110'
                : state === 'transcribing' || state === 'generating'
                ? 'bg-merciless-card border-2 border-merciless-border text-merciless-muted cursor-wait'
                : 'bg-merciless-black border-2 border-merciless-gold/40 text-merciless-gold hover:border-merciless-gold hover:scale-105 mic-button-glow'
            }`}
          >
            {state === 'recording' && (
              <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
            )}
            
            {state === 'transcribing' || state === 'generating' ? (
              <div className="w-8 h-8 border-2 border-merciless-gold border-t-transparent rounded-full animate-spin" />
            ) : state === 'recording' ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 relative z-10">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 relative z-10">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            )}
          </button>

          <div className="text-center">
            {state === 'recording' ? (
              <div>
                <div className="text-red-400 text-sm font-medium flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Listening... tap to stop
                </div>
                <div className="text-merciless-muted text-xs mt-1">
                  "July 3rd, 1987"
                </div>
              </div>
            ) : state === 'transcribing' ? (
              <div>
                <div className="text-merciless-gold text-sm font-medium">
                  Processing your voice...
                </div>
              </div>
            ) : state === 'generating' ? (
              <div>
                <div className="text-merciless-gold text-sm font-medium flex items-center justify-center gap-2">
                  <span className="oracle-eye">👁</span>
                  The Oracle is reading...
                </div>
                <div className="text-merciless-muted text-xs mt-1">
                  Consulting the stars
                </div>
              </div>
            ) : (
              <div>
                <div className="text-merciless-white text-sm font-medium">
                  Tap and speak your birth date
                </div>
                <div className="text-merciless-muted text-xs mt-1">
                  5 seconds max
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 text-merciless-danger text-xs bg-merciless-danger/10 border border-merciless-danger/20 rounded-lg px-3 py-2 text-center">
            {error}
          </div>
        )}

        {/* Date Picker Fallback */}
        {(showDatePicker || state === 'idle') && (
          <div className="mt-6 pt-6 border-t border-merciless-border">
            <div className="text-center text-merciless-muted text-xs mb-3">
              {showDatePicker ? 'Enter your birth date' : 'Or type it instead'}
            </div>
            <form onSubmit={handleManualDateSubmit} className="flex gap-2">
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                min="1900-01-01"
                className="flex-1 bg-merciless-black border border-merciless-border rounded-lg px-3 py-2.5 text-merciless-white text-sm focus:border-merciless-gold focus:ring-1 focus:ring-merciless-gold"
              />
              <button
                type="submit"
                disabled={!manualDate || state === 'generating'}
                className="px-4 py-2.5 bg-merciless-gold text-merciless-black font-bold text-sm rounded-lg hover:bg-merciless-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                GO
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Subtle social proof */}
      <div className="mt-4 text-center text-merciless-muted text-xs">
        Join 4,200+ who've heard what their chart has to say
      </div>
    </div>
  )
}
