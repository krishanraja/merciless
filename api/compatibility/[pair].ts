// Sign-pair compatibility SEO page at /compatibility/{a}-{b}. Canonicalized to
// the alphabetical pair so a-b and b-a do not split ranking. Ends in the live
// two-chart synastry demo (real intent: "leo scorpio compatibility").
import { SIGNS, esc, pageShell, lastPathSegment } from "../_signs";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  const seg = lastPathSegment(req.url);
  const parts = seg.split("-");
  const a = SIGNS[parts[0]];
  const b = SIGNS[parts[1]];
  if (parts.length !== 2 || !a || !b) {
    return new Response(
      pageShell({ title: "Compatibility | Merciless", description: "Brutally honest astrology compatibility.", canonical: "https://merciless.app/", body: `<h1>Compatibility, <span class="accent">no comfort</span></h1><p>Try a pairing like /compatibility/leo-scorpio.</p><a class="cta" href="https://merciless.app/">Read a relationship</a>` }),
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  // Canonical = alphabetical order so the two directions do not compete.
  const sorted = [parts[0], parts[1]].sort();
  const canonical = `https://merciless.app/compatibility/${sorted[0]}-${sorted[1]}`;
  const title = `${a.name} and ${b.name} Compatibility: The Brutal Truth | Merciless`;
  const desc = `${a.name} and ${b.name}: what actually happens between you, read from the real charts. No comfort.`;
  const cta = `https://merciless.app/?utm_source=seo&utm_medium=organic&utm_campaign=compat_${sorted[0]}_${sorted[1]}`;
  const same = parts[0] === parts[1];
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${a.name} and ${b.name} Compatibility`,
    description: desc,
    isPartOf: { "@type": "WebSite", name: "Merciless", url: "https://merciless.app" },
  });

  const body = `
    <div class="kicker">${esc(a.element)} meets ${esc(b.element)}</div>
    <h1>${esc(a.name)} and ${esc(b.name)}: <span class="accent">what actually happens</span></h1>
    <p>${same
      ? `Two ${esc(a.name)} charts in a room is a mirror neither of you asked for. ${esc(a.truth)}`
      : `A ${esc(a.name)} brings ${esc(a.shadow)}. A ${esc(b.name)} brings ${esc(b.shadow)}. Put those two together and the friction is not a mystery, it is arithmetic.`}</p>
    <p>${same
      ? `You will recognize every move because you make it too, and that is exactly why it grates.`
      : `${esc(a.truth)} Meanwhile, ${esc(b.name.toLowerCase())} energy does the opposite: ${esc(b.truth)}`}</p>
    <h2>The honest version</h2>
    <p>Sun-sign compatibility is a parlor trick. What actually decides ${esc(a.name)} and ${esc(b.name)} is the synastry between your two full charts: where their Venus lands on your Mars, whose Saturn sits on whose Sun. Merciless reads the real inter-aspects and tells you the dynamic you both keep pretending not to see.</p>
    <h2>Read your real synastry</h2>
    <p>Two birth dates. One brutal verdict on what happens between you, free. The half about them is theirs to unlock.</p>
    <a class="cta violet" href="${cta}">Read a relationship</a>`;

  return new Response(pageShell({ title, description: desc, canonical, jsonLd, body }), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" },
  });
}
