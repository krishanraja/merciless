import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { createCheckoutSession } from '../lib/stripe'

export interface SubscriptionData {
  status: 'active' | 'canceled' | 'past_due' | 'inactive'
  stripe_customer_id?: string
  stripe_subscription_id?: string
  current_period_end?: string
  cancel_at_period_end?: boolean
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)

  const isPro = subscription?.status === 'active'

  useEffect(() => {
    loadSubscription()
  }, [])

  const loadSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setSubscription(data || { status: 'inactive' })
    } catch {
      setSubscription({ status: 'inactive' })
    } finally {
      setLoading(false)
    }
  }

  const upgradeToPro = async () => {
    try {
      setUpgrading(true)
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession) throw new Error('Not authenticated')
      const successUrl = `${window.location.origin}/reading?upgraded=true`
      const cancelUrl = `${window.location.origin}/reading`
      const session = await createCheckoutSession(authSession.access_token, successUrl, cancelUrl)
      if (session?.url) {
        window.location.href = session.url
      }
    } catch (err: any) {
      console.error('Upgrade failed:', err)
    } finally {
      setUpgrading(false)
    }
  }

  return { subscription, loading, upgrading, isPro, upgradeToPro, refetch: loadSubscription }
}
