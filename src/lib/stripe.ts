/// <reference types="vite/client" />
import { loadStripe } from '@stripe/stripe-js'

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string

// Merciless Pro price ID: set via VITE_STRIPE_PRICE_ID env var
export const MERCILESS_PRO_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID as string

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
  cancelUrl: string
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

  const session = await createCheckoutSession(accessToken, successUrl, cancelUrl)

  if (session?.url) {
    window.location.href = session.url
  }
}
