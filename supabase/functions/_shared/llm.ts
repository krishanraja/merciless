// Shared LLM helper: Gemini primary, OpenAI fallback.
// Used by demo-reading, daily-reading, and oracle edge functions.

const GEMINI_MODEL = "gemini-2.5-flash";
const OPENAI_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;

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

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = (err as Error).message ?? String(err);
      // Don't retry 4xx auth/quota errors
      if (/\b4\d\d\b/.test(msg) && !/\b408\b|\b429\b/.test(msg)) throw err;
      if (attempt < MAX_ATTEMPTS) {
        const backoff = 500 * attempt;
        console.warn(`${label} attempt ${attempt} failed (${msg}); retrying in ${backoff}ms`);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }
  throw lastErr;
}

export async function callLLM(opts: LLMCallOptions): Promise<LLMResult> {
  const { system, messages, maxTokens, temperature = 0.9 } = opts;
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  let geminiError: string | undefined;
  if (geminiKey) {
    try {
      const text = await withRetry(
        () => callGemini({ system, messages, maxTokens, temperature, apiKey: geminiKey }),
        "Gemini",
      );
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
    const text = await withRetry(
      () => callOpenAI({ system, messages, maxTokens, temperature, apiKey: openaiKey }),
      "OpenAI",
    );
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
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
