import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface OracleChatProps {
  conversationId?: string
  messages: Message[]
  onSend: (message: string) => Promise<void>
  loading: boolean
}

const EXAMPLE_PROMPTS = [
  "Why do I keep self-sabotaging in relationships?",
  "What is my biggest blind spot?",
  "Should I take this risk right now?",
  "Why can't I commit to things?",
]

export default function OracleChat({ messages, onSend, loading }: OracleChatProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    await onSend(msg)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-merciless-muted text-sm">Try asking:</p>
            <div className="grid grid-cols-1 gap-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt) }}
                  className="text-left text-sm bg-merciless-card border border-merciless-border hover:border-merciless-gold/40 rounded-lg px-4 py-3 text-merciless-muted hover:text-merciless-white transition-all"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 mr-3 mt-1">
                <div className="w-7 h-7 rounded-full bg-merciless-gold/10 border border-merciless-gold/30 flex items-center justify-center text-merciless-gold text-xs">
                  ☽
                </div>
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-merciless-violet/20 border border-merciless-violet/30 text-merciless-white'
                  : 'bg-merciless-card border border-merciless-border text-merciless-white'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex-shrink-0 mr-3 mt-1">
              <div className="w-7 h-7 rounded-full bg-merciless-gold/10 border border-merciless-gold/30 flex items-center justify-center text-merciless-gold text-xs">
                ☽
              </div>
            </div>
            <div className="bg-merciless-card border border-merciless-border rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-merciless-gold animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-merciless-gold animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-merciless-gold animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-3 pt-4 border-t border-merciless-border">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your chart anything..."
          className="flex-1 bg-merciless-card border border-merciless-border rounded-lg px-4 py-3 text-merciless-white placeholder-merciless-muted text-sm focus:outline-none focus:border-merciless-gold/50 transition-colors"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-5 py-3 bg-merciless-gold text-merciless-black font-semibold rounded-lg text-sm disabled:opacity-40 hover:bg-merciless-gold/90 transition-all"
        >
          →
        </button>
      </form>
    </div>
  )
}
