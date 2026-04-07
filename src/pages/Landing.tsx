import { useState, useRef } from 'react'
import AuthModal from '../components/AuthModal'
import TryMeSection from '../components/TryMeSection'

export default function Landing() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'signin' | 'signup'>('signup')
  const tryMeRef = useRef<HTMLDivElement>(null)

  const scrollToTryMe = () => {
    tryMeRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSignupClick = () => {
    setModalMode('signup')
    setModalOpen(true)
  }

  return (
    <>
      <div className="min-h-screen relative z-10">
        {/* Nav - fixed */}
        <nav className="sticky top-0 z-20 bg-merciless-black/80 backdrop-blur-md border-b border-merciless-border/50 px-5 py-3 md:py-4">
          <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
            <img src="/merciless%20orange%20icon.png" alt="Merciless" className="h-7 w-7" />
            <button
              onClick={() => { setModalMode('signin'); setModalOpen(true) }}
              className="text-merciless-muted text-sm hover:text-merciless-white transition-colors"
            >
              Sign in
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="min-h-[calc(100vh-60px)] flex flex-col items-center justify-center px-5 md:px-8 py-12">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto gap-4 sm:gap-5 md:gap-6">

            {/* Logo */}
            <div className="opacity-0 animate-fade-slide-up" style={{ animationDelay: '0ms' }}>
              <img
                src="/merciless%20orange%20logo.png"
                alt="Merciless"
                className="h-24 sm:h-28 md:h-36 lg:h-48 mx-auto"
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
              <h1 className="text-[1.5rem] leading-snug sm:text-2xl md:text-3xl lg:text-4xl font-bold text-merciless-white md:leading-tight">
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

            {/* CTA - now scrolls to Try Me */}
            <div className="opacity-0 animate-fade-slide-up pt-1 sm:pt-2" style={{ animationDelay: '600ms' }}>
              <button
                onClick={scrollToTryMe}
                className="px-8 sm:px-10 py-3 sm:py-3.5 bg-merciless-gold text-merciless-black font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-gold/90 transition-all animate-pulse-gold"
              >
                TRY THE ORACLE
              </button>
            </div>

            {/* Scroll indicator */}
            <div className="opacity-0 animate-fade-slide-up mt-8" style={{ animationDelay: '900ms' }}>
              <button 
                onClick={scrollToTryMe}
                className="text-merciless-muted hover:text-merciless-gold transition-colors animate-bounce"
                aria-label="Scroll to try demo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

          </div>
        </section>

        {/* Try Me Section */}
        <section 
          ref={tryMeRef}
          className="min-h-screen flex flex-col items-center justify-center px-5 md:px-8 py-16 md:py-24 border-t border-merciless-border/30"
        >
          <TryMeSection onSignupClick={handleSignupClick} />
        </section>

        {/* Final CTA Section */}
        <section className="py-16 md:py-24 px-5 md:px-8 border-t border-merciless-border/30">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl md:text-2xl font-bold text-merciless-white mb-4">
              Ready for the full truth?
            </h2>
            <p className="text-merciless-muted text-sm md:text-base mb-6 max-w-md mx-auto">
              Your Sun sign is just the surface. Get your complete natal chart, daily transits, and access to The Oracle.
            </p>
            <button
              onClick={handleSignupClick}
              className="px-8 sm:px-10 py-3 sm:py-3.5 bg-merciless-gold text-merciless-black font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-gold/90 transition-all"
            >
              GET YOUR FULL READING
            </button>
            
            {/* Social proof */}
            <div className="mt-8 flex items-center justify-center gap-4 sm:gap-6 text-xs text-merciless-muted">
              <div>
                <span className="text-merciless-white font-semibold">4,200+</span> charts calculated
              </div>
              <div className="w-px h-3 bg-merciless-border" />
              <div>
                <span className="text-merciless-white font-semibold">Daily</span> readings from your actual chart
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-5 border-t border-merciless-border/30 text-center">
          <p className="text-merciless-muted text-xs">
            © {new Date().getFullYear()} Merciless. The Oracle speaks truth, not comfort.
          </p>
        </footer>
      </div>

      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialMode={modalMode}
      />
    </>
  )
}
