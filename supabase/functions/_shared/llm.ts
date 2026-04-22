// Shared LLM helper: Gemini primary, OpenAI fallback.
// Used by demo-reading, daily-reading, and oracle edge functions.

const GEMINI_MODEL = "gemini-2.5-flash";
const OPENAI_MODEL = "gpt-4o-mini";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMResult {
  text: string;
  provider: "gemini" | "openai";
}

export interface LLMCallOptions {
  system: string;
  messages: LLMMessage[];
  maxTokens: number;
  temperature?: number;
}

export async function callLLM(opts: LLMCallOptions): Promise<LLMResult> {
  const { system, messages, maxTokens, temperature = 0.9 } = opts;
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  let geminiError: string | undefined;
  if (geminiKey) {
    try {
      const text = await callGemini({ system, messages, maxTokens, temperature, apiKey: geminiKey });
      return { text, provider: "gemini" };
    } catch (err) {
      geminiError = (err as Error).message;
      console.error("Gemini call failed, falling back to OpenAI:", geminiError);
    }
  } else {
    geminiError = "GEMINI_API_KEY not set";
  }

  if (!openaiKey) {
    throw new Error(
      `All LLM providers failed. Gemini: ${geminiError}. OpenAI: OPENAI_API_KEY not set.`,
    );
  }

  try {
    const text = await callOpenAI({ system, messages, maxTokens, temperature, apiKey: openaiKey });
    return { text, provider: "openai" };
  } catch (err) {
    const openaiError = (err as Error).message;
    throw new Error(
      `All LLM providers failed. Gemini: ${geminiError}. OpenAI: ${openaiError}.`,
    );
  }
}

interface ProviderCallOptions {
  system: string;
  messages: LLMMessage[];
  maxTokens: number;
  temperature: number;
  apiKey: string;
}

async function callGemini(opts: ProviderCallOptions): Promise<string> {
  const { system, messages, maxTokens, temperature, apiKey } = opts;
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 500)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") {
    throw new Error(`Gemini returned no text (finishReason=${data?.candidates?.[0]?.finishReason ?? "unknown"})`);
  }
  return text;
}

async function callOpenAI(opts: ProviderCallOptions): Promise<string> {
  const { system, messages, maxTokens, temperature, apiKey } = opts;
  const apiMessages: Array<{ role: string; content: string }> = [
    { role: "system", content: system },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: apiMessages,
      max_tokens: maxTokens,
      temperature,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 500)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    throw new Error("OpenAI returned no text");
  }
  return text;
}
