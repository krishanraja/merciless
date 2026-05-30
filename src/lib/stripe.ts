/// <reference types="vite/client" />
import { loadStripe } from '@stripe/stripe-js'
import { attributionForCheckout } from './attribution'

function requireEnv(key: 'VITE_STRIPE_PUBLISHABLE_KEY' | 'VITE_STRIPE_PRICE_ID'): string {
  const value = import.meta.env[key] as string | undefined
  if (!value || typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Set it in .env.local (dev) or Vercel project env vars (deploy).`
    )
  }
  return value
}

const stripePublishableKey = requireEnv('VITE_STRIPE_PUBLISHABLE_KEY')

// Warn loudly when live keys are used outside production, which prevents real
// charges from typos in local dev. pk_live_* on a non-prod host is a red flag.
if (
  typeof window !== 'undefined' &&
  stripePublishableKey.startsWith('pk_live_') &&
  !/(^|\.)merciless\.app$/.test(window.location.hostname)
) {
  console.warn(
    '[stripe] Live publishable key detected on non-production host ' +
    `(${window.location.hostname}). Use a pk_test_* key locally.`
  )
}

// Merciless Pro price ID: set via VITE_STRIPE_PRICE_ID env var
export const MERCILESS_PRO_PRICE_ID = requireEnv('VITE_STRIPE_PRICE_ID')

export const MERCILESS_PRO_PRICE_CENTS = 499
export const MERCILESS_PRO_PRICE_DISPLAY = '$4.99/mo'

let stripePromise: ReturnType<typeof loadStripe> | null = null

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey)
  }
  return stripePromise
}

export async function createCheckoutSession(
  accessToken: string,
  successUrl: string,
  cancelUrl: string,
  attribution?: Record<string, string>
): Promise<{ url: string } | null> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

    const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        success_url: successUrl,
        cancel_url: cancelUrl,
        attribution: attribution && Object.keys(attribution).length ? attribution : undefined,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create checkout session')
    }

    return response.json()
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return null
  }
}

export async function redirectToCheckout(
  accessToken: string
): Promise<void> {
  const successUrl = `${window.location.origin}/reading?upgraded=true`
  const cancelUrl = `${window.location.origin}/reading`

  const session = await createCheckoutSession(accessToken, successUrl, cancelUrl, attributionForCheckout())

  if (session?.url) {
    window.location.href = session.url
  }
}
