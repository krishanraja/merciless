import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PER_FP_LIMIT = 20; // transcribe attempts per hour per fingerprint
const PER_FP_WINDOW_SECONDS = 3600;
const GLOBAL_DAILY_LIMIT = 3000; // ceiling on total free transcriptions / UTC day
const MAX_AUDIO_BYTES = 6 * 1024 * 1024; // 6 MB; a spoken date is well under this
const FETCH_TIMEOUT_MS = 20_000;

interface ParsedDate {
  iso: string; display: string; day: number; month: number; year: number;
  confidence: "high" | "medium" | "low"; interpretation: string;
}

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

function fingerprint(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") || "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";
  return `${ip}|${ua}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      console.error("[transcribe-date] OPENAI_API_KEY not set");
      return json({ success: false, error: "Voice input is unavailable right now. Please use the date picker.", transcript: null, parsed: null }, 503);
    }

    // Cost/abuse control: this endpoint is unauthenticated and calls two paid
    // OpenAI APIs, so it gets the same fingerprint rate limit + global daily
    // budget as the public demo, both fail-closed.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const fp = "tx|" + (await sha256Hex(fingerprint(req)));
    const { data: fpCount, error: fpErr } = await supabase.rpc("demo_rate_limit_bump", {
      p_fingerprint: fp, p_window_seconds: PER_FP_WINDOW_SECONDS,
    });
    if (fpErr || (typeof fpCount === "number" && fpCount > PER_FP_LIMIT)) {
      if (fpErr) console.error("[transcribe-date] rate-limit check failed:", fpErr.message);
      return json({ success: false, error: "Too many voice attempts. Please use the date picker.", transcript: null, parsed: null }, 429);
    }
    const { data: globalCount, error: globalErr } = await supabase.rpc("api_global_budget_bump", { p_bucket: "transcribe" });
    if (globalErr || (typeof globalCount === "number" && globalCount > GLOBAL_DAILY_LIMIT)) {
      if (globalErr) console.error("[transcribe-date] budget check failed:", globalErr.message);
      return json({ success: false, error: "Voice input is busy right now. Please use the date picker.", transcript: null, parsed: null }, 429);
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return json({ success: false, error: "Invalid upload.", transcript: null, parsed: null }, 400);
    }
    const audioFile = formData.get("audio");
    if (!(audioFile instanceof File)) {
      return json({ success: false, error: "No audio file provided.", transcript: null, parsed: null }, 400);
    }
    if (audioFile.size === 0) {
      return json({ success: false, error: "No speech detected. Please try again.", transcript: null, parsed: null }, 400);
    }
    if (audioFile.size > MAX_AUDIO_BYTES) {
      return json({ success: false, error: "That recording is too long. Please say just your birth date.", transcript: null, parsed: null }, 413);
    }

    // Step 1: Whisper transcription (timeout-bounded).
    const whisperForm = new FormData();
    whisperForm.append("file", audioFile, "audio.webm");
    whisperForm.append("model", "whisper-1");
    whisperForm.append("language", "en");
    whisperForm.append("prompt", "This is someone saying their date of birth. Examples: July 3rd 1987, the 25th of December 1995, March 2nd 2003, 15th of August 1990.");

    let whisperRes: Response;
    try {
      whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}` },
        body: whisperForm,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      console.error("[transcribe-date] whisper fetch failed:", err);
      return json({ success: false, error: "Voice transcription timed out. Please use the date picker.", transcript: null, parsed: null }, 503);
    }
    if (!whisperRes.ok) {
      console.error("[transcribe-date] whisper error:", whisperRes.status, (await whisperRes.text()).slice(0, 300));
      return json({ success: false, error: "Voice transcription is temporarily unavailable. Please use the date picker.", transcript: null, parsed: null }, 503);
    }
    const whisperData = await whisperRes.json();
    const transcript: string = whisperData?.text ?? "";
    if (!transcript.trim()) {
      return json({ success: false, error: "No speech detected. Please try again.", transcript: null, parsed: null }, 200);
    }

    // Step 2: GPT date parse (timeout-bounded).
    const today = new Date().toISOString().split("T")[0];
    let gptRes: Response;
    try {
      gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.1,
          max_tokens: 200,
          messages: [
            {
              role: "system",
              content: `You parse spoken birth dates. The date must be in the past, between 1900 and today (${today}). Handle formats like "July 3rd 1987", "3rd of July 1987", "03/07/1987". If the year is two digits, pick the plausible birth year. Respond with ONLY valid JSON: {"success": true|false, "day": 1-31, "month": 1-12, "year": 4-digit, "confidence": "high"|"medium"|"low", "interpretation": "brief", "error": "only if success false"}.`,
            },
            { role: "user", content: `Parse this spoken date: "${transcript}"` },
          ],
        }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      console.error("[transcribe-date] gpt fetch failed:", err);
      return json({ success: false, error: "Could not read the date. Please use the date picker.", transcript, parsed: null }, 503);
    }
    if (!gptRes.ok) {
      console.error("[transcribe-date] gpt error:", gptRes.status, (await gptRes.text()).slice(0, 300));
      return json({ success: false, error: "Could not read the date. Please use the date picker.", transcript, parsed: null }, 503);
    }

    const gptData = await gptRes.json();
    const gptContent: string = gptData?.choices?.[0]?.message?.content ?? "";
    let parsed: { success?: boolean; day?: number; month?: number; year?: number; confidence?: string; interpretation?: string; error?: string };
    try {
      parsed = JSON.parse(gptContent);
    } catch {
      const m = gptContent.match(/\{[\s\S]*\}/);
      if (!m) return json({ success: false, error: "Could not read the date. Please use the date picker.", transcript, parsed: null }, 200);
      parsed = JSON.parse(m[0]);
    }

    if (!parsed.success || !parsed.day || !parsed.month || !parsed.year) {
      return json({ success: false, error: parsed.error || "Could not understand the date. Please try again.", transcript, parsed: null }, 200);
    }

    const { day, month, year } = parsed as { day: number; month: number; year: number };
    const date = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(date.getTime()) || date.getUTCMonth() !== month - 1) {
      return json({ success: false, error: "That is not a valid date. Please try again.", transcript, parsed: null }, 200);
    }
    if (date.getTime() > Date.now()) {
      return json({ success: false, error: "A birth date cannot be in the future.", transcript, parsed: null }, 200);
    }
    if (year < 1900) {
      return json({ success: false, error: "Please provide a birth year after 1900.", transcript, parsed: null }, 200);
    }

    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const result: ParsedDate = {
      iso,
      display: date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }),
      day, month, year,
      confidence: (parsed.confidence as ParsedDate["confidence"]) ?? "medium",
      interpretation: parsed.interpretation ?? "",
    };

    return json({ success: true, transcript, parsed: result });
  } catch (error) {
    console.error("[transcribe-date] fatal:", error);
    return json({ success: false, error: "Failed to process audio. Please use the date picker.", transcript: null, parsed: null }, 500);
  }
});
