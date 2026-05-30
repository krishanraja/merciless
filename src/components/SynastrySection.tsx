import { useState } from 'react'
import { supabase, extractFunctionErrorMessage } from '../lib/supabase'
import { trackEvent } from '../lib/attribution'

interface SynastryResponse {
  success: boolean
  headline: string
  dynamic: string
  the_other: string
  sun_a: string
  sun_b: string
  share_slug?: string
  error?: string
}

interface SynastrySectionProps {
  onSignupClick: () => void
}

const RELATIONSHIPS = ['partner', 'ex', 'crush', 'situationship', 'friend', 'family', 'boss', 'coworker']

export default function SynastrySection({ onSignupClick }: SynastrySectionProps) {
  const [you, setYou] = useState('')
  const [them, setThem] = useState('')
  const [relationship, setRelationship] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'result' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SynastryResponse | null>(null)
  const [copied, setCopied] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!you || !them) return
    setState('loading')
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke<SynastryResponse>('synastry', {
        body: { person_a: you, person_b: them, relationship: relationship || undefined },
      })
      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError, 'The Oracle could not read this pairing. Try again.'))
      if (!data?.success) throw new Error(data?.error || 'Could not read the relationship.')
      setResult(data)
      setState('result')
      void trackEvent('synastry_pair_minted', { metadata: { sun_a: data.sun_a, sun_b: data.sun_b, slug: data.share_slug } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setState('error')
    }
  }

  const shareUrl = result?.share_slug ? `https://merciless.app/v/${result.share_slug}` : 'https://merciless.app'
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      void trackEvent('share_card_created', { metadata: { slug: result?.share_slug, kind: 'synastry' } })
    } catch { /* ignore */ }
  }

  const reset = () => { setState('idle'); setResult(null); setError(null) }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="text-xs tracking-[0.3em] text-merciless-violet-light mb-2">READ A RELATIONSHIP</div>
        <p className="text-merciless-muted text-sm">
          Two birth dates. One brutal verdict on what actually happens between you.
        </p>
      </div>

      {state === 'result' && result ? (
        <div className="bg-merciless-card border border-merciless-border rounded-2xl p-6 md:p-8 space-y-5 animate-fade-in">
          <div className="text-xs tracking-widest text-merciless-muted">{result.sun_a} &times; {result.sun_b}</div>
          <h3 className="text-xl md:text-2xl font-bold text-merciless-gold leading-snug">{result.headline}</h3>
          <p className="text-merciless-white text-sm leading-relaxed">{result.dynamic}</p>

          {/* The half about THEM is teased. Revealing it is the signup ask. */}
          <div className="relative rounded-lg border border-merciless-border overflow-hidden">
            <p className="text-merciless-white text-sm leading-relaxed p-4 blur-sm select-none" aria-hidden="true">
              {result.the_other || 'What they bring to this, and the part they will not want to hear, is in the full reading.'}
            </p>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-merciless-black/60 backdrop-blur-[2px] gap-2 px-4 text-center">
              <span className="text-xs text-merciless-muted">What they bring is for them to read.</span>
              <button onClick={onSignupClick} className="px-5 py-2 bg-merciless-violet text-white text-xs font-bold tracking-widest rounded-lg hover:bg-merciless-violet-light transition-colors">
                UNLOCK THEIR HALF
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={copyLink} className="flex-1 py-2.5 bg-merciless-gold text-merciless-black font-bold text-xs tracking-widest rounded-lg hover:bg-merciless-gold/90 transition-all">
              {copied ? 'LINK COPIED' : 'SHARE THIS'}
            </button>
            <button onClick={reset} className="px-4 py-2.5 border border-merciless-border text-merciless-muted text-xs rounded-lg hover:text-merciless-white transition-colors">
              AGAIN
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-merciless-card border border-merciless-border rounded-2xl p-6 md:p-8">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-[10px] tracking-widest text-merciless-muted block mb-1.5">YOUR BIRTH DATE</label>
              <input type="date" value={you} onChange={(e) => setYou(e.target.value)} required max={new Date().toISOString().split('T')[0]} min="1900-01-01"
                className="w-full bg-merciless-black border border-merciless-border rounded-lg px-3 py-2.5 text-merciless-white text-sm focus:border-merciless-violet focus:ring-1 focus:ring-merciless-violet" />
            </div>
            <div>
              <label className="text-[10px] tracking-widest text-merciless-muted block mb-1.5">THEIR BIRTH DATE</label>
              <input type="date" value={them} onChange={(e) => setThem(e.target.value)} required max={new Date().toISOString().split('T')[0]} min="1900-01-01"
                className="w-full bg-merciless-black border border-merciless-border rounded-lg px-3 py-2.5 text-merciless-white text-sm focus:border-merciless-violet focus:ring-1 focus:ring-merciless-violet" />
            </div>
            <div>
              <label className="text-[10px] tracking-widest text-merciless-muted block mb-1.5">WHO ARE THEY (OPTIONAL)</label>
              <select value={relationship} onChange={(e) => setRelationship(e.target.value)}
                className="w-full bg-merciless-black border border-merciless-border rounded-lg px-3 py-2.5 text-merciless-white text-sm focus:border-merciless-violet focus:ring-1 focus:ring-merciless-violet">
                <option value="">Someone</option>
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {error && <div className="text-merciless-danger text-xs bg-merciless-danger/10 border border-merciless-danger/20 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" disabled={!you || !them || state === 'loading'}
              className="w-full py-3 bg-merciless-violet text-white font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-violet-light transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {state === 'loading' ? 'READING THE CHARTS...' : 'READ US'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
