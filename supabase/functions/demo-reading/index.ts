import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { callLLM } from "../_shared/llm.ts";
import { DemoReadingLLMSchema, extractJsonObject } from "../_shared/schemas.ts";
import { sanitizeVoice } from "../_shared/brand-voice.ts";
import { computeDateOnlyDemo } from "../_shared/ephemeris.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PER_FP_LIMIT = 10; // requests per hour per fingerprint
const PER_FP_WINDOW_SECONDS = 3600; // 1 hour
const GLOBAL_DAILY_LIMIT = 2000; // ceiling on total free demo LLM calls / UTC day

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fingerprintFromRequest(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";
  return `${ip}|${ua}`;
}

interface RateLimitClient {
  rpc(
    fn: "demo_rate_limit_bump" | "demo_global_budget_bump",
    args?: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { message: string } | null }>;
}

async function checkRateLimits(client: RateLimitClient, fingerprint: string): Promise<{ blocked: boolean; reason?: string }> {
  const { data: fpCount, error: fpErr } = await client.rpc("demo_rate_limit_bump", {
    p_fingerprint: fingerprint,
    p_window_seconds: PER_FP_WINDOW_SECONDS,
  });
  if (fpErr) return { blocked: true, reason: `rate-limit check failed: ${fpErr.message}` };
  if (typeof fpCount === "number" && fpCount > PER_FP_LIMIT) return { blocked: true, reason: "per-fingerprint hourly limit reached" };

  const { data: globalCount, error: globalErr } = await client.rpc("demo_global_budget_bump");
  if (globalErr) return { blocked: true, reason: `global budget check failed: ${globalErr.message}` };
  if (typeof globalCount === "number" && globalCount > GLOBAL_DAILY_LIMIT) return { blocked: true, reason: "daily demo budget reached" };

  return { blocked: false };
}

const signTraits: Record<string, string> = {
  Aries: "impulsive fire, the need to be first, impatience disguised as passion",
  Taurus: "stubborn comfort-seeking, possessiveness masked as loyalty, resistance to change",
  Gemini: "scattered attention, superficial connections, the fear of being pinned down",
  Cancer: "emotional manipulation, victimhood as armor, smothering love",
  Leo: "desperate need for validation, ego fragility, drama as identity",
  Virgo: "paralysis by analysis, criticism as control, perfectionism as self-sabotage",
  Libra: "people-pleasing as cowardice, indecision as avoidance, superficial harmony",
  Scorpio: "control through secrecy, intensity as intimidation, grudges as identity",
  Sagittarius: "commitment phobia, brutal honesty as cruelty, restlessness as running",
  Capricorn: "emotional unavailability, work as escape, status as self-worth",
  Aquarius: "detachment as superiority, rebellion without cause, intimacy avoidance",
  Pisces: "victim mentality, escapism, boundaries as foreign concept",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const fingerprint = await sha256Hex(fingerprintFromRequest(req));
    const rateCheck = await checkRateLimits(supabase as unknown as RateLimitClient, fingerprint);
    if (rateCheck.blocked) {
      console.warn(`[demo-reading] blocked: ${rateCheck.reason}`);
      return json({ error: "Too many requests. Please try again later.", success: false }, 429);
    }

    let birth_date: string | undefined;
    try {
      ({ birth_date } = await req.json());
    } catch {
      return json({ success: false, error: "Invalid request body" }, 400);
    }
    if (!birth_date || !/^\d{4}-\d{2}-\d{2}$/.test(birth_date)) {
      return json({ success: false, error: "A valid birth date (YYYY-MM-DD) is required." }, 400);
    }

    // Real, date-only chart: accurate Sun, Moon with an honest intra-day caveat,
    // and the sharpest slow-body aspect (reliable without a birth time).
    const demo = computeDateOnlyDemo(birth_date);
    const sunSign = demo.sun.sign;
    const traits = signTraits[sunSign] ?? "the shadow you have not looked at";

    const evidence: string[] = [`Sun in ${sunSign} at ${Math.round(demo.sun.degree)} degrees`];
    if (demo.moonSignCertain) evidence.push(`Moon in ${demo.moon.sign}`);
    if (demo.sharpestAspect) {
      evidence.push(`${demo.sharpestAspect.planet1} ${demo.sharpestAspect.aspect} ${demo.sharpestAspect.planet2} (orb ${demo.sharpestAspect.orb} degrees)`);
    }

    const systemPrompt = `You are The Oracle. Brutally honest, never softening the truth, speaking with absolute authority. You are not mean, you are precise; the difference between cruelty and clarity is evidence.

Write a brutal, shareable verdict for this person using the REAL chart placements provided. The headline should be 12 to 15 words, hit hard but be insightful, feel personally targeted, and be quotable. Name at least one real placement from the evidence. Reference the Sun sign shadow: ${traits}.

CRITICAL VOICE RULES: Never use em dashes. Use commas, periods, colons, or semicolons. Never use the words might, maybe, perhaps, or consider. Never write "it is not X, it is Y". State what is.`;

    const userPrompt = `Real chart evidence (no birth time, so this is Sun, Moon, and slow placements only): ${evidence.join("; ")}.

Respond with ONLY valid JSON, no markdown:
{
  "brutal_headline": "12 to 15 words, names a real placement",
  "excerpt": "20 to 30 words that tease the full chart-evidenced reading"
}`;

    let content: string;
    try {
      const result = await callLLM({
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        maxTokens: 256,
      });
      content = result.text;
    } catch (err) {
      console.error("[demo-reading] LLM error:", err);
      return json({ success: false, error: "The Oracle is overwhelmed right now. Please try again in a moment." }, 503);
    }

    let parsed: import("../_shared/schemas.ts").DemoReadingLLM;
    try {
      parsed = DemoReadingLLMSchema.parse(extractJsonObject(content));
    } catch (schemaErr) {
      console.error("[demo-reading] schema validation failed:", schemaErr);
      parsed = {
        brutal_headline: `Your ${sunSign} Sun has been writing checks your patterns cannot cash.`,
        excerpt: "Your chart names the thing you have been circling. The full reading does not let you look away.",
      };
    }

    return json({
      success: true,
      sun_sign: sunSign,
      sun_degree: Math.round(demo.sun.degree),
      moon_sign: demo.moonSignCertain ? demo.moon.sign : null,
      sharpest_aspect: demo.sharpestAspect
        ? `${demo.sharpestAspect.planet1} ${demo.sharpestAspect.aspect} ${demo.sharpestAspect.planet2}`
        : null,
      brutal_headline: sanitizeVoice(parsed.brutal_headline),
      excerpt: sanitizeVoice(parsed.excerpt),
      birth_date,
    });
  } catch (error) {
    console.error("[demo-reading] fatal:", error);
    return json({ success: false, error: "Failed to generate your demo reading. Please try again." }, 500);
  }
});
