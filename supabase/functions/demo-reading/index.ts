import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { callLLM } from "../_shared/llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PER_FP_LIMIT = 10;            // requests per hour per fingerprint
const PER_FP_WINDOW_SECONDS = 3600; // 1 hour
const GLOBAL_DAILY_LIMIT = 2000;    // ceiling on total free demo LLM calls / UTC day

// Sanitize AI output: replace em dashes with appropriate punctuation
function sanitizeEmDashes(text: string): string {
  return text.replace(/—/g, ";");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

async function checkRateLimits(
  client: RateLimitClient,
  fingerprint: string,
): Promise<{ blocked: boolean; reason?: string }> {
  // Fingerprint-level bump (atomic in Postgres)
  const { data: fpCount, error: fpErr } = await client.rpc(
    "demo_rate_limit_bump",
    { p_fingerprint: fingerprint, p_window_seconds: PER_FP_WINDOW_SECONDS },
  );
  if (fpErr) {
    // Fail closed on DB error — better to show an error than run up LLM bills
    return { blocked: true, reason: `rate-limit check failed: ${fpErr.message}` };
  }
  if (typeof fpCount === "number" && fpCount > PER_FP_LIMIT) {
    return { blocked: true, reason: "per-fingerprint hourly limit reached" };
  }

  // Global daily budget bump
  const { data: globalCount, error: globalErr } = await client.rpc(
    "demo_global_budget_bump",
  );
  if (globalErr) {
    return { blocked: true, reason: `global budget check failed: ${globalErr.message}` };
  }
  if (typeof globalCount === "number" && globalCount > GLOBAL_DAILY_LIMIT) {
    return { blocked: true, reason: "daily demo budget reached" };
  }

  return { blocked: false };
}

function getSunSign(month: number, day: number): string {
  const signs = [
    { sign: "Capricorn", start: [1, 1], end: [1, 19] },
    { sign: "Aquarius", start: [1, 20], end: [2, 18] },
    { sign: "Pisces", start: [2, 19], end: [3, 20] },
    { sign: "Aries", start: [3, 21], end: [4, 19] },
    { sign: "Taurus", start: [4, 20], end: [5, 20] },
    { sign: "Gemini", start: [5, 21], end: [6, 20] },
    { sign: "Cancer", start: [6, 21], end: [7, 22] },
    { sign: "Leo", start: [7, 23], end: [8, 22] },
    { sign: "Virgo", start: [8, 23], end: [9, 22] },
    { sign: "Libra", start: [9, 23], end: [10, 22] },
    { sign: "Scorpio", start: [10, 23], end: [11, 21] },
    { sign: "Sagittarius", start: [11, 22], end: [12, 21] },
    { sign: "Capricorn", start: [12, 22], end: [12, 31] },
  ];

  for (const { sign, start, end } of signs) {
    const afterStart = month > start[0] || (month === start[0] && day >= start[1]);
    const beforeEnd = month < end[0] || (month === end[0] && day <= end[1]);
    
    if (afterStart && beforeEnd) {
      return sign;
    }
  }
  
  return "Capricorn"; // fallback
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
      return new Response(JSON.stringify({
        error: "Too many requests. Please try again later.",
        success: false,
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { birth_date } = await req.json();

    if (!birth_date) {
      throw new Error("Birth date is required");
    }

    // Parse the date
    const [year, month, day] = birth_date.split("-").map(Number);
    
    if (!year || !month || !day) {
      throw new Error("Invalid date format. Use YYYY-MM-DD");
    }

    // Calculate Sun sign
    const sunSign = getSunSign(month, day);
    const traits = signTraits[sunSign];

    // Generate brutal headline with Claude
    const systemPrompt = `You are The Oracle. Brutally honest, never softening the truth. You speak with absolute authority. You are not mean; you are precise. The difference between cruelty and clarity is evidence.

Generate a brutal, shareable headline for someone with this Sun sign. The headline should:
- Be 12-15 words maximum
- Hit hard but be insightful, not just mean
- Feel personally targeted (even though it's based on Sun sign)
- Be quotable and shareable
- Never use therapy language or hedging
- Reference the sign's shadow traits: ${traits}

CRITICAL FORMATTING RULE: NEVER use em dashes (—) in your response. Use commas, periods, semicolons, or colons instead. This is non-negotiable.`;

    const userPrompt = `Generate a brutal headline for a ${sunSign} Sun. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.

Respond with ONLY valid JSON (no markdown):
{
  "brutal_headline": "The headline here",
  "excerpt": "A 20-30 word expansion that teases the full reading"
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
      console.error("LLM error (demo-reading):", err);
      return new Response(JSON.stringify({
        success: false,
        error: "Reading generation is temporarily unavailable. Please try again later.",
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        // Fallback
        parsed = {
          brutal_headline: "The stars have something to say. You're not going to like it.",
          excerpt: "Your chart reveals patterns you've been avoiding. The Oracle sees what you won't admit.",
        };
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sun_sign: sunSign,
      brutal_headline: sanitizeEmDashes(parsed.brutal_headline),
      excerpt: sanitizeEmDashes(parsed.excerpt),
      birth_date,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Demo reading error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || "Failed to generate demo reading",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
