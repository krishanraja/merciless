// Forwards an attribution event from Merciless to the Mindmaker OS warehouse
// ingest front door. Merciless holds ONLY the ingest secret, never the warehouse
// service-role key or DB URL. Fire-and-forget: a warehouse hiccup must never
// break a user flow or a Stripe webhook ack, so this never throws.

const DEFAULT_INGEST_URL = "https://gojpffsrxybbpbdzzrvs.supabase.co/functions/v1/ingest-attribution";

export interface AttributionEvent {
  event: string;
  occurred_at?: string;
  anonymous_id?: string | null; // the mcl_cid first-party click id
  user_id?: string | null;
  email?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  campaign_id?: string | null;
  agent?: string | null;
  referrer?: string | null;
  landing_path?: string | null;
  stripe_account?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  amount_cents?: number | null;
  currency?: string | null;
  metadata?: Record<string, unknown>;
  dedupe_key?: string | null;
}

export async function forwardEvent(ev: AttributionEvent): Promise<boolean> {
  const secret = Deno.env.get("ATTRIBUTION_INGEST_SECRET");
  if (!secret) {
    console.warn("[attribution] ATTRIBUTION_INGEST_SECRET not set; skipping emit");
    return false;
  }
  const url = Deno.env.get("ATTRIBUTION_INGEST_URL") ?? DEFAULT_INGEST_URL;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-attribution-secret": secret },
      body: JSON.stringify({ app: "merciless", ...ev }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn("[attribution] ingest returned", res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[attribution] emit failed:", (e as Error).message);
    return false;
  }
}
