import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callLLM, callLLMStream, type LLMMessage } from "../_shared/llm.ts";
import { sanitizeVoice } from "../_shared/brand-voice.ts";

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

    let body: { message?: unknown; conversation_id?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid request body" }, 400);
    }
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const conversation_id = typeof body.conversation_id === "string" ? body.conversation_id : null;
    const wantStream = (body as { stream?: unknown }).stream === true;
    if (!message) return json({ error: "Ask the Oracle something." }, 400);

    // Hard Pro gate.
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("status")
      .eq("user_id", user_id)
      .single();
    if (!sub || sub.status !== "active") return json({ error: "Pro subscription required" }, 403);

    const { data: chart } = await supabase
      .from("natal_charts")
      .select("*")
      .eq("user_id", user_id)
      .single();
    if (!chart) return json({ error: "No natal chart found. Complete onboarding first.", code: "no_chart" }, 409);

    // Load the conversation only if it belongs to this user. An unknown or
    // unowned id is treated as a new conversation (never an update of another
    // user's row).
    let owned: { id: string; messages: unknown[] } | null = null;
    if (conversation_id) {
      const { data } = await supabase
        .from("oracle_conversations")
        .select("id, messages")
        .eq("id", conversation_id)
        .eq("user_id", user_id)
        .single();
      if (data) owned = data as { id: string; messages: unknown[] };
    }

    const messages: Array<{ role: string; content: string; timestamp: string }> =
      (owned?.messages as Array<{ role: string; content: string; timestamp: string }>) || [];
    messages.push({ role: "user", content: message, timestamp: new Date().toISOString() });

    const planetLine = Object.entries(chart.planets as Record<string, { sign?: string; degree?: number; retrograde?: boolean }>)
      .filter(([n]) => !["_meta"].includes(n))
      .map(([p, d]) => `${p} in ${d.sign}${d.retrograde ? " (retrograde)" : ""}`)
      .join(", ");
    const chartContext = `Sun: ${chart.sun_sign}, Moon: ${chart.moon_sign}, Rising: ${chart.rising_sign ?? "unknown (no birth time)"}. Placements: ${planetLine}. Key aspects: ${(chart.aspects as Array<{ planet1: string; aspect: string; planet2: string }>).slice(0, 8).map((a) => `${a.planet1} ${a.aspect} ${a.planet2}`).join(", ")}.`;

    const systemPrompt = `You are The Oracle, this person's natal chart given a voice. You have watched them their whole life and you know their patterns, wounds, gifts, and blind spots. You answer the question they asked, specifically, with chart evidence, every time. You are brutally honest and never cruel. You never use therapy language or soft qualifiers. You are not here to comfort, you are here to clarify. The placements below are computed to the arc-minute, so cite them precisely and never invent a placement that is not listed.

VOICE RULES: Never use em dashes, use commas, periods, colons, or semicolons. Never use the words might, maybe, perhaps, or consider. Never write "it is not X, it is Y". State what is.

Chart: ${chartContext}

TONE: ${chart.rising_sign ? "This person knows their birth time and reads charts; be precise and technical, cite degrees and aspects." : "This person does not know their birth time; lead with the emotional core, not house technicalities."}`;

    const MAX_MSG_CHARS = 4000;
    const apiMessages: LLMMessage[] = messages.slice(-20).map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: (m.content ?? "").slice(0, MAX_MSG_CHARS),
    }));

    // Streaming path: stream tokens live, then persist the sanitized full text
    // BEFORE closing the stream (so the DB write finishes while the isolate is
    // alive). The conversation id is minted upfront for the response header.
    if (wantStream) {
      const convId = owned?.id ?? crypto.randomUUID();
      const stripDash = (s: string) => s.replace(/[‒–—―]/g, ", ");
      const encoder = new TextEncoder();
      const streamBody = new ReadableStream<Uint8Array>({
        async start(controller) {
          let full = "";
          const persist = async () => {
            const clean = sanitizeVoice(full);
            if (!clean) return;
            messages.push({ role: "assistant", content: clean, timestamp: new Date().toISOString() });
            if (owned) {
              await supabase.from("oracle_conversations")
                .update({ messages, updated_at: new Date().toISOString() })
                .eq("id", owned.id).eq("user_id", user_id);
            } else {
              await supabase.from("oracle_conversations")
                .insert({ id: convId, user_id, messages, session_title: message.slice(0, 50) });
            }
          };
          try {
            for await (const delta of callLLMStream({ system: systemPrompt, messages: apiMessages, maxTokens: 512 })) {
              full += delta;
              controller.enqueue(encoder.encode(stripDash(delta)));
            }
            await persist();
          } catch (err) {
            console.error("[oracle] stream error:", err);
            if (!full) controller.enqueue(encoder.encode("The Oracle is gathering itself. Please ask again in a moment."));
            else { try { await persist(); } catch (e) { console.error("[oracle] persist failed:", e); } }
          } finally {
            controller.close();
          }
        },
      });
      return new Response(streamBody, {
        headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8", "x-conversation-id": convId, "Cache-Control": "no-cache" },
      });
    }

    let oracleResponse: string;
    try {
      const result = await callLLM({ system: systemPrompt, messages: apiMessages, maxTokens: 512 });
      oracleResponse = sanitizeVoice(result.text);
    } catch (err) {
      console.error("[oracle] LLM error:", err);
      return json({ error: "The Oracle is gathering itself. Please ask again in a moment." }, 503);
    }

    messages.push({ role: "assistant", content: oracleResponse, timestamp: new Date().toISOString() });

    // Persist, and treat a persistence failure as real (do not pretend it saved).
    let savedConvId = owned?.id ?? null;
    if (owned) {
      const { error: updErr } = await supabase
        .from("oracle_conversations")
        .update({ messages, updated_at: new Date().toISOString() })
        .eq("id", owned.id)
        .eq("user_id", user_id);
      if (updErr) console.error("[oracle] conversation update failed:", updErr);
    } else {
      const { data: newConv, error: insErr } = await supabase
        .from("oracle_conversations")
        .insert({ user_id, messages, session_title: message.slice(0, 50) })
        .select("id")
        .single();
      if (insErr) console.error("[oracle] conversation insert failed:", insErr);
      savedConvId = newConv?.id ?? null;
    }

    return json({ response: oracleResponse, conversation_id: savedConvId });
  } catch (error) {
    console.error("[oracle] fatal:", error);
    return json({ error: "The Oracle is temporarily unavailable. Please try again." }, 500);
  }
});
