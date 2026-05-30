// tts: speak an Oracle line aloud. Public but rate-limited + budget-capped like
// the other unauthenticated paid endpoints. Returns audio/mpeg from OpenAI tts-1
// in the deep "onyx" voice (fits the brutal Oracle).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PER_FP_LIMIT = 40;
const WINDOW = 3600;
const GLOBAL_DAILY_LIMIT = 4000;
const MAX_CHARS = 1200;
const TIMEOUT_MS = 20_000;

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const err = (m: string, s: number) => new Response(JSON.stringify({ error: m }), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return err("Voice is unavailable right now.", 503);

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const fp = "tts|" + (await sha256Hex(`${ip}|${req.headers.get("user-agent") ?? ""}`));
  const { data: fpc, error: fpe } = await supabase.rpc("demo_rate_limit_bump", { p_fingerprint: fp, p_window_seconds: WINDOW });
  if (fpe || (typeof fpc === "number" && fpc > PER_FP_LIMIT)) return err("Too many requests.", 429);
  const { data: gc, error: ge } = await supabase.rpc("api_global_budget_bump", { p_bucket: "tts" });
  if (ge || (typeof gc === "number" && gc > GLOBAL_DAILY_LIMIT)) return err("Voice is busy right now.", 429);

  let text = "";
  try {
    text = String(((await req.json()) as { text?: unknown }).text ?? "").slice(0, MAX_CHARS);
  } catch {
    return err("Invalid body", 400);
  }
  if (!text.trim()) return err("Nothing to speak.", 400);

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", voice: "onyx", input: text, response_format: "mp3" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    console.error("[tts] fetch failed:", e);
    return err("Voice timed out.", 503);
  }
  if (!res.ok) {
    console.error("[tts] openai error:", res.status, (await res.text()).slice(0, 200));
    return err("Voice is temporarily unavailable.", 503);
  }
  const audio = await res.arrayBuffer();
  return new Response(audio, {
    headers: { ...corsHeaders, "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=3600" },
  });
});
