import { useState, useEffect } from 'react'
import DemoShareCard from './DemoShareCard'
import { getSignAsset } from '../lib/signAssets'
import { supabase } from '../lib/supabase'
import { getAttribution } from '../lib/attribution'

interface DemoResult {
  sunSign: string
  brutalHeadline: string
  excerpt: string
  birthDate: string
  slug?: string
}

interface DemoResultCardProps {
  result: DemoResult
  onReset: () => void
  onSignupClick: () => void
}

export default function DemoResultCard({ result, onReset, onSignupClick }: DemoResultCardProps) {
  const [displayedHeadline, setDisplayedHeadline] = useState('')
  const [showExcerpt, setShowExcerpt] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [showShareCard, setShowShareCard] = useState(false)
  const [leadEmail, setLeadEmail] = useState('')
  const [leadSent, setLeadSent] = useState(false)
  const [leadBusy, setLeadBusy] = useState(false)

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadEmail || leadBusy) return
    setLeadBusy(true)
    try {
      await supabase.functions.invoke('capture-lead', {
        body: { email: leadEmail, mcl_cid: getAttribution()?.mcl_cid, sun_sign: result.sunSign, birth_date: result.birthDate },
      })
    } catch { /* swallow */ } finally { setLeadSent(true); setLeadBusy(false) }
  }

  // Typewriter effect for headline
  useEffect(() => {
    let index = 0
    const headline = result.brutalHeadline
    
    const timer = setInterval(() => {
      if (index <= headline.length) {
        setDisplayedHeadline(headline.slice(0, index))
        index++
      } else {
        clearInterval(timer)
        // Show excerpt after headline completes
        setTimeout(() => setShowExcerpt(true), 300)
        setTimeout(() => setShowActions(true), 600)
      }
    }, 35) // Speed of typing

    return () => clearInterval(timer)
  }, [result.brutalHeadline])

  const signAsset = getSignAsset(result.sunSign)
  const signEmoji = signAsset?.emoji || '☉'

  if (showShareCard) {
    return (
      <DemoShareCard
        result={result}
        onBack={() => setShowShareCard(false)}
        onSignupClick={onSignupClick}
      />
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-merciless-card border border-merciless-border rounded-2xl p-6 md:p-8 overflow-hidden">
        {/* Sun Sign Badge */}
        <div className="flex items-center justify-center gap-2 mb-6 opacity-0 animate-fade-slide-up" style={{ animationDelay: '0ms' }}>
          <span className="text-2xl">{signEmoji}</span>
          <span className="text-merciless-gold font-bold tracking-widest text-sm">
            {result.sunSign.toUpperCase()}
          </span>
        </div>

        {/* Brutal Headline with typewriter effect */}
        <div className="min-h-[80px] md:min-h-[100px] flex items-center justify-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-merciless-gold text-center leading-snug">
            "{displayedHeadline}
            <span className="inline-block w-0.5 h-5 md:h-6 bg-merciless-gold ml-0.5 animate-pulse" 
                  style={{ opacity: displayedHeadline.length === result.brutalHeadline.length ? 0 : 1 }} />
            "
          </h2>
        </div>

        {/* Excerpt */}
        <div className={`transition-all duration-500 ${showExcerpt ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-merciless-muted text-sm text-center leading-relaxed mb-6">
            {result.excerpt}
          </p>
        </div>

        {/* Actions */}
        <div className={`space-y-3 transition-all duration-500 ${showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Primary CTA */}
          <button
            onClick={onSignupClick}
            className="w-full py-3.5 bg-merciless-gold text-merciless-black font-bold text-sm tracking-wider rounded-lg hover:bg-merciless-gold/90 transition-all animate-pulse-gold"
          >
            GET YOUR FULL READING
          </button>

          {/* Secondary actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowShareCard(true)}
              className="flex-1 py-3 border border-merciless-gold/40 text-merciless-gold font-semibold text-sm rounded-lg hover:bg-merciless-gold/10 transition-all flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.474l6.733-3.367A2.52 2.52 0 0113 4.5z" />
              </svg>
              SHARE
            </button>
            <button
              onClick={onReset}
              className="flex-1 py-3 border border-merciless-border text-merciless-muted font-semibold text-sm rounded-lg hover:border-merciless-gold/30 hover:text-merciless-white transition-all"
            >
              TRY ANOTHER
            </button>
          </div>
        </div>

        {/* Consented re-engagement opt-in (the chart reaching out) */}
        <div className={`mt-6 pt-6 border-t border-merciless-border transition-all duration-500 delay-300 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
          {leadSent ? (
            <p className="text-merciless-muted text-xs text-center">Done. The chart will reach out when it goes loud. One tap to stop, any time.</p>
          ) : (
            <form onSubmit={submitLead} className="space-y-2">
              <p className="text-merciless-muted text-xs text-center">Not ready to sign up? I will tell you when your chart goes loud.</p>
              <div className="flex gap-2">
                <input
                  type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="you@example.com"
                  className="flex-1 bg-merciless-black border border-merciless-border rounded-lg px-3 py-2 text-merciless-white text-xs focus:border-merciless-gold focus:ring-1 focus:ring-merciless-gold"
                />
                <button type="submit" disabled={!leadEmail || leadBusy} className="px-3 py-2 border border-merciless-gold/40 text-merciless-gold text-xs font-semibold rounded-lg hover:bg-merciless-gold/10 transition-all disabled:opacity-40">
                  {leadBusy ? '...' : 'NOTIFY ME'}
                </button>
              </div>
              <p className="text-merciless-muted/60 text-[10px] text-center">You are asking the chart to email you when a real transit hits. Never a sales push. One tap to stop.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
