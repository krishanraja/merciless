// offer: the live product-and-offer truth the fleet polls. Merges the static
// product truth (public/offer.json) with the fleet-writable overrides (price
// experiment arm, headline of the day, current promo) so a single poll always
// reflects what Maya has shipped. Public, cache-short.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let base: Record<string, unknown> = {};
  try {
    const r = await fetch("https://merciless.app/offer.json", { signal: AbortSignal.timeout(4000) });
    if (r.ok) base = await r.json();
  } catch { /* fall back to overrides only */ }

  let overrides: Record<string, unknown> = {};
  let updatedAt: string | null = null;
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
    const { data } = await supabase.from("fleet_offer").select("overrides, updated_at").eq("id", 1).single();
    if (data) { overrides = (data.overrides as Record<string, unknown>) ?? {}; updatedAt = data.updated_at as string; }
  } catch { /* serve base only */ }

  const merged = {
    ...base,
    ...overrides,
    _fleet: { overrides_active: Object.keys(overrides).length > 0, overrides_updated_at: updatedAt, served_at: new Date().toISOString() },
  };

  return new Response(JSON.stringify(merged), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60, s-maxage=300" },
  });
});
