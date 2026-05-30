import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Only forward the attribution keys we recognise onto Stripe, as strings.
function attributionMetadata(a: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!a || typeof a !== "object") return out;
  const src = a as Record<string, unknown>;
  for (const k of ["mcl_cid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "agent", "landing_path", "referrer"]) {
    const v = src[k];
    if (typeof v === "string" && v.length > 0) out[k] = v.slice(0, 450);
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const user_id = user.id;
    const email = user.email ?? undefined;

    let body: { success_url?: string; cancel_url?: string; attribution?: unknown };
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const attribution = attributionMetadata(body.attribution);

    const PRICE_ID = Deno.env.get("STRIPE_PRICE_ID") || "price_1TJEo24w6vAdI2o57Rz8Cp3X";
    const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secretKey) {
      console.error("[create-checkout] STRIPE_SECRET_KEY not set");
      return json({ error: "Checkout is temporarily unavailable. Please try again later." }, 503);
    }
    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });

    const { data: existingSub } = await supabase
      .from("user_subscriptions").select("stripe_customer_id").eq("user_id", user_id).single();
    let customerId = existingSub?.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { user_id, ...attribution } });
      customerId = customer.id;
    } else {
      // Keep the customer's attribution fresh on the latest checkout intent.
      try {
        await stripe.customers.update(customerId, { metadata: { user_id, ...attribution } });
      } catch (e) {
        console.warn("[create-checkout] customer metadata update skipped:", (e as Error).message);
      }
    }

    const origin = req.headers.get("origin") ?? "https://merciless.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      mode: "subscription",
      success_url: body.success_url || `${origin}/reading?upgraded=true`,
      cancel_url: body.cancel_url || `${origin}/reading`,
      // Stamp attribution on the SESSION and, critically, on the SUBSCRIPTION,
      // which previously carried no metadata at all. The webhook reads it back.
      metadata: { user_id, price_id: PRICE_ID, ...attribution },
      subscription_data: { metadata: { user_id, ...attribution } },
    });

    return json({ url: session.url });
  } catch (error) {
    console.error("[create-checkout] error:", error);
    return json({ error: "Could not start checkout. Please try again." }, 500);
  }
});
