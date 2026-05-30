// synastry: the public two-chart relationship verdict. The K-factor front door.
// Speak (or type) two birth dates, get a brutal relationship reading from the
// real inter-chart aspects, and a shareable /v/{slug} target the other person
// can open. Unauthenticated, so it is rate-limited + budget-capped like the demo.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { callLLM } from "../_shared/llm.ts";
import { SynastryLLMSchema, extractJsonObject } from "../_shared/schemas.ts";
import { sanitizeVoice } from "../_shared/brand-voice.ts";
import { computeSynastryAspects, relationalLongitudes, signOf } from "../_shared/ephemeris.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PER_FP_LIMIT = 10;
const WINDOW = 3600;
const GLOBAL_DAILY_LIMIT = 2000;
const RELATIONSHIPS = new Set(["partner", "ex", "friend", "family", "boss", "crush", "situationship", "coworker"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Rate limit + global budget, fail closed (protects LLM spend).
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const fp = "syn|" + (await sha256Hex(`${ip}|${req.headers.get("user-agent") ?? ""}`));
    const { data: fpCount, error: fpErr } = await supabase.rpc("demo_rate_limit_bump", { p_fingerprint: fp, p_window_seconds: WINDOW });
    if (fpErr || (typeof fpCount === "number" && fpCount > PER_FP_LIMIT)) {
      return json({ success: false, error: "Too many readings. Please try again later." }, 429);
    }
    const { data: gCount, error: gErr } = await supabase.rpc("api_global_budget_bump", { p_bucket: "synastry" });
    if (gErr || (typeof gCount === "number" && gCount > GLOBAL_DAILY_LIMIT)) {
      return json({ success: false, error: "The Oracle is busy. Please try again later." }, 429);
    }

    let body: { person_a?: string; person_b?: string; relationship?: string };
    try {
      body = await req.json();
    } catch {
      return json({ success: false, error: "Invalid request body" }, 400);
    }
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!body.person_a || !re.test(body.person_a) || !body.person_b || !re.test(body.person_b)) {
      return json({ success: false, error: "Two valid birth dates (YYYY-MM-DD) are required." }, 400);
    }
    const relationship = body.relationship && RELATIONSHIPS.has(body.relationship) ? body.relationship : null;

    const aLongs = relationalLongitudes(body.person_a);
    const bLongs = relationalLongitudes(body.person_b);
    const sunA = signOf(aLongs["Sun"]);
    const sunB = signOf(bLongs["Sun"]);
    const aspects = computeSynastryAspects(aLongs, bLongs);

    const evidence = aspects.slice(0, 6).map((a) => `your ${a.a_planet} ${a.aspect} their ${a.b_planet} (orb ${a.orb} degrees)`);

    const systemPrompt = `You are The Oracle reading the synastry between two charts: the one asking (you) and the other person. You are brutally honest about the real dynamic between these two charts, never cruel for its own sake, always citing the actual inter-aspects given. You never flatter and you never hedge.

VOICE RULES: Never use em dashes. Use commas, colons, periods, or semicolons. Never use the words might, maybe, perhaps, or consider. Never write "it is not X, it is Y". State what is.`;

    const userPrompt = `You are a ${sunA} Sun. The other person is a ${sunB} Sun${relationship ? `, your ${relationship}` : ""}.
Real synastry aspects (no birth times, so Sun and the slower relational planets only): ${evidence.join("; ") || "few exact aspects, read the sign dynamic"}.

Respond with ONLY valid JSON, no markdown:
{
  "headline": "12 to 16 words naming the core dynamic, brutal and specific",
  "dynamic": "50 to 80 words on what actually happens between these two charts, cite the aspects",
  "the_other": "30 words on what the other person brings, the part they will want to read about themselves"
}`;

    let content: string;
    try {
      const r = await callLLM({ system: systemPrompt, messages: [{ role: "user", content: userPrompt }], maxTokens: 400 });
      content = r.text;
    } catch (err) {
      console.error("[synastry] LLM error:", err);
      return json({ success: false, error: "The Oracle is overwhelmed. Please try again in a moment." }, 503);
    }

    let parsed: import("../_shared/schemas.ts").SynastryLLM;
    try {
      parsed = SynastryLLMSchema.parse(extractJsonObject(content));
    } catch (e) {
      console.error("[synastry] schema fail:", e);
      parsed = {
        headline: `Your ${sunA} and their ${sunB} keep circling the same fight.`,
        dynamic: "The charts pull in directions you both pretend not to notice. The full reading does not let either of you off the hook.",
        the_other: "",
      };
    }

    const headline = sanitizeVoice(parsed.headline);
    const dynamic = sanitizeVoice(parsed.dynamic);
    const theOther = sanitizeVoice(parsed.the_other || "");
    const shareSlug = crypto.randomUUID().replace(/-/g, "").slice(0, 10);

    const { error: vErr } = await supabase.from("public_verdicts").upsert({
      slug: shareSlug,
      headline,
      excerpt: dynamic.slice(0, 180),
      sun_sign: sunA,
      moon_sign: sunB, // reuse column to carry the other person's Sun for the card
      rising_sign: null,
      kind: "synastry",
    });
    if (vErr) console.error("[synastry] verdict upsert failed:", vErr);

    return json({
      success: true,
      headline,
      dynamic,
      the_other: theOther,
      sun_a: sunA,
      sun_b: sunB,
      share_slug: shareSlug,
    });
  } catch (error) {
    console.error("[synastry] fatal:", error);
    return json({ success: false, error: "Could not read the relationship. Please try again." }, 500);
  }
});
