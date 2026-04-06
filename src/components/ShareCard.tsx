import { useRef, useState } from 'react'
import { getMoonPhaseEmoji } from '../lib/astrology'

interface ShareCardData {
  brutalHeadline: string
  excerpt: string
  sunSign: string
  moonSign: string
  risingSign: string
  date: string
  moonPhase?: string
}

interface ShareCardProps {
  data: ShareCardData
}

export default function ShareCard({ data }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)

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
      const file = new File([blob], 'merciless-reading.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Merciless Reading' })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'merciless-reading.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Share failed:', err)
    } finally {
      setSharing(false)
    }
  }

  const moonEmoji = getMoonPhaseEmoji(data.moonPhase || 'full')

  return (
    <div className="space-y-4">
      {/* Preview Card */}
      <div
        ref={cardRef}
        className="w-full max-w-sm mx-auto"
        style={{
          background: '#0A0A0B',
          border: '1px solid #1E1E24',
          borderRadius: '16px',
          padding: '32px',
          fontFamily: 'Space Grotesk, sans-serif',
          aspectRatio: '9/16',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Top: Signs row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#F5A623', fontSize: '14px' }}>☉</span>
            <span style={{ color: '#6B6B7A', fontSize: '12px' }}>{data.sunSign}</span>
          </div>
          <span style={{ color: '#1E1E24' }}>·</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#C0C0C0', fontSize: '14px' }}>☽</span>
            <span style={{ color: '#6B6B7A', fontSize: '12px' }}>{data.moonSign}</span>
          </div>
          <span style={{ color: '#1E1E24' }}>·</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#9D4EDD', fontSize: '14px' }}>↑</span>
            <span style={{ color: '#6B6B7A', fontSize: '12px' }}>{data.risingSign}</span>
          </div>
        </div>

        {/* Middle: Headline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
          <div style={{ fontSize: '11px', color: '#6B6B7A', letterSpacing: '3px', textTransform: 'uppercase' }}>
            {data.date}
          </div>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#F5A623',
            lineHeight: 1.2,
            margin: 0,
          }}>
            {data.brutalHeadline}
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#9B9B9B',
            lineHeight: 1.6,
            margin: 0,
          }}>
            {data.excerpt}
          </p>
        </div>

        {/* Bottom: Moon + watermark */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '20px' }}>{moonEmoji}</span>
          <span style={{ fontSize: '12px', color: '#F5A623', letterSpacing: '2px', fontWeight: '600' }}>
            merciless.app
          </span>
        </div>
      </div>

      <button
        onClick={handleShare}
        disabled={sharing}
        className="w-full max-w-sm mx-auto block py-3 border border-merciless-gold/40 text-merciless-gold hover:bg-merciless-gold hover:text-merciless-black font-semibold text-sm tracking-wider transition-all rounded-lg disabled:opacity-50"
      >
        {sharing ? 'GENERATING...' : 'SHARE READING'}
      </button>
    </div>
  )
}
