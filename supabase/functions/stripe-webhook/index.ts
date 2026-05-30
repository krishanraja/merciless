import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { forwardEvent } from "../_shared/attribution.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const STRIPE_ACCOUNT = "mindmaker_llc";

function pickAttribution(meta: Record<string, string | undefined> | null | undefined) {
  const m = meta ?? {};
  return {
    anonymous_id: m.mcl_cid ?? null,
    utm_source: m.utm_source ?? null,
    utm_medium: m.utm_medium ?? null,
    utm_campaign: m.utm_campaign ?? null,
    utm_content: m.utm_content ?? null,
    utm_term: m.utm_term ?? null,
    agent: m.agent ?? null,
    landing_path: m.landing_path ?? null,
    referrer: m.referrer ?? null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  let event: Stripe.Event;
  try {
    if (!webhookSecret || !sig) return new Response("Webhook secret or signature missing", { status: 400 });
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  // Idempotency: never process the same Stripe event twice (replays, retries,
  // out-of-order delivery). The insert is the lock.
  const { error: dupErr } = await supabase
    .from("stripe_processed_events")
    .insert({ event_id: event.id, type: event.type });
  if (dupErr) {
    // Unique violation => already processed. Anything else, log and still ack.
    if ((dupErr as { code?: string }).code === "23505") {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("[stripe-webhook] idempotency insert error:", dupErr);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) break;
        await supabase.from("user_subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          stripe_price_id: session.metadata?.price_id,
          status: "active",
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        await forwardEvent({
          event: "purchased",
          user_id: userId,
          email: session.customer_details?.email ?? null,
          stripe_account: STRIPE_ACCOUNT,
          stripe_customer_id: (session.customer as string) ?? null,
          stripe_subscription_id: (session.subscription as string) ?? null,
          amount_cents: session.amount_total ?? null,
          currency: session.currency ?? null,
          dedupe_key: `merciless:purchased:${event.id}`,
          ...pickAttribution(session.metadata as Record<string, string>),
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase.from("user_subscriptions").update({
          status: sub.status === "active" ? "active" : sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", sub.id);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase.from("user_subscriptions").update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", sub.id);

        await forwardEvent({
          event: "churned",
          user_id: sub.metadata?.user_id ?? null,
          stripe_account: STRIPE_ACCOUNT,
          stripe_customer_id: (sub.customer as string) ?? null,
          stripe_subscription_id: sub.id,
          dedupe_key: `merciless:churned:${event.id}`,
          ...pickAttribution(sub.metadata as Record<string, string>),
        });
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await forwardEvent({
          event: "refunded",
          stripe_account: STRIPE_ACCOUNT,
          stripe_customer_id: (charge.customer as string) ?? null,
          amount_cents: charge.amount_refunded ?? null,
          currency: charge.currency ?? null,
          dedupe_key: `merciless:refunded:${event.id}`,
          ...pickAttribution(charge.metadata as Record<string, string>),
        });
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[stripe-webhook] handler error:", error);
    return new Response(JSON.stringify({ error: "handler error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
