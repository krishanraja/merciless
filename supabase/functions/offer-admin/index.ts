// offer-admin: the fleet's write path to the offer genome. Maya POSTs overrides
// (a price experiment arm, a headline framing, the current promo) guarded by
// x-fleet-secret. The /functions/v1/offer endpoint then serves them merged on
// top of the static product truth. This is the difference between an observable
// node and an operable one, inside the Krish-set secret guardrail.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fleet-secret",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("FLEET_ADMIN_SECRET");
  if (!secret) return json({ error: "Server not configured" }, 500);
  if (!safeEqual(req.headers.get("x-fleet-secret") ?? "", secret)) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  if (req.method === "GET") {
    const { data } = await supabase.from("fleet_offer").select("overrides, updated_at, updated_by").eq("id", 1).single();
    return json({ ok: true, ...data });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { overrides?: Record<string, unknown>; merge?: boolean; updated_by?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.overrides || typeof body.overrides !== "object") return json({ error: "overrides object required" }, 400);

  let overrides = body.overrides;
  if (body.merge) {
    const { data } = await supabase.from("fleet_offer").select("overrides").eq("id", 1).single();
    overrides = { ...((data?.overrides as Record<string, unknown>) ?? {}), ...body.overrides };
  }

  const { error } = await supabase.from("fleet_offer").upsert({
    id: 1,
    overrides,
    updated_by: body.updated_by ?? "fleet",
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[offer-admin] upsert failed:", error);
    return json({ error: "Could not save overrides" }, 500);
  }
  return json({ ok: true, overrides });
});
