// Run: deno test supabase/functions/_shared/brand-voice.test.ts
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { sanitizeVoice, lintVoice } from "./brand-voice.ts";

Deno.test("spaced em dash becomes a comma, not a semicolon splice", () => {
  assertEquals(
    sanitizeVoice("Your Mars in Scorpio — the one you call casual — squares Venus."),
    "Your Mars in Scorpio, the one you call casual, squares Venus.",
  );
});

Deno.test("unspaced em dash becomes a comma", () => {
  assertEquals(sanitizeVoice("You knew this—you just refused to hear it."), "You knew this, you just refused to hear it.");
});

Deno.test("numeric ranges keep a hyphen", () => {
  assertEquals(sanitizeVoice("Orb of 3—5 degrees."), "Orb of 3-5 degrees.");
});

Deno.test("leading and trailing dashes are dropped", () => {
  assertEquals(sanitizeVoice("— Brace yourself —"), "Brace yourself");
});

Deno.test("double hyphen treated as a dash", () => {
  assertEquals(sanitizeVoice("Saturn returns -- you are out of excuses."), "Saturn returns, you are out of excuses.");
});

Deno.test("en dash and horizontal bar are handled", () => {
  assertEquals(sanitizeVoice("Truth – not comfort."), "Truth, not comfort.");
});

Deno.test("idempotent", () => {
  const once = sanitizeVoice("Mars — war — Venus.");
  assertEquals(sanitizeVoice(once), once);
});

Deno.test("non-string input is safe", () => {
  assertEquals(sanitizeVoice(undefined), "");
  assertEquals(sanitizeVoice(null), "");
  assertEquals(sanitizeVoice(42 as unknown), "");
});

Deno.test("no double punctuation after joins", () => {
  assert(!sanitizeVoice("You stalled, — again.").includes(", ,"));
  assertEquals(sanitizeVoice("You stalled, — again."), "You stalled, again.");
});

Deno.test("lint flags raw em dash as blocking", () => {
  const r = lintVoice("This is hers — yours is sharper.");
  assert(r.violations.some((v) => v.rule === "em-dash" && v.severity === "blocking"));
  assert(!r.ok);
  assertEquals(r.clean, "This is hers, yours is sharper.");
});

Deno.test("lint flags hedging as blocking", () => {
  const r = lintVoice("You might want to consider that you are the problem.");
  assert(r.violations.some((v) => v.rule === "hedging"));
  assert(!r.ok);
});

Deno.test("lint flags negative parallelism", () => {
  const r = lintVoice("It is not a horoscope. It is a verdict.");
  assert(r.violations.some((v) => v.rule === "negative-parallelism"));
  assert(!r.ok);
});

Deno.test("lint flags rule of three as advisory only", () => {
  const r = lintVoice("Sharp, honest, and merciless.");
  assert(r.violations.some((v) => v.rule === "rule-of-three" && v.severity === "advisory"));
  assert(r.ok); // advisory does not block
});

Deno.test("clean brutal copy passes", () => {
  const r = lintVoice("Your chart has always known. You just were not ready to listen.");
  assertEquals(r.violations.length, 0);
  assert(r.ok);
});
