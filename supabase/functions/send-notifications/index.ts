// send-notifications: the retention engine. Cron-triggered (guarded by
// x-cron-secret). Sends the daily summons via web push (#16), a weekly letter
// via Resend email (#20, Mondays), and re-engages consented stalled-demo leads
// (#17). Transit lines are computed from the real ephemeris, no LLM cost.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { computeTransits } from "../_shared/ephemeris.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret" };
const ORIGIN = "https://merciless.app";

function natalLongitudes(planets: Record<string, { longitude?: number }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [n, p] of Object.entries(planets || {})) {
    if (n === "Ascendant" || n === "Midheaven") continue;
    if (p && typeof p.longitude === "number") out[n] = p.longitude;
  }
  return out;
}

function topTransitLine(planets: Record<string, { longitude?: number }>): string {
  try {
    const transits = computeTransits(natalLongitudes(planets), new Date());
    const t = transits.filter((x) => x.applying).sort((a, b) => a.orb - b.orb)[0] || transits.sort((a, b) => a.orb - b.orb)[0];
    if (!t) return "Your reading is ready. The chart has notes.";
    return `Transiting ${t.transiting_planet} ${t.aspect}s your natal ${t.natal_planet} today. Read it before you act.`;
  } catch {
    return "Your reading is ready. Brace yourself.";
  }
}

async function sendEmail(resendKey: string, to: string, subject: string, html: string): Promise<boolean> {
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: "Merciless <oracle@merciless.app>", to, subject, html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) console.warn("[send-notifications] resend", r.status, (await r.text()).slice(0, 160));
    return r.ok;
  } catch (e) { console.warn("[send-notifications] email failed:", (e as Error).message); return false; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const VAPID_PUB = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const VAPID_PRIV = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const VAPID_SUB = Deno.env.get("VAPID_SUBJECT") ?? "mailto:oracle@merciless.app";
  if (VAPID_PUB && VAPID_PRIV) webpush.setVapidDetails(VAPID_SUB, VAPID_PUB, VAPID_PRIV);

  const isMonday = new Date().getUTCDay() === 1;
  let pushSent = 0, emailSent = 0, leadsContacted = 0, pruned = 0;

  // 1. Daily push summons.
  const { data: prefs } = await supabase.from("notification_prefs").select("user_id, push_enabled, email_enabled").eq("unsubscribed", false);
  for (const pref of prefs ?? []) {
    const { data: chart } = await supabase.from("natal_charts").select("planets").eq("user_id", pref.user_id).single();
    const body = chart ? topTransitLine(chart.planets) : "Your reading is ready. Brace yourself.";
    if (pref.push_enabled && VAPID_PRIV) {
      const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", pref.user_id);
      for (const s of subs ?? []) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: "Merciless", body, url: "/reading", tag: "merciless-daily" }));
          pushSent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) { await supabase.from("push_subscriptions").delete().eq("id", s.id); pruned++; }
        }
      }
    }
    // Weekly letter (Mondays), email channel.
    if (isMonday && pref.email_enabled && resendKey) {
      const { data: u } = await supabase.auth.admin.getUserById(pref.user_id);
      const email = u?.user?.email;
      if (email) {
        const html = `<div style="font-family:sans-serif;background:#0A0A0B;color:#F0EDE8;padding:24px"><h2 style="color:#F5A623">Your week, no comfort</h2><p>${body}</p><p><a href="${ORIGIN}/reading?utm_source=email&utm_medium=weekly&utm_campaign=letter" style="color:#F5A623">Read the full thing</a></p></div>`;
        if (await sendEmail(resendKey, email, "Your week ahead, from your chart", html)) emailSent++;
      }
    }
  }

  // 2. Re-engage consented stalled-demo leads not contacted in 14 days (#17).
  if (resendKey) {
    const cutoff = new Date(Date.now() - 14 * 86400_000).toISOString();
    const { data: leads } = await supabase.from("lead_signals").select("id, email, sun_sign, unsubscribe_token").eq("unsubscribed", false).or(`last_contacted_at.is.null,last_contacted_at.lt.${cutoff}`).limit(200);
    for (const lead of leads ?? []) {
      const unsub = `${ORIGIN}/functions/v1/lead-unsubscribe?token=${lead.unsubscribe_token}`;
      const html = `<div style="font-family:sans-serif;background:#0A0A0B;color:#F0EDE8;padding:24px"><h2 style="color:#F5A623">Your chart is loud this week</h2><p>You asked me to tell you when it mattered. It does. Your ${lead.sun_sign ?? "chart"} is carrying a transit worth reading.</p><p><a href="${ORIGIN}/?utm_source=email&utm_medium=reengage&utm_campaign=transit_loud" style="color:#F5A623">See what the chart says</a></p><p style="font-size:11px;color:#6B6B7A">Only the chart's voice, never a sales push. <a href="${unsub}" style="color:#6B6B7A">One tap to stop.</a></p></div>`;
      if (await sendEmail(resendKey, lead.email, "Your chart is loud this week", html)) {
        await supabase.from("lead_signals").update({ last_contacted_at: new Date().toISOString() }).eq("id", lead.id);
        leadsContacted++;
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, pushSent, emailSent, leadsContacted, pruned, monday: isMonday }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
