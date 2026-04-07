import { useRef, useState } from 'react'

interface DemoResult {
  sunSign: string
  brutalHeadline: string
  excerpt: string
  birthDate: string
}

interface DemoShareCardProps {
  result: DemoResult
  onBack: () => void
  onSignupClick: () => void
}

const signEmojis: Record<string, string> = {
  Aries: '♈',
  Taurus: '♉',
  Gemini: '♊',
  Cancer: '♋',
  Leo: '♌',
  Virgo: '♍',
  Libra: '♎',
  Scorpio: '♏',
  Sagittarius: '♐',
  Capricorn: '♑',
  Aquarius: '♒',
  Pisces: '♓',
}

export default function DemoShareCard({ result, onBack, onSignupClick }: DemoShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [shared, setShared] = useState(false)

  const handleShare = async () => {
    setSharing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current!, {
        backgroundColor: '#0A0A0B',
        scale: 2,
        logging: false,
        useCORS: true,
      })

      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'))
      const file = new File([blob], 'merciless-oracle.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ 
          files: [file], 
          title: 'The Oracle Spoke',
          text: `"${result.brutalHeadline}" — Get your reading at merciless.app`
        })
        setShared(true)
      } else {
        // Fallback to download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'merciless-oracle.png'
        a.click()
        URL.revokeObjectURL(url)
        setShared(true)
      }
    } catch (err) {
      console.error('Share failed:', err)
    } finally {
      setSharing(false)
    }
  }

  const signEmoji = signEmojis[result.sunSign] || '☉'
  const today = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-merciless-muted text-sm hover:text-merciless-white transition-colors mb-4"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
        </svg>
        Back to result
      </button>

      {/* Share Card Preview - 9:16 aspect ratio for Stories */}
      <div
        ref={cardRef}
        className="w-full mx-auto overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0A0A0B 0%, #111115 50%, #0A0A0B 100%)',
          border: '1px solid #1E1E24',
          borderRadius: '20px',
          padding: '40px 32px',
          fontFamily: 'Space Grotesk, sans-serif',
          aspectRatio: '9/16',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          maxWidth: '320px',
        }}
      >
        {/* Top: Logo area */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '10px', 
            color: '#6B6B7A', 
            letterSpacing: '4px', 
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            THE ORACLE SPOKE
          </div>
          <div style={{ fontSize: '11px', color: '#6B6B7A', letterSpacing: '2px' }}>
            {today}
          </div>
        </div>

        {/* Middle: Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px', padding: '20px 0' }}>
          {/* Sun sign badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>{signEmoji}</span>
            <span style={{ 
              color: '#F5A623', 
              fontSize: '14px', 
              fontWeight: '700', 
              letterSpacing: '3px',
              textTransform: 'uppercase'
            }}>
              {result.sunSign}
            </span>
          </div>

          {/* Headline */}
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#F5A623',
            lineHeight: 1.3,
            margin: 0,
            textAlign: 'center',
            padding: '0 8px',
          }}>
            "{result.brutalHeadline}"
          </h2>

          {/* Excerpt */}
          <p style={{
            fontSize: '13px',
            color: '#9B9B9B',
            lineHeight: 1.6,
            margin: 0,
            textAlign: 'center',
            padding: '0 8px',
          }}>
            {result.excerpt}
          </p>
        </div>

        {/* Bottom: CTA + watermark */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(90deg, transparent, #F5A623, transparent)',
            height: '1px',
            marginBottom: '20px',
            opacity: 0.3,
          }} />
          <div style={{ 
            fontSize: '11px', 
            color: '#6B6B7A', 
            marginBottom: '8px',
            letterSpacing: '1px'
          }}>
            Get your full chart reading at
          </div>
          <div style={{ 
            fontSize: '16px', 
            color: '#F5A623', 
            letterSpacing: '3px', 
            fontWeight: '700' 
          }}>
            merciless.app
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <button
          onClick={handleShare}
          disabled={sharing}
          className={`w-full py-3.5 font-bold text-sm tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
            shared 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-merciless-gold text-merciless-black hover:bg-merciless-gold/90'
          }`}
        >
          {sharing ? (
            <>
              <div className="w-4 h-4 border-2 border-merciless-black border-t-transparent rounded-full animate-spin" />
              GENERATING...
            </>
          ) : shared ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
              SHARED!
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.474l6.733-3.367A2.52 2.52 0 0113 4.5z" />
              </svg>
              SHARE TO STORIES
            </>
          )}
        </button>

        <button
          onClick={onSignupClick}
          className="w-full py-3 border border-merciless-gold/40 text-merciless-gold font-semibold text-sm rounded-lg hover:bg-merciless-gold/10 transition-all"
        >
          GET YOUR FULL READING
        </button>
      </div>

      {/* Hint */}
      <p className="mt-4 text-center text-merciless-muted text-xs">
        Screenshot or share directly to Instagram, TikTok, or X
      </p>
    </div>
  )
}
