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
  { text: "Why do I keep self-sabotaging in relationships?", icon: "💔" },
  { text: "What is my biggest blind spot?", icon: "👁" },
  { text: "Should I take this risk right now?", icon: "⚡" },
  { text: "Why can't I commit to things?", icon: "🔗" },
]

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function OracleChat({ messages, onSend, loading }: OracleChatProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            {/* Welcome message */}
            <div className="flex justify-start">
              <div className="flex-shrink-0 mr-3 mt-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-merciless-gold/20 to-merciless-violet/20 border border-merciless-gold/30 flex items-center justify-center">
                  <span className="text-merciless-gold text-sm">☽</span>
                </div>
              </div>
              <div className="max-w-[85%] bg-merciless-card border border-merciless-border rounded-xl px-4 py-3">
                <p className="text-merciless-white text-sm leading-relaxed">
                  I am The Oracle. I speak from your natal chart with absolute authority. 
                  Ask me about your patterns, your wounds, your timing, your decisions. 
                  I do not hedge. I do not comfort. I tell you what your chart says.
                </p>
              </div>
            </div>

            {/* Example prompts */}
            <div className="pl-11 space-y-2">
              <p className="text-merciless-muted text-xs tracking-wider mb-3">TRY ASKING:</p>
              <div className="grid grid-cols-1 gap-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.text}
                    onClick={() => { setInput(prompt.text); inputRef.current?.focus() }}
                    className="text-left text-sm bg-merciless-black border border-merciless-border hover:border-merciless-gold/40 rounded-lg px-4 py-3 text-merciless-muted hover:text-merciless-white transition-all group flex items-start gap-3"
                  >
                    <span className="text-base opacity-60 group-hover:opacity-100 transition-opacity">{prompt.icon}</span>
                    <span className="italic">"{prompt.text}"</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 mr-3 mt-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-merciless-gold/20 to-merciless-violet/20 border border-merciless-gold/30 flex items-center justify-center">
                  <span className="text-merciless-gold text-sm">☽</span>
                </div>
              </div>
            )}
            <div className="max-w-[85%] space-y-1">
              <div
                className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-merciless-violet/20 border border-merciless-violet/30 text-merciless-white'
                    : 'bg-merciless-card border border-merciless-border text-merciless-white'
                }`}
              >
                {msg.content}
              </div>
              {msg.timestamp && (
                <div className={`text-[10px] text-merciless-muted/60 px-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {formatTimestamp(msg.timestamp)}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex-shrink-0 mr-3 mt-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-merciless-gold/20 to-merciless-violet/20 border border-merciless-gold/30 flex items-center justify-center animate-pulse">
                <span className="text-merciless-gold text-sm">☽</span>
              </div>
            </div>
            <div className="bg-merciless-card border border-merciless-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-merciless-gold animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-merciless-gold animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-merciless-gold animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-merciless-muted text-xs">Consulting the stars...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-3 pt-4 border-t border-merciless-border">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your chart anything..."
            rows={1}
            className="w-full bg-merciless-card border border-merciless-border rounded-lg px-4 py-3 text-merciless-white placeholder-merciless-muted text-sm focus:outline-none focus:border-merciless-gold/50 transition-colors resize-none min-h-[48px] max-h-[120px]"
            disabled={loading}
            style={{ height: 'auto' }}
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-5 py-3 bg-merciless-gold text-merciless-black font-bold rounded-lg text-sm disabled:opacity-40 hover:bg-merciless-gold/90 transition-all self-end"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
          </svg>
        </button>
      </form>
      
      {/* Conversation hint */}
      {messages.length > 0 && (
        <div className="text-center pt-2">
          <p className="text-merciless-muted/50 text-[10px]">
            {messages.length} message{messages.length !== 1 ? 's' : ''} in this conversation
          </p>
        </div>
      )}
    </div>
  )
}
