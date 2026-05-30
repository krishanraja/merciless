import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeChart, localToUtc } from "../_shared/ephemeris.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);
    const user_id = user.id;

    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid request body" }, 400);
    }
    const { birth_date, birth_time, birth_location, latitude, longitude, timezone } = payload as {
      birth_date?: string; birth_time?: string | null; birth_location?: string;
      latitude?: number; longitude?: number; timezone?: string;
    };

    if (!birth_date || !/^\d{4}-\d{2}-\d{2}$/.test(birth_date)) {
      return json({ error: "A valid birth date (YYYY-MM-DD) is required." }, 400);
    }

    const [year, month, day] = birth_date.split("-").map(Number);
    const timeKnown = typeof birth_time === "string" && /^\d{1,2}:\d{2}/.test(birth_time);
    let hour = 12, minute = 0;
    if (timeKnown) {
      const [h, m] = (birth_time as string).split(":").map(Number);
      hour = h;
      minute = m;
    }

    const hasPlace = typeof latitude === "number" && typeof longitude === "number";
    const utc = localToUtc(year, month, day, hour, minute, timezone ?? null);

    // Angles and houses only when we genuinely know the time AND the place.
    const chart = computeChart({
      utc,
      latitude: hasPlace ? latitude : undefined,
      longitude: hasPlace ? longitude : undefined,
      timeKnown: timeKnown && hasPlace,
    });

    // Enrich the planets map with the angles so the chart viewer and the reading
    // prompt can cite exact ascendant / midheaven degrees, not just the sign.
    const planets: Record<string, unknown> = { ...chart.positions };
    if (chart.ascendant) {
      planets["Ascendant"] = { ...chart.ascendant, body: "Ascendant", speed: 0, retrograde: false };
    }
    if (chart.midheaven) {
      planets["Midheaven"] = { ...chart.midheaven, body: "Midheaven", speed: 0, retrograde: false };
    }

    const chartData = {
      user_id,
      planets,
      houses: chart.houses,
      aspects: chart.aspects,
      ascendant: chart.ascendant?.sign ?? null,
      midheaven: chart.midheaven?.sign ?? null,
      sun_sign: chart.sun_sign,
      moon_sign: chart.moon_sign,
      rising_sign: chart.rising_sign,
    };

    const { error: birthErr } = await supabase.from("user_birth_data").upsert({
      user_id,
      birth_date,
      birth_time: timeKnown ? birth_time : null,
      birth_location: birth_location ?? null,
      latitude: hasPlace ? latitude : null,
      longitude: hasPlace ? longitude : null,
      timezone: timezone ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (birthErr) {
      console.error("[natal-chart] birth_data upsert failed:", birthErr);
      return json({ error: "Could not save your birth data. Please try again." }, 500);
    }

    const { data, error } = await supabase
      .from("natal_charts")
      .upsert(chartData, { onConflict: "user_id" })
      .select()
      .single();
    if (error) {
      console.error("[natal-chart] chart upsert failed:", error);
      return json({ error: "Could not calculate your chart. Please try again." }, 500);
    }

    return json(data);
  } catch (error) {
    console.error("[natal-chart] fatal:", error);
    return json({ error: "Chart calculation is temporarily unavailable. Please try again." }, 500);
  }
});
