import { useState, useEffect } from 'react'
import { getSignAsset, type ZodiacSign } from '../lib/signAssets'

type BadgeSize = 'sm' | 'md' | 'lg' | 'xl'
type BadgeVariant = 'default' | 'glow' | 'minimal' | 'card'

interface SignBadgeProps {
  sign: string
  size?: BadgeSize
  variant?: BadgeVariant
  showName?: boolean
  showImage?: boolean
  className?: string
}

const sizeConfig: Record<BadgeSize, { 
  container: string
  emoji: string 
  name: string
  image: string
}> = {
  sm: {
    container: 'gap-1',
    emoji: 'text-base',
    name: 'text-[10px] tracking-wider',
    image: 'w-6 h-6',
  },
  md: {
    container: 'gap-1.5',
    emoji: 'text-xl',
    name: 'text-xs tracking-wider',
    image: 'w-10 h-10',
  },
  lg: {
    container: 'gap-2',
    emoji: 'text-3xl',
    name: 'text-sm tracking-widest',
    image: 'w-16 h-16',
  },
  xl: {
    container: 'gap-3',
    emoji: 'text-5xl',
    name: 'text-base tracking-widest',
    image: 'w-24 h-24',
  },
}

export default function SignBadge({ 
  sign, 
  size = 'md', 
  variant = 'default',
  showName = true,
  showImage = false,
  className = ''
}: SignBadgeProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const signAsset = getSignAsset(sign)
  const config = sizeConfig[size]

  useEffect(() => {
    if (showImage && signAsset?.image) {
      const img = new Image()
      img.onload = () => setImageLoaded(true)
      img.src = signAsset.image
    }
  }, [showImage, signAsset?.image])

  if (!signAsset) {
    return (
      <div className={`flex items-center ${config.container} ${className}`}>
        <span className={config.emoji}>☉</span>
        {showName && <span className={`text-merciless-muted font-medium ${config.name}`}>Unknown</span>}
      </div>
    )
  }

  // Minimal variant - just emoji and optional name inline
  if (variant === 'minimal') {
    return (
      <span className={`inline-flex items-center ${config.container} ${className}`}>
        <span className={config.emoji}>{signAsset.emoji}</span>
        {showName && (
          <span className={`text-merciless-muted font-medium ${config.name}`}>
            {signAsset.name}
          </span>
        )}
      </span>
    )
  }

  // Card variant - with background image
  if (variant === 'card') {
    return (
      <div 
        className={`relative overflow-hidden rounded-xl bg-merciless-card border border-merciless-border ${className}`}
        style={{ aspectRatio: '1' }}
      >
        {/* Background image */}
        {showImage && imageLoaded && (
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url(${signAsset.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-merciless-black/90 via-merciless-black/40 to-transparent" />
        
        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center p-4">
          <span 
            className={`${config.emoji} mb-2`}
            style={{ filter: 'drop-shadow(0 0 12px rgba(245,166,35,0.4))' }}
          >
            {signAsset.emoji}
          </span>
          {showName && (
            <span className={`text-merciless-gold font-bold uppercase ${config.name}`}>
              {signAsset.name}
            </span>
          )}
        </div>
      </div>
    )
  }

  // Glow variant - with animated glow effect
  if (variant === 'glow') {
    return (
      <div className={`flex flex-col items-center ${config.container} ${className}`}>
        <div className="relative">
          <span 
            className={`${config.emoji} relative z-10`}
            style={{ filter: 'drop-shadow(0 0 16px rgba(245,166,35,0.5))' }}
          >
            {signAsset.emoji}
          </span>
          {/* Animated glow ring */}
          <div 
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(245,166,35,0.2) 0%, transparent 70%)',
              transform: 'scale(2)',
            }}
          />
        </div>
        {showName && (
          <span className={`text-merciless-gold font-bold uppercase ${config.name}`}>
            {signAsset.name}
          </span>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={`flex items-center ${config.container} ${className}`}>
      {showImage && imageLoaded ? (
        <img 
          src={signAsset.image} 
          alt={signAsset.name}
          className={`${config.image} rounded-full object-cover border border-merciless-border`}
        />
      ) : (
        <span className={config.emoji}>{signAsset.emoji}</span>
      )}
      {showName && (
        <span className={`text-merciless-gold font-bold uppercase ${config.name}`}>
          {signAsset.name}
        </span>
      )}
    </div>
  )
}

// Convenience component for Big Three display
interface BigThreeBadgeProps {
  sunSign: string
  moonSign: string
  risingSign: string
  size?: BadgeSize
  className?: string
}

export function BigThreeBadge({ sunSign, moonSign, risingSign, size = 'sm', className = '' }: BigThreeBadgeProps) {
  const config = sizeConfig[size]
  const sunAsset = getSignAsset(sunSign)
  const moonAsset = getSignAsset(moonSign)
  const risingAsset = getSignAsset(risingSign)

  return (
    <div className={`flex items-center justify-center ${config.container} ${className}`}>
      {/* Sun */}
      <div className="flex items-center gap-1">
        <span className="text-merciless-gold">☉</span>
        <span className={config.emoji}>{sunAsset?.emoji || '☉'}</span>
        <span className={`text-merciless-muted ${config.name}`}>{sunSign}</span>
      </div>
      
      <span className="text-merciless-border mx-2">·</span>
      
      {/* Moon */}
      <div className="flex items-center gap-1">
        <span className="text-gray-300">☽</span>
        <span className={config.emoji}>{moonAsset?.emoji || '☽'}</span>
        <span className={`text-merciless-muted ${config.name}`}>{moonSign}</span>
      </div>
      
      <span className="text-merciless-border mx-2">·</span>
      
      {/* Rising */}
      <div className="flex items-center gap-1">
        <span className="text-purple-400">↑</span>
        <span className={config.emoji}>{risingAsset?.emoji || '↑'}</span>
        <span className={`text-merciless-muted ${config.name}`}>{risingSign}</span>
      </div>
    </div>
  )
}
