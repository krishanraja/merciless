import { useState, useEffect } from 'react'
import { supabase, type Tables } from '../lib/supabase'
import { createCheckoutSession } from '../lib/stripe'

export interface SubscriptionData {
  status: 'active' | 'canceled' | 'past_due' | 'inactive'
  stripe_customer_id?: string
  stripe_subscription_id?: string
  current_period_end?: string
  cancel_at_period_end?: boolean
}

type SubscriptionRow = Tables['user_subscriptions']['Row']
const SUB_STATUSES = ['active', 'canceled', 'past_due', 'inactive'] as const

function mapSubscription(row: SubscriptionRow): SubscriptionData {
  const status = (SUB_STATUSES as readonly string[]).includes(row.status)
    ? (row.status as SubscriptionData['status'])
    : 'inactive'
  return {
    status,
    stripe_customer_id: row.stripe_customer_id ?? undefined,
    stripe_subscription_id: row.stripe_subscription_id ?? undefined,
    current_period_end: row.current_period_end ?? undefined,
    cancel_at_period_end: row.cancel_at_period_end ?? undefined,
  }
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

      setSubscription(data ? mapSubscription(data) : { status: 'inactive' })
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
    } catch (err: unknown) {
      console.error('Upgrade failed:', err)
    } finally {
      setUpgrading(false)
    }
  }

  return { subscription, loading, upgrading, isPro, upgradeToPro, refetch: loadSubscription }
}
