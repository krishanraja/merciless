import { useOracle } from '../hooks/useOracle'
import { useSubscription } from '../hooks/useSubscription'
import OracleChat from '../components/OracleChat'
import AppNav from '../components/AppNav'

export default function Oracle() {
  const { messages, loading, error, sendMessage, startNewConversation, clearError } = useOracle()
  const { isPro, upgradeToPro, upgrading } = useSubscription()

  const handleSend = async (message: string) => {
    if (error) clearError()
    await sendMessage(message)
  }

  return (
    <div className={`relative z-10 ${!isPro ? 'reading-viewport-lock' : 'min-h-screen flex flex-col pb-16 md:pb-0'}`}>
      <AppNav />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 flex flex-col">
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

              <div className="space-y-2">
                <button
                  onClick={upgradeToPro}
                  disabled={upgrading}
                  className="w-full px-6 py-4 bg-merciless-violet text-white font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-violet-light transition-all disabled:opacity-50"
                >
                  {upgrading ? 'REDIRECTING...' : 'UNLOCK THE ORACLE'}
                </button>
                <div className="text-merciless-muted text-xs">$4.99/mo · cancel anytime</div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div
                role="alert"
                className="mb-4 text-merciless-danger text-sm bg-merciless-danger/10 border border-merciless-danger/20 rounded-lg px-4 py-3 flex items-start justify-between gap-3 flex-shrink-0"
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={clearError}
                  aria-label="Dismiss error"
                  className="text-merciless-danger/70 hover:text-merciless-danger text-lg leading-none"
                >
                  &times;
                </button>
              </div>
            )}
            <div className="flex-1 flex flex-col">
              <OracleChat
                messages={messages}
                onSend={handleSend}
                loading={loading}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
