// lead-unsubscribe: one-tap-off for the consented re-engagement emails (#17).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const html = (msg: string) => new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Merciless</title></head><body style="background:#0A0A0B;color:#F0EDE8;font-family:sans-serif;text-align:center;padding:4rem 1.5rem"><p style="font-size:1.1rem">${msg}</p><p><a href="https://merciless.app/" style="color:#F5A623">merciless.app</a></p></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
  if (!token) return html("Invalid link.");
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    await supabase.from("lead_signals").update({ unsubscribed: true }).eq("unsubscribe_token", token);
    return html("Done. The chart will not reach out again.");
  } catch {
    return html("Something went wrong, but you will not be contacted again.");
  }
});
