// transit-timeline: weekly frames of the moving sky for the chart time-scrub.
// Universal ephemeris data (not user-specific), so it is public and long-cached.
// Returns ~6 months of weekly transiting longitudes from today.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { transitingLongitudes } from "../_shared/ephemeris.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const weeks = Math.min(Math.max(parseInt(url.searchParams.get("weeks") ?? "26", 10) || 26, 1), 52);
  const start = new Date();
  start.setUTCHours(12, 0, 0, 0);

  const frames = [];
  for (let i = 0; i <= weeks; i++) {
    const d = new Date(start.getTime() + i * 7 * 86400_000);
    frames.push({ date: d.toISOString().split("T")[0], lon: transitingLongitudes(d) });
  }

  return new Response(JSON.stringify({ frames }), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600, s-maxage=43200" },
  });
});
