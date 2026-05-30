import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export function useOracle() {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadLatestConversation()
  }, [])

  const loadLatestConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('oracle_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setConversationId(data.id)
        // messages column is `Json` from generated types; cast to known shape
        setMessages((data.messages as Message[] | null) ?? [])
      }
    } catch {
      // No conversations yet
    }
  }

  const sendMessage = async (message: string) => {
    setLoading(true)
    setError(null)
    // Optimistic user message. The assistant bubble is pushed on the first token.
    setMessages((prev) => [...prev, { role: 'user', content: message, timestamp: new Date().toISOString() }])

    let started = false
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const base = import.meta.env.VITE_SUPABASE_URL
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${base}/functions/v1/oracle`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: anon, Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ message, conversation_id: conversationId, stream: true }),
      })

      // Errors (Pro gate, auth, bad input) come back as JSON, not a stream.
      if (!res.ok || !res.body || (res.headers.get('content-type') || '').includes('application/json')) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'The Oracle is unavailable. Please try again.')
      }

      const convId = res.headers.get('x-conversation-id')
      if (convId) setConversationId(convId)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        if (!chunk) continue
        if (!started) {
          started = true
          setLoading(false)
          setMessages((prev) => [...prev, { role: 'assistant', content: chunk, timestamp: new Date().toISOString() }])
        } else {
          setMessages((prev) => {
            const copy = [...prev]
            const last = copy[copy.length - 1]
            if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, content: last.content + chunk }
            return copy
          })
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Oracle is unavailable')
      // If nothing streamed, remove the optimistic user message; otherwise keep
      // the partial answer that did arrive.
      if (!started) setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  const startNewConversation = () => {
    setMessages([])
    setConversationId(undefined)
    setError(null)
  }

  const clearError = () => setError(null)

  return { messages, conversationId, loading, error, sendMessage, startNewConversation, clearError }
}
