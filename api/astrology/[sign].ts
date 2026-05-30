// Per-sign SEO page at /astrology/{sign}. Real, substantive, server-rendered.
import { SIGNS, lastPathSegment, esc, pageShell, SIGN_KEYS } from "../_signs";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  const key = lastPathSegment(req.url);
  const s = SIGNS[key];
  if (!s) {
    const links = SIGN_KEYS.map((k) => `<a href="/astrology/${k}">${esc(SIGNS[k].name)}</a>`).join(" · ");
    return new Response(
      pageShell({ title: "Astrology by sign | Merciless", description: "Brutally honest astrology for every sign.", canonical: "https://merciless.app/astrology", body: `<h1>Astrology, <span class="accent">no comfort</span></h1><p>Pick a sign:</p><p>${links}</p><a class="cta" href="https://merciless.app/">Speak your birth date</a>` }),
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  const title = `${s.name}: The Brutal Truth Your Chart Tells You | Merciless`;
  const desc = `${s.name} (${s.dates}). ${s.shadow}. Daily astrology from your real natal chart, no comfort, just what the chart says.`;
  const canonical = `https://merciless.app/astrology/${key}`;
  const cta = `https://merciless.app/?utm_source=seo&utm_medium=organic&utm_campaign=sign_${key}`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${s.name}: The Brutal Truth Your Chart Tells You`,
    description: desc,
    about: `${s.name} astrology`,
    isPartOf: { "@type": "WebSite", name: "Merciless", url: "https://merciless.app" },
    publisher: { "@type": "Organization", name: "Merciless", url: "https://merciless.app" },
  });

  const body = `
    <div class="kicker">${esc(s.element)} · Ruled by ${esc(s.ruler)}</div>
    <h1>${esc(s.name)}: <span class="accent">the truth your chart tells you</span></h1>
    <div class="meta">${esc(s.dates)}</div>
    <p class="shadow">${esc(s.shadow)}.</p>
    <p>${esc(s.truth)}</p>
    <h2>What a ${esc(s.name)} daily reading sounds like</h2>
    <p>Merciless reads your actual natal chart, computed to the arc-minute, not your Sun sign alone. For a ${esc(s.name)} that usually starts exactly where you least want it to. No horoscope mush, no therapy language, no hedging. Just the placement, the transit, and the verdict.</p>
    <h2>Is your Sun in ${esc(s.name)} the whole story</h2>
    <p>No. Your Moon, your Rising, and the aspects between your planets are where the real read lives, and most of them are nothing like your Sun sign. The free demo gives you a brutal headline from your date alone. The full reading uses the whole chart.</p>
    <h2>Get your ${esc(s.name)} reading</h2>
    <p>Speak your birth date. In under a minute you get a brutal, chart-evidenced headline, free, no signup.</p>
    <a class="cta" href="${cta}">Speak your birth date</a>`;

  return new Response(pageShell({ title, description: desc, canonical, jsonLd, body }), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" },
  });
}
