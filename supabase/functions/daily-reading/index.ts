import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callLLM } from "../_shared/llm.ts";
import { DailyReadingLLMSchema, extractJsonObject } from "../_shared/schemas.ts";
import { sanitizeVoice } from "../_shared/brand-voice.ts";
import { computeTransits } from "../_shared/ephemeris.ts";

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

// Pull a clean { body: longitude } map out of the stored chart, skipping the
// angle pseudo-entries (Ascendant / Midheaven) that are not transiting bodies.
function natalLongitudes(planets: Record<string, { longitude?: number }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, p] of Object.entries(planets)) {
    if (name === "Ascendant" || name === "Midheaven") continue;
    if (p && typeof p.longitude === "number") out[name] = p.longitude;
  }
  return out;
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
    const today = new Date().toISOString().split("T")[0];

    // Idempotent: one reading per user per day.
    const { data: existing } = await supabase
      .from("daily_readings")
      .select("*")
      .eq("user_id", user_id)
      .eq("reading_date", today)
      .single();
    if (existing) return json(existing);

    const { data: chart, error: chartError } = await supabase
      .from("natal_charts")
      .select("*")
      .eq("user_id", user_id)
      .single();
    if (chartError || !chart) {
      return json({ error: "No natal chart found. Complete onboarding first.", code: "no_chart" }, 409);
    }

    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("status")
      .eq("user_id", user_id)
      .single();
    const isPro = sub?.status === "active";

    const activeTransits = computeTransits(natalLongitudes(chart.planets), new Date());

    const retroNote = Object.entries(chart.planets as Record<string, { sign?: string; degree?: number; retrograde?: boolean }>)
      .filter(([n, d]) => d?.retrograde && n !== "NorthNode" && n !== "SouthNode")
      .map(([n]) => n);

    const chartSummary = `Sun: ${chart.sun_sign}, Moon: ${chart.moon_sign}, Rising: ${chart.rising_sign ?? "unknown (no birth time)"}, Midheaven: ${chart.midheaven ?? "unknown"}. Key placements: ${
      Object.entries(chart.planets as Record<string, { sign?: string; degree?: number; retrograde?: boolean }>)
        .filter(([n]) => ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"].includes(n))
        .map(([p, d]) => `${p} in ${d.sign} (${Math.round(d.degree ?? 0)} deg${d.retrograde ? ", retrograde" : ""})`)
        .join(", ")
    }. Notable aspects: ${(chart.aspects as Array<{ planet1: string; aspect: string; planet2: string }>).slice(0, 6).map((a) => `${a.planet1} ${a.aspect} ${a.planet2}`).join(", ")}.${retroNote.length ? ` Retrograde now: ${retroNote.join(", ")}.` : ""}`;

    const systemPrompt = `You are The Oracle, this person's natal chart given a voice. You speak with absolute authority about who they are and what is happening to them today. You are brutally honest and never soften the truth. You never use therapy language. You never hedge. You say what IS, and you back every claim with a specific placement, aspect, or transit. The difference between cruelty and clarity is evidence, so always cite the chart. The positions you are given are computed to the arc-minute, so be precise and do not invent placements that are not listed.

CRITICAL VOICE RULES: Never use em dashes. Use commas, periods, colons, or semicolons. Never use the words might, maybe, perhaps, consider, or "you may want to". Never write "it is not X, it is Y". State it plainly.`;

    const userPrompt = `Today is ${today}. Generate today's reading for this chart.
Chart: ${chartSummary}
Active transits today: ${activeTransits.slice(0, 8).map((t) => `transiting ${t.transiting_planet} ${t.aspect} natal ${t.natal_planet} (orb ${t.orb} deg, ${t.applying ? "applying" : "separating"})`).join(", ") || "no major transits today"}

Respond with ONLY valid JSON, no markdown:
{
  "brutal_headline": "15 words max, no softening, names a real placement or transit",
  "reading_text": "150 to 200 words. Cite specific placements and today's transits. No hedging.",
  "stoic_actions": [
    {"action": "specific action for today", "why": "chart-backed reason", "difficulty": "easy|medium|hard"},
    {"action": "...", "why": "...", "difficulty": "..."},
    {"action": "...", "why": "...", "difficulty": "..."}
  ],
  "planet_focus": "the planet or transit driving today",
  "intensity_level": 7
}`;

    let content: string;
    try {
      const result = await callLLM({
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        maxTokens: 1024,
      });
      content = result.text;
    } catch (err) {
      console.error("[daily-reading] LLM error:", err);
      return json({ error: "Your reading is taking longer than usual. Please try again in a moment." }, 503);
    }

    let parsed: import("../_shared/schemas.ts").DailyReadingLLM;
    try {
      parsed = DailyReadingLLMSchema.parse(extractJsonObject(content));
    } catch (schemaErr) {
      // Never surface raw model output to the user. Ask for a clean retry instead
      // of persisting a malformed reading and caching it for the whole day.
      console.error("[daily-reading] schema validation failed:", schemaErr);
      return json({ error: "Your reading did not come through cleanly. Please try again." }, 503);
    }

    const sanitizedActions = parsed.stoic_actions.map((a) => ({
      action: sanitizeVoice(a.action || ""),
      why: sanitizeVoice(a.why || ""),
      ...(a.difficulty ? { difficulty: a.difficulty } : {}),
    }));

    const headline = sanitizeVoice(parsed.brutal_headline || "");
    const shareSlug = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
    const readingData = {
      user_id,
      reading_date: today,
      reading_text: sanitizeVoice(parsed.reading_text || ""),
      brutal_headline: headline,
      stoic_actions: sanitizedActions,
      active_transits: activeTransits,
      planet_focus: parsed.planet_focus,
      intensity_level: parsed.intensity_level,
      shareable_card_data: {
        sun_sign: chart.sun_sign,
        moon_sign: chart.moon_sign,
        rising_sign: chart.rising_sign,
        brutal_headline: headline,
        date: today,
        slug: shareSlug,
      },
      is_free_tier: !isPro,
    };

    const { data: saved, error: saveError } = await supabase
      .from("daily_readings")
      .insert(readingData)
      .select()
      .single();
    if (saveError) {
      // A unique-violation means a concurrent request already wrote today's row.
      const { data: row } = await supabase
        .from("daily_readings").select("*").eq("user_id", user_id).eq("reading_date", today).single();
      if (row) return json(row);
      console.error("[daily-reading] save failed:", saveError);
      return json({ error: "Could not save your reading. Please try again." }, 500);
    }

    // Mint the public share target so /v/{slug} can render server-side. Best
    // effort: never block the reading on the share row.
    const { error: verdictErr } = await supabase.from("public_verdicts").upsert({
      slug: shareSlug,
      headline,
      excerpt: sanitizeVoice((parsed.reading_text || "").slice(0, 180)),
      sun_sign: chart.sun_sign,
      moon_sign: chart.moon_sign,
      rising_sign: chart.rising_sign,
      kind: "reading",
    });
    if (verdictErr) console.error("[daily-reading] verdict upsert failed:", verdictErr);

    return json(saved);
  } catch (error) {
    console.error("[daily-reading] fatal:", error);
    return json({ error: "Reading generation is temporarily unavailable. Please try again." }, 500);
  }
});
