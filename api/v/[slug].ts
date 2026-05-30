// Server-rendered Verdict page at /v/{slug}. This is what every shared card
// deep-links to: a real, crawlable, unfurlable page (not the blank SPA shell),
// with per-reading OG tags and a tracked CTA back into the app. Edge runtime.

export const config = { runtime: "edge" };

const SB = process.env.VITE_SUPABASE_URL || "https://cgkcplcamsijghalintq.supabase.co";
const ANON = process.env.VITE_SUPABASE_ANON_KEY || "";

interface Verdict {
  slug: string;
  headline: string;
  excerpt?: string;
  sun_sign?: string;
  moon_sign?: string;
  rising_sign?: string;
  kind?: string;
}

function esc(s: string | undefined | null): string {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function slugFromUrl(u: string): string {
  const path = new URL(u).pathname.split("/").filter(Boolean);
  return decodeURIComponent(path[path.length - 1] || "");
}

async function fetchVerdict(slug: string): Promise<Verdict | null> {
  if (!ANON) return null;
  try {
    const r = await fetch(`${SB}/rest/v1/public_verdicts?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`, {
      headers: { apikey: ANON, authorization: `Bearer ${ANON}` },
    });
    if (!r.ok) return null;
    const rows = (await r.json()) as Verdict[];
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch {
    return null;
  }
}

export default async function handler(req: Request): Promise<Response> {
  const slug = slugFromUrl(req.url);
  const v = await fetchVerdict(slug);
  const origin = "https://merciless.app";

  if (!v) {
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Merciless</title>
<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="${origin}/">
<meta http-equiv="refresh" content="0; url=${origin}/"></head>
<body style="background:#0A0A0B;color:#F0EDE8;font-family:sans-serif;text-align:center;padding:4rem">
<p>This reading has moved. <a href="${origin}/" style="color:#F5A623">Get your own.</a></p></body></html>`;
    return new Response(html, { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  }

  const title = esc(v.headline);
  const desc = esc(v.excerpt || "Daily astrology readings from your actual natal chart. No comfort. Just what the chart says.");
  const ogImage = `${origin}/og/${encodeURIComponent(slug)}`;
  const pageUrl = `${origin}/v/${encodeURIComponent(slug)}`;
  const cta = `${origin}/?utm_source=verdict_share&utm_medium=referral&utm_campaign=verdict&utm_content=${encodeURIComponent(slug)}`;
  const big3 = [v.sun_sign && `Sun ${esc(v.sun_sign)}`, v.moon_sign && `Moon ${esc(v.moon_sign)}`, v.rising_sign && `Rising ${esc(v.rising_sign)}`].filter(Boolean).join("  ·  ");

  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Merciless">
<meta property="og:title" content="${title}"><meta property="og:description" content="${desc}">
<meta property="og:url" content="${pageUrl}"><meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}"><meta name="twitter:image" content="${ogImage}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  body{margin:0;background:radial-gradient(circle at 50% 0%,#0d0d14,#0A0A0B);color:#F0EDE8;font-family:'Space Grotesk',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem}
  .card{max-width:560px;width:100%;text-align:center}
  .signs{font-size:.75rem;letter-spacing:.25em;text-transform:uppercase;color:#6B6B7A;margin-bottom:1.5rem}
  .headline{font-size:clamp(1.6rem,6vw,2.4rem);font-weight:700;color:#F5A623;line-height:1.2;margin:0 0 1.25rem}
  .excerpt{color:#9B9B9B;font-size:1rem;line-height:1.6;margin:0 0 2.25rem}
  .cta{display:inline-block;background:#F5A623;color:#0A0A0B;font-weight:700;letter-spacing:.15em;text-transform:uppercase;font-size:.8rem;padding:.9rem 2rem;border-radius:.6rem;text-decoration:none}
  .mark{margin-top:2.5rem;font-size:.7rem;letter-spacing:.3em;text-transform:uppercase;color:#6B6B7A}
</style></head>
<body><div class="card">
  ${big3 ? `<div class="signs">${big3}</div>` : ""}
  <h1 class="headline">${title}</h1>
  ${v.excerpt ? `<p class="excerpt">${desc}</p>` : ""}
  <a class="cta" href="${cta}">Speak your birth date</a>
  <div class="mark">merciless.app</div>
</div>
<script>
  try{
    var cid = (document.cookie.match(/(?:^|; )mcl_cid=([^;]*)/)||[])[1] || '';
    fetch('${SB}/functions/v1/track',{method:'POST',headers:{'content-type':'application/json',apikey:'${ANON}',authorization:'Bearer ${ANON}'},keepalive:true,body:JSON.stringify({event:'verdict_viewed',anonymous_id:decodeURIComponent(cid)||null,utm_source:'verdict_share',utm_campaign:'verdict',landing_path:location.pathname,metadata:{slug:'${esc(slug)}'}})});
  }catch(e){}
</script>
</body></html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=3600" },
  });
}
