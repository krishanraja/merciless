// Merciless brand-voice engine.
//
// Two jobs, one place, shared by every function that emits model text
// (demo-reading, daily-reading, oracle) and by the fleet before it posts.
//
//   sanitizeVoice(text): always-safe mechanical cleanup applied to every model
//   output before a human or the fleet ever sees it. Removes em dashes by
//   CONTEXT (a comma, a colon, a period, or nothing), never the old
//   .replace(/—/g, ";") semicolon splice that turned one clause into two.
//
//   lintVoice(text): the detective pass. Flags the generic-AI tells the brand
//   forbids so the fleet auto-post gate can reject and regenerate, and so we can
//   log brand drift over time. Returns the sanitized text plus the violations.
//
// Brand law: no em dashes, no hedging, no "it is not X, it is Y" parallelism, no
// reflexive rule-of-three. The voice states what is. It never softens.

export type VoiceSeverity = "blocking" | "advisory";

export interface VoiceViolation {
  rule: string;
  severity: VoiceSeverity;
  detail: string;
}

export interface LintResult {
  clean: string;
  violations: VoiceViolation[];
  ok: boolean; // false when any blocking violation is present
}

// Unicode dashes we treat as em-dash-class: figure, en, em, horizontal bar.
const DASH_CLASS = "‒–—―";
const DASH_RE_SPACED = new RegExp(`\\s*[${DASH_CLASS}]\\s*`, "g");
const DASH_RE_RANGE = new RegExp(`(\\d)\\s*[–—]\\s*(\\d)`, "g");
const DASH_RE_LEAD = new RegExp(`^[\\s]*[${DASH_CLASS}]\\s*`);
const DASH_RE_TRAIL = new RegExp(`\\s*[${DASH_CLASS}]\\s*$`);
const DASH_RE_ANY = new RegExp(`[${DASH_CLASS}]`);

/**
 * Mechanical, grammar-safe cleanup. Idempotent. Never throws on bad input.
 */
export function sanitizeVoice(input: unknown): string {
  if (typeof input !== "string") return "";
  let t = input;

  // 1. Numeric ranges keep a plain hyphen: "3—5" / "3 – 5" -> "3-5".
  t = t.replace(DASH_RE_RANGE, "$1-$2");

  // 2. A double hyphen used as a dash -> comma join.
  t = t.replace(/ ?-- ?/g, ", ");

  // 3. Leading / trailing dash is decorative -> drop it.
  t = t.replace(DASH_RE_LEAD, "");
  t = t.replace(DASH_RE_TRAIL, "");

  // 4. Remaining dashes join clauses -> comma. ("Mars — your war — squares Venus"
  //    becomes "Mars, your war, squares Venus".)
  t = t.replace(DASH_RE_SPACED, ", ");

  // 5. Heal punctuation artifacts the joins can create.
  t = t
    .replace(/,\s*,/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/,\s*;/g, ";")
    .replace(/;\s*,/g, ";")
    .replace(/:\s*,/g, ":")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ");

  return t.trim();
}

const HEDGE_TERMS = [
  "might",
  "maybe",
  "perhaps",
  "possibly",
  "may want to",
  "you may",
  "it sounds like",
  "grain of salt",
  "trust the process",
  "everyone's experience differs",
  "consider",
  "tends to",
  "can sometimes",
  "in some ways",
];

// "it is not X, it is Y" / "this isn't X. it's Y" / "not X, but Y".
const NEGATIVE_PARALLELISM = [
  /\bit'?s not\b[^.!?]{1,60}?[.,]\s*it'?s\b/i,
  /\bit is not\b[^.!?]{1,60}?[.,]\s*it is\b/i,
  /\bisn'?t\b[^.,!?]{1,60},\s*it'?s\b/i,
  /\bnot\b[^.,!?]{1,50},\s*but\b/i,
];

// "word, word, and word" single-token triads (the reflexive rule of three).
const RULE_OF_THREE = /\b([A-Za-z]+),\s+([A-Za-z]+),?\s+and\s+([A-Za-z]+)\b/;

/**
 * Sanitize, then report what is still off-brand. The fleet posts only when
 * ok === true; generation pipelines can regenerate on a blocking violation.
 */
export function lintVoice(input: unknown): LintResult {
  const raw = typeof input === "string" ? input : "";
  const clean = sanitizeVoice(raw);
  const violations: VoiceViolation[] = [];

  // Dashes in the RAW output are brand drift even though sanitize fixed them.
  if (DASH_RE_ANY.test(raw)) {
    violations.push({
      rule: "em-dash",
      severity: "blocking",
      detail: "model emitted a dash from the em-dash class; sanitized to commas",
    });
  }

  const lower = clean.toLowerCase();
  for (const term of HEDGE_TERMS) {
    if (new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lower)) {
      violations.push({ rule: "hedging", severity: "blocking", detail: `hedging term: "${term}"` });
    }
  }

  for (const re of NEGATIVE_PARALLELISM) {
    if (re.test(clean)) {
      violations.push({
        rule: "negative-parallelism",
        severity: "blocking",
        detail: "it-is-not-X-it-is-Y construction",
      });
      break;
    }
  }

  if (RULE_OF_THREE.test(clean)) {
    violations.push({
      rule: "rule-of-three",
      severity: "advisory",
      detail: "reflexive three-item list; confirm it earns its place",
    });
  }

  const ok = violations.every((v) => v.severity !== "blocking");
  return { clean, violations, ok };
}

/**
 * Backward-compatible drop-in for the old per-function sanitizeEmDashes.
 * Existing call sites can switch to this with no behavior surprise beyond
 * getting commas instead of semicolons.
 */
export function sanitizeEmDashes(text: string): string {
  return sanitizeVoice(text);
}
