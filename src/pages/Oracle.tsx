import { Link } from 'react-router-dom'
import { useOracle } from '../hooks/useOracle'
import { useSubscription } from '../hooks/useSubscription'
import OracleChat from '../components/OracleChat'

const NAV_LINKS = [
  { path: '/reading', label: 'READING' },
  { path: '/chart', label: 'CHART' },
  { path: '/oracle', label: 'ORACLE' },
  { path: '/settings', label: 'SETTINGS' },
]

export default function Oracle() {
  const { messages, loading, error, sendMessage, startNewConversation } = useOracle()
  const { isPro, upgradeToPro, upgrading } = useSubscription()

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <nav className="border-b border-merciless-border px-6 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/reading">
            <img src="/merciless%20orange%20icon.png" alt="Merciless" className="h-7 w-7" />
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.path}
                to={l.path}
                className={`text-xs tracking-widest font-medium transition-colors ${
                  l.path === '/oracle' ? 'text-merciless-gold' : 'text-merciless-muted hover:text-merciless-gold'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="md:hidden flex gap-4">
            {NAV_LINKS.map((l) => (
              <Link key={l.path} to={l.path} className="text-xs text-merciless-muted hover:text-merciless-gold transition-colors">
                {l.label.slice(0, 1)}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 flex flex-col" style={{ minHeight: 'calc(100vh - 65px)' }}>
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-merciless-white">The Oracle</h1>
            <p className="text-merciless-muted text-sm mt-1">
              Your natal chart, personified. Ask it anything.
            </p>
          </div>
          {isPro && messages.length > 0 && (
            <button
              onClick={startNewConversation}
              className="text-xs tracking-widest text-merciless-muted border border-merciless-border px-4 py-2 rounded-lg hover:border-merciless-gold/30 hover:text-merciless-white transition-all"
            >
              NEW
            </button>
          )}
        </div>

        {!isPro ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="merciless-card p-10 text-center max-w-md w-full space-y-6" style={{ borderColor: 'rgba(123,47,190,0.3)' }}>
              <div className="text-5xl text-merciless-gold">☽</div>
              <div>
                <h2 className="text-merciless-white font-bold text-xl mb-3">The Oracle requires Pro</h2>
                <p className="text-merciless-muted text-sm leading-relaxed">
                  The Oracle speaks from your natal chart with absolute authority. Ask about patterns, wounds, timing, decisions. It doesn't hedge.
                </p>
              </div>

              <div className="space-y-3 text-sm text-left">
                {[
                  '"Why do I keep self-sabotaging in relationships?"',
                  '"What is my biggest blind spot right now?"',
                  '"Is this the right time to make this move?"',
                ].map((q) => (
                  <div key={q} className="text-merciless-muted text-xs bg-merciless-black border border-merciless-border rounded-lg px-4 py-3 italic">
                    {q}
                  </div>
                ))}
              </div>

              <button
                onClick={upgradeToPro}
                disabled={upgrading}
                className="w-full py-4 bg-merciless-violet text-white font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-violet-light transition-all disabled:opacity-50"
              >
                {upgrading ? 'REDIRECTING...' : 'UNLOCK THE ORACLE — $4.99/mo'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 text-merciless-danger text-sm bg-merciless-danger/10 border border-merciless-danger/20 rounded-lg px-4 py-3 flex-shrink-0">
                {error}
              </div>
            )}
            <div className="flex-1 flex flex-col">
              <OracleChat
                messages={messages}
                onSend={sendMessage}
                loading={loading}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
