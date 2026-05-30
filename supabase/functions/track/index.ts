// track: public client-side event sink. The browser cannot hold the warehouse
// ingest secret, so it posts funnel events here and this function forwards them
// to the OS warehouse with the secret attached. Server stamps received_at, hashes
// the IP for the metadata, and rate-limits per fingerprint.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { forwardEvent, type AttributionEvent } from "../_shared/attribution.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Events the client is allowed to emit. Money events (purchased/refunded/churned)
// come only from the signature-verified Stripe webhook, never the browser.
const CLIENT_EVENTS = new Set([
  "landed", "demo_played", "demo_stalled", "signed_up", "chart_calculated",
  "activated", "paywall_hit", "verdict_viewed", "share_card_created",
  "synastry_pair_minted", "recipient_unblurred",
]);

const PER_FP_LIMIT = 120; // generous; funnels can be chatty
const WINDOW = 3600;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function sha256Hex(input: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid body" }, 400);
  }
  const event = typeof body.event === "string" ? body.event : "";
  if (!CLIENT_EVENTS.has(event)) return json({ ok: false, error: "unsupported event" }, 400);

  // Best-effort rate limit (reuses the demo rate-limit RPC, namespaced).
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const fp = "track|" + (await sha256Hex(`${ip}|${req.headers.get("user-agent") ?? ""}`));
    const { data: count } = await supabase.rpc("demo_rate_limit_bump", { p_fingerprint: fp, p_window_seconds: WINDOW });
    if (typeof count === "number" && count > PER_FP_LIMIT) return json({ ok: false, error: "rate limited" }, 429);
  } catch {
    // never block emission on a rate-limit hiccup
  }

  const ev: AttributionEvent = {
    event,
    anonymous_id: typeof body.anonymous_id === "string" ? body.anonymous_id : null,
    user_id: typeof body.user_id === "string" ? body.user_id : null,
    email: typeof body.email === "string" ? body.email : null,
    utm_source: typeof body.utm_source === "string" ? body.utm_source : null,
    utm_medium: typeof body.utm_medium === "string" ? body.utm_medium : null,
    utm_campaign: typeof body.utm_campaign === "string" ? body.utm_campaign : null,
    utm_content: typeof body.utm_content === "string" ? body.utm_content : null,
    utm_term: typeof body.utm_term === "string" ? body.utm_term : null,
    agent: typeof body.agent === "string" ? body.agent : null,
    referrer: typeof body.referrer === "string" ? body.referrer : null,
    landing_path: typeof body.landing_path === "string" ? body.landing_path : null,
    metadata: typeof body.metadata === "object" && body.metadata ? body.metadata as Record<string, unknown> : {},
    dedupe_key: typeof body.dedupe_key === "string" ? body.dedupe_key : null,
  };

  await forwardEvent(ev);
  return json({ ok: true });
});
