import { useState, useEffect } from 'react'
import DemoShareCard from './DemoShareCard'
import { getSignAsset } from '../lib/signAssets'

interface DemoResult {
  sunSign: string
  brutalHeadline: string
  excerpt: string
  birthDate: string
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

        {/* Teaser for full reading */}
        <div className={`mt-6 pt-6 border-t border-merciless-border text-center transition-all duration-500 delay-300 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-merciless-muted text-xs">
            This is just your Sun sign. Your full chart includes Moon, Rising, 
            <br className="hidden sm:block" />
            transits, and what the Oracle <em>really</em> wants to tell you.
          </p>
        </div>
      </div>
    </div>
  )
}
