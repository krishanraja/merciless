import { useRef, useState, useEffect } from 'react'
import { getSignAsset, LOGO_PATHS } from '../lib/signAssets'

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

export default function DemoShareCard({ result, onBack, onSignupClick }: DemoShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [shared, setShared] = useState(false)
  const [copied, setCopied] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const signAsset = getSignAsset(result.sunSign)
  const signImage = signAsset?.image || '/signs/aries.png'
  const signEmoji = signAsset?.emoji || '☉'

  // Preload the sign image
  useEffect(() => {
    const img = new Image()
    img.onload = () => setImageLoaded(true)
    img.src = signImage
  }, [signImage])

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
          text: `"${result.brutalHeadline}" - Get your reading at merciless.app`
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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText('https://merciless.app')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = 'https://merciless.app'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const today = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  })

  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

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
        className="w-full mx-auto overflow-hidden relative"
        style={{
          background: '#0A0A0B',
          borderRadius: '20px',
          aspectRatio: '9/16',
          maxWidth: '320px',
        }}
      >
        {/* Background sign image with overlay */}
        {imageLoaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${signImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.15,
              filter: 'blur(2px)',
            }}
          />
        )}
        
        {/* Gradient overlays for depth */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(10,10,11,0.9) 0%, rgba(10,10,11,0.4) 30%, rgba(10,10,11,0.4) 70%, rgba(10,10,11,0.95) 100%)',
          }}
        />
        
        {/* Radial glow effect */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(245,166,35,0.08) 0%, transparent 60%)',
          }}
        />

        {/* Content container */}
        <div
          style={{
            position: 'relative',
            height: '100%',
            padding: '40px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontFamily: 'Space Grotesk, sans-serif',
          }}
        >
          {/* Top: Date and Oracle badge */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '9px', 
              color: '#6B6B7A', 
              letterSpacing: '4px', 
              textTransform: 'uppercase',
              marginBottom: '6px'
            }}>
              THE ORACLE SPOKE
            </div>
            <div style={{ fontSize: '10px', color: '#6B6B7A', letterSpacing: '2px' }}>
              {today}
            </div>
          </div>

          {/* Middle: Main content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px', padding: '24px 0' }}>
            {/* Sun sign badge */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              gap: '8px' 
            }}>
              <span style={{ 
                fontSize: '48px',
                filter: 'drop-shadow(0 0 20px rgba(245,166,35,0.4))',
              }}>
                {signEmoji}
              </span>
              <span style={{ 
                color: '#F5A623', 
                fontSize: '13px', 
                fontWeight: '700', 
                letterSpacing: '4px',
                textTransform: 'uppercase'
              }}>
                {result.sunSign}
              </span>
            </div>

            {/* Headline */}
            <h2 style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#F5A623',
              lineHeight: 1.35,
              margin: 0,
              textAlign: 'center',
              padding: '0 4px',
              textShadow: '0 2px 20px rgba(245,166,35,0.3)',
            }}>
              "{result.brutalHeadline}"
            </h2>

            {/* Excerpt */}
            <p style={{
              fontSize: '12px',
              color: '#9B9B9B',
              lineHeight: 1.7,
              margin: 0,
              textAlign: 'center',
              padding: '0 8px',
              fontStyle: 'italic',
            }}>
              {result.excerpt}
            </p>
          </div>

          {/* Bottom: Logo and CTA */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: 'linear-gradient(90deg, transparent, rgba(245,166,35,0.4), transparent)',
              height: '1px',
              marginBottom: '20px',
            }} />
            
            {/* Logo image */}
            <img 
              src={LOGO_PATHS.orange}
              alt="Merciless"
              style={{
                height: '28px',
                margin: '0 auto 12px',
                display: 'block',
              }}
              crossOrigin="anonymous"
            />
            
            <div style={{ 
              fontSize: '10px', 
              color: '#6B6B7A', 
              letterSpacing: '1px'
            }}>
              Get your full chart reading
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3">
        {/* Primary share button */}
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
              {isMobile ? 'SHARED!' : 'DOWNLOADED!'}
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.474l6.733-3.367A2.52 2.52 0 0113 4.5z" />
              </svg>
              SHARE
            </>
          )}
        </button>

        {/* Platform hint icons */}
        <div className="flex items-center justify-center gap-4 py-2">
          {/* Instagram */}
          <svg className="w-5 h-5 text-merciless-muted" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          {/* TikTok */}
          <svg className="w-5 h-5 text-merciless-muted" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
          </svg>
          {/* X/Twitter */}
          <svg className="w-5 h-5 text-merciless-muted" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </div>

        {/* Secondary actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCopyLink}
            className={`flex-1 py-3 border font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2 ${
              copied
                ? 'border-green-500/30 text-green-400 bg-green-500/10'
                : 'border-merciless-border text-merciless-muted hover:border-merciless-gold/30 hover:text-merciless-white'
            }`}
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                COPIED!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
                  <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
                </svg>
                COPY LINK
              </>
            )}
          </button>
          <button
            onClick={onSignupClick}
            className="flex-1 py-3 border border-merciless-gold/40 text-merciless-gold font-semibold text-sm rounded-lg hover:bg-merciless-gold/10 transition-all"
          >
            GET FULL READING
          </button>
        </div>
      </div>

      {/* Desktop hint */}
      {!isMobile && (
        <div className="mt-4 p-3 bg-merciless-card border border-merciless-border rounded-lg">
          <p className="text-center text-merciless-muted text-xs">
            <span className="text-merciless-gold">Desktop?</span> Click "Share" to download the image, then upload it to your Stories manually.
          </p>
        </div>
      )}
    </div>
  )
}
