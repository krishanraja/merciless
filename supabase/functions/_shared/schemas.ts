// Zod schemas for LLM JSON outputs. Every LLM JSON response must parse
// through one of these before being trusted by the rest of the pipeline.

import { z } from "https://esm.sh/zod@3.23.8";

export const StoicActionSchema = z.object({
  action: z.string().min(1).max(500),
  why: z.string().min(1).max(500),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

export const DailyReadingLLMSchema = z.object({
  brutal_headline: z.string().min(1).max(300),
  reading_text: z.string().min(1).max(5000),
  stoic_actions: z.array(StoicActionSchema).max(10).default([]),
  planet_focus: z.string().max(50).optional().default("Sun"),
  intensity_level: z.number().int().min(1).max(10).optional().default(5),
});
export type DailyReadingLLM = z.infer<typeof DailyReadingLLMSchema>;

export const DemoReadingLLMSchema = z.object({
  brutal_headline: z.string().min(1).max(300),
  excerpt: z.string().min(1).max(500),
});
export type DemoReadingLLM = z.infer<typeof DemoReadingLLMSchema>;

// Attempt JSON.parse; if that fails, extract the first {...} substring and
// retry. Returns the raw string if no valid JSON object is found so the
// caller can log it alongside the schema failure.
export function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("LLM response contained no JSON object");
    return JSON.parse(match[0]);
  }
}
