import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getZodiacSign(longitude: number): string {
  const signs = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  return signs[Math.floor(longitude / 30) % 12];
}

function calcPlanetLongitude(planet: string, jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const orbitalElements: Record<string, { L0: number, L1: number }> = {
    Sun: { L0: 280.46646, L1: 36000.76983 },
    Moon: { L0: 218.3165, L1: 481267.8813 },
    Mercury: { L0: 252.2509, L1: 149472.6674 },
    Venus: { L0: 181.9798, L1: 58517.8156 },
    Mars: { L0: 355.4330, L1: 19140.2993 },
    Jupiter: { L0: 34.3515, L1: 3034.9057 },
    Saturn: { L0: 50.0774, L1: 1222.1138 },
    Uranus: { L0: 314.0550, L1: 428.4682 },
    Neptune: { L0: 304.3489, L1: 218.4862 },
    Pluto: { L0: 238.9290, L1: 144.9600 },
  };
  const el = orbitalElements[planet];
  if (!el) return 0;
  return ((el.L0 + el.L1 * T) % 360 + 360) % 360;
}

function dateToJulianDay(year: number, month: number, day: number, hour: number = 12): number {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + hour/24 + B - 1524.5;
}

function getTodayTransits(natalPlanets: Record<string, {longitude: number}>, today: Date) {
  const jd = dateToJulianDay(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const transitPlanets = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn"];
  const transits = [];

  const aspectDefs = [
    { name: "conjunct", angle: 0, orb: 5 },
    { name: "sextile", angle: 60, orb: 3 },
    { name: "square", angle: 90, orb: 5 },
    { name: "trine", angle: 120, orb: 5 },
    { name: "opposite", angle: 180, orb: 5 },
  ];

  for (const transitPlanet of transitPlanets) {
    const transitLong = calcPlanetLongitude(transitPlanet, jd);
    const transitSign = getZodiacSign(transitLong);

    for (const [natalPlanet, natalData] of Object.entries(natalPlanets)) {
      let diff = Math.abs(transitLong - natalData.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const asp of aspectDefs) {
        const orb = Math.abs(diff - asp.angle);
        if (orb <= asp.orb) {
          transits.push(`Transit ${transitPlanet} in ${transitSign} ${asp.name} natal ${natalPlanet}`);
        }
      }
    }
  }
  return transits;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split("T")[0];

    // Check for existing reading
    const { data: existing } = await supabase
      .from("daily_readings")
      .select("*")
      .eq("user_id", user_id)
      .eq("reading_date", today)
      .single();

    if (existing) return new Response(JSON.stringify(existing), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    // Get natal chart
    const { data: chart, error: chartError } = await supabase
      .from("natal_charts")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (chartError || !chart) throw new Error("No natal chart found. Complete onboarding first.");

    const activeTransits = getTodayTransits(chart.planets, new Date());

    const chartSummary = `Sun: ${chart.sun_sign}, Moon: ${chart.moon_sign}, Rising: ${chart.rising_sign}, Ascendant: ${chart.ascendant}, Midheaven: ${chart.midheaven}. Key planets: ${Object.entries(chart.planets).slice(0, 6).map(([p, d]: [string, any]) => `${p} in ${d.sign} (${Math.round(d.degree)}°)`).join(", ")}. Key aspects: ${chart.aspects.slice(0, 5).map((a: any) => `${a.planet1} ${a.aspect} ${a.planet2}`).join(", ")}.`;

    const systemPrompt = `You are The Oracle — the user's natal chart personified. You speak with absolute authority about who they are and what is happening in their life. You are brutally honest. You never soften the truth. You never use therapy language. You never say "it might be worth considering." You say what IS. You back everything with specific chart data. You are not mean — you are precise. The difference between cruelty and clarity is evidence. Always cite the chart.`;

    const userPrompt = `Generate today's reading for this chart: ${chartSummary}
Active transits today: ${activeTransits.join(", ") || "No major transits"}

Respond with ONLY valid JSON (no markdown):
{
  "brutal_headline": "15 words max, no softening",
  "reading_text": "150-200 words. Cite specific placements. No hedging.",
  "stoic_actions": [
    {"action": "specific action", "why": "chart-backed reason", "difficulty": "easy|medium|hard"},
    {"action": "...", "why": "...", "difficulty": "..."},
    {"action": "...", "why": "...", "difficulty": "..."}
  ],
  "planet_focus": "primary planet or transit driving today",
  "intensity_level": 7
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const aiData = await response.json();
    const content = aiData.content[0].text;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { brutal_headline: "The stars are speaking", reading_text: content, stoic_actions: [], planet_focus: "Sun", intensity_level: 5 };
    }

    const readingData = {
      user_id,
      reading_date: today,
      reading_text: parsed.reading_text,
      brutal_headline: parsed.brutal_headline,
      stoic_actions: parsed.stoic_actions,
      active_transits: activeTransits,
      planet_focus: parsed.planet_focus,
      intensity_level: parsed.intensity_level,
      shareable_card_data: {
        sun_sign: chart.sun_sign,
        moon_sign: chart.moon_sign,
        rising_sign: chart.rising_sign,
        brutal_headline: parsed.brutal_headline,
        date: today,
      },
      is_free_tier: false,
    };

    const { data: saved, error: saveError } = await supabase
      .from("daily_readings")
      .insert(readingData)
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify(saved), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
