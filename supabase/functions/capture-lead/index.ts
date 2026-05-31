// capture-lead: a consented stalled-demo lead (#17). Public, rate-limited. The
// person opted in (a plain checkbox) to be told when their chart goes loud.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const fp = "lead|" + (await sha256Hex(`${ip}|${req.headers.get("user-agent") ?? ""}`));
    const { data: c, error: e } = await supabase.rpc("demo_rate_limit_bump", { p_fingerprint: fp, p_window_seconds: 3600 });
    if (e || (typeof c === "number" && c > 10)) return json({ ok: false, error: "Too many requests." }, 429);

    let body: { email?: string; mcl_cid?: string; sun_sign?: string; birth_date?: string };
    try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid body" }, 400); }
    const email = (body.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: "A valid email is required." }, 400);

    const { error } = await supabase.from("lead_signals").upsert({
      email,
      mcl_cid: body.mcl_cid ?? null,
      sun_sign: body.sun_sign ?? null,
      birth_date: body.birth_date && /^\d{4}-\d{2}-\d{2}$/.test(body.birth_date) ? body.birth_date : null,
      source: "demo",
    }, { onConflict: "email", ignoreDuplicates: true });
    if (error) { console.error("[capture-lead] upsert failed:", error); return json({ ok: false, error: "Could not save." }, 500); }
    return json({ ok: true });
  } catch (e) {
    console.error("[capture-lead] fatal:", e);
    return json({ ok: false, error: "Something went wrong." }, 500);
  }
});
