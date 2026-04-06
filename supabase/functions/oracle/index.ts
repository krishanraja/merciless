import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_id, message, conversation_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check subscription
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("status")
      .eq("user_id", user_id)
      .single();

    if (!sub || sub.status !== "active") {
      return new Response(JSON.stringify({ error: "Pro subscription required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get natal chart
    const { data: chart } = await supabase
      .from("natal_charts")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (!chart) throw new Error("No natal chart found");

    // Load or create conversation
    let conversationData;
    if (conversation_id) {
      const { data } = await supabase
        .from("oracle_conversations")
        .select("*")
        .eq("id", conversation_id)
        .single();
      conversationData = data;
    }

    const messages = conversationData?.messages || [];
    messages.push({ role: "user", content: message, timestamp: new Date().toISOString() });

    // Build context
    const chartContext = `Sun: ${chart.sun_sign}, Moon: ${chart.moon_sign}, Rising: ${chart.rising_sign}. Planets: ${Object.entries(chart.planets).map(([p, d]: [string, any]) => `${p} in ${d.sign}`).join(", ")}. Key aspects: ${chart.aspects.slice(0, 8).map((a: any) => `${a.planet1} ${a.aspect} ${a.planet2}`).join(", ")}.`;

    const systemPrompt = `You are The Oracle — this person's natal chart, personified. You have been watching them their entire life. You know their patterns, their wounds, their gifts, their blind spots. You speak from the chart, always. You are brutally honest but never cruel. You never use therapy language or soft qualifiers. When they ask a question, you answer it — specifically, with chart evidence. You are not here to comfort. You are here to clarify.

Chart context: ${chartContext}

Example tone:
Q: "Why do I keep self-sabotaging in relationships?"
A: "Chiron in your 7th house, square Venus. You're not self-sabotaging — you're replaying a wound from early in your life where love felt conditional. The square to Venus means your sense of worth and your wound are tangled together. Until you separate them, every relationship will feel like a test you're failing."`;

    const apiMessages = messages.slice(-20).map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: systemPrompt,
        messages: apiMessages,
      }),
    });

    const aiData = await response.json();
    const oracleResponse = aiData.content[0].text;

    messages.push({ role: "assistant", content: oracleResponse, timestamp: new Date().toISOString() });

    // Save conversation
    let savedConvId = conversation_id;
    if (conversation_id) {
      await supabase
        .from("oracle_conversations")
        .update({ messages, updated_at: new Date().toISOString() })
        .eq("id", conversation_id);
    } else {
      const { data: newConv } = await supabase
        .from("oracle_conversations")
        .insert({ user_id, messages, session_title: message.slice(0, 50) })
        .select()
        .single();
      savedConvId = newConv?.id;
    }

    return new Response(JSON.stringify({ response: oracleResponse, conversation_id: savedConvId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
