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
        setMessages(data.messages || [])
      }
    } catch {
      // No conversations yet
    }
  }

  const sendMessage = async (message: string) => {
    try {
      setLoading(true)
      setError(null)

      const userMsg: Message = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: { session } } = await supabase.auth.getSession()
      const res = await supabase.functions.invoke('oracle', {
        body: {
          user_id: user.id,
          message,
          conversation_id: conversationId,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })

      if (res.error) throw new Error(res.error.message)

      const assistantMsg: Message = {
        role: 'assistant',
        content: res.data.response,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      if (res.data.conversation_id) setConversationId(res.data.conversation_id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Oracle is unavailable')
      // Remove optimistic user message on error
      setMessages((prev) => prev.slice(0, -1))
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
