import { useState } from 'react'
import AuthModal from '../components/AuthModal'

export default function Landing() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'signin' | 'signup'>('signup')

  return (
    <>
      <div className="landing-viewport relative z-10">
        {/* Nav */}
        <nav className="shrink-0 px-5 py-3 md:py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
          <img src="/merciless%20orange%20icon.png" alt="Merciless" className="h-7 w-7" />
          <button
            onClick={() => { setModalMode('signin'); setModalOpen(true) }}
            className="text-merciless-muted text-sm hover:text-merciless-white transition-colors"
          >
            Sign in
          </button>
        </nav>

        {/* Hero — single viewport, no scroll */}
        <main className="flex-1 min-h-0 flex flex-col items-center justify-center px-5 md:px-8">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto gap-4 sm:gap-5 md:gap-6">

            {/* Logo */}
            <div className="opacity-0 animate-fade-slide-up" style={{ animationDelay: '0ms' }}>
              <img
                src="/merciless%20orange%20logo.png"
                alt="Merciless"
                className="h-28 sm:h-32 md:h-40 lg:h-72 mx-auto"
              />
            </div>

            {/* Pill badge */}
            <div className="opacity-0 animate-fade-slide-up" style={{ animationDelay: '150ms' }}>
              <div className="inline-block text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] text-merciless-muted border border-merciless-border rounded-full px-4 py-1.5 sm:px-5 sm:py-2 pill-glow">
                NATAL CHART · DAILY TRANSITS · THE ORACLE
              </div>
            </div>

            {/* Heading */}
            <div className="opacity-0 animate-fade-slide-up" style={{ animationDelay: '300ms' }}>
              <h1 className="text-[1.65rem] leading-snug sm:text-3xl md:text-4xl lg:text-5xl font-bold text-merciless-white md:leading-tight">
                Your chart has always<br />
                <span className="text-gold-shimmer">known things about you</span><br />
                that you haven't been<br />
                willing to hear.
              </h1>
            </div>

            {/* Subtitle */}
            <div className="opacity-0 animate-fade-slide-up" style={{ animationDelay: '450ms' }}>
              <p className="text-merciless-muted text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                Daily readings from your actual natal chart. No generalizations. No comfort. Just what the chart says.
              </p>
            </div>

            {/* CTA */}
            <div className="opacity-0 animate-fade-slide-up pt-1 sm:pt-2" style={{ animationDelay: '600ms' }}>
              <button
                onClick={() => { setModalMode('signup'); setModalOpen(true) }}
                className="px-8 sm:px-10 py-3 sm:py-3.5 bg-merciless-gold text-merciless-black font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-gold/90 transition-all animate-pulse-gold"
              >
                GET YOUR READING
              </button>
            </div>

            {/* Social proof */}
            <div className="opacity-0 animate-fade-slide-up" style={{ animationDelay: '750ms' }}>
              <div className="flex items-center gap-4 sm:gap-6 text-xs text-merciless-muted">
                <div>
                  <span className="text-merciless-white font-semibold">4,200+</span> charts calculated
                </div>
                <div className="w-px h-3 bg-merciless-border" />
                <div>
                  <span className="text-merciless-white font-semibold">Daily</span> readings from your actual chart
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialMode={modalMode}
      />
    </>
  )
}
