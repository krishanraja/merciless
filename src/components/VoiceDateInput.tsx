import { useState, useRef, useCallback } from 'react'
import { supabase, extractFunctionErrorMessage } from '../lib/supabase'

interface ParsedDate {
  iso: string
  display: string
  day: number
  month: number
  year: number
  confidence: 'high' | 'medium' | 'low'
  interpretation: string
}

interface TranscriptionResponse {
  success: boolean
  transcript: string | null
  parsed: ParsedDate | null
  error?: string
}

interface VoiceDateInputProps {
  value: string
  onChange: (date: string) => void
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'confirming'

export default function VoiceDateInput({ value, onChange }: VoiceDateInputProps) {
  const [state, setState] = useState<RecordingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [parsedDate, setParsedDate] = useState<ParsedDate | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setTranscript(null)
      setParsedDate(null)

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

        setState('processing')

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
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please enable it in your browser settings.')
      } else {
        setError('Could not access microphone. Please try again.')
      }
      setState('idle')
    }
    // stopRecording is stable (defined within this component scope)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        {
          body: formData,
        }
      )

      if (fnError) {
        throw new Error(await extractFunctionErrorMessage(fnError, 'Voice transcription is temporarily unavailable. Please use the date picker.'))
      }

      if (!data?.success) {
        setError(data?.error || 'Could not understand. Please try again.')
        setState('idle')
        return
      }

      setTranscript(data.transcript)
      setParsedDate(data.parsed)
      setState('confirming')

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process audio. Please try again.')
      setState('idle')
    }
  }

  const confirmDate = useCallback(() => {
    if (parsedDate) {
      onChange(parsedDate.iso)
      setState('idle')
      setTranscript(null)
      setParsedDate(null)
    }
  }, [parsedDate, onChange])

  const rejectDate = useCallback(() => {
    setState('idle')
    setTranscript(null)
    setParsedDate(null)
    setError(null)
  }, [])

  const toggleRecording = useCallback(() => {
    if (state === 'recording') {
      stopRecording()
    } else if (state === 'idle') {
      startRecording()
    }
  }, [state, startRecording, stopRecording])

  // Confirmation UI
  if (state === 'confirming' && parsedDate) {
    return (
      <div className="space-y-4">
        <div className="bg-merciless-black border border-merciless-gold/30 rounded-lg p-4">
          <div className="text-xs tracking-widest text-merciless-muted mb-2">I HEARD</div>
          <div className="text-merciless-white text-sm mb-3">"{transcript}"</div>
          
          <div className="text-xs tracking-widest text-merciless-muted mb-2">IS THIS YOUR BIRTH DATE?</div>
          <div className="text-merciless-gold text-xl font-bold mb-1">
            {parsedDate.display}
          </div>
          
          {parsedDate.confidence !== 'high' && (
            <div className="text-xs text-merciless-muted mt-2">
              {parsedDate.interpretation}
            </div>
          )}
          
          <div className={`mt-2 text-xs px-2 py-1 rounded inline-block ${
            parsedDate.confidence === 'high' 
              ? 'bg-green-500/20 text-green-400' 
              : parsedDate.confidence === 'medium'
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {parsedDate.confidence === 'high' ? 'Confident match' : 
             parsedDate.confidence === 'medium' ? 'Please verify' : 'Low confidence'}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={rejectDate}
            className="flex-1 py-3 border border-merciless-border text-merciless-muted font-semibold text-sm rounded-lg hover:border-merciless-gold/30 hover:text-merciless-white transition-all"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={confirmDate}
            className="flex-1 py-3 bg-merciless-gold text-merciless-black font-bold text-sm rounded-lg hover:bg-merciless-gold/90 transition-all"
          >
            Yes, Confirm
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleRecording}
          disabled={state === 'processing'}
          className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all ${
            state === 'recording'
              ? 'bg-red-500 text-white'
              : state === 'processing'
              ? 'bg-merciless-card border border-merciless-border text-merciless-muted cursor-wait'
              : 'bg-merciless-card border border-merciless-border text-merciless-muted hover:border-merciless-gold/40 hover:text-merciless-gold'
          }`}
        >
          {state === 'recording' && (
            <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
          )}
          
          {state === 'processing' ? (
            <div className="w-6 h-6 border-2 border-merciless-gold border-t-transparent rounded-full animate-spin" />
          ) : state === 'recording' ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 relative z-10">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 relative z-10">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </button>

        <div className="flex-1">
          {state === 'recording' ? (
            <div>
              <div className="text-red-400 text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Recording... tap to stop
              </div>
              <div className="text-merciless-muted text-xs mt-1">
                Say your birth date clearly
              </div>
            </div>
          ) : state === 'processing' ? (
            <div>
              <div className="text-merciless-gold text-sm font-medium">
                Processing...
              </div>
              <div className="text-merciless-muted text-xs mt-1">
                Transcribing and verifying your date
              </div>
            </div>
          ) : value ? (
            <div>
              <div className="text-merciless-white text-sm">
                {new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <button 
                type="button"
                onClick={() => onChange('')}
                className="text-merciless-muted text-xs hover:text-merciless-gold transition-colors"
              >
                Change date
              </button>
            </div>
          ) : (
            <div>
              <div className="text-merciless-muted text-sm">
                Tap the mic and say your birth date
              </div>
              <div className="text-merciless-muted/60 text-xs mt-1">
                e.g. "July 3rd 1987" or "the 25th of December 1995"
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="text-merciless-danger text-xs bg-merciless-danger/10 border border-merciless-danger/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  )
}
