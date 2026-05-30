// Shared data + HTML shell for the programmatic SEO pages (per-sign and
// per-compatibility). Server-rendered at the edge so they are real, crawlable,
// substantive pages (not doorway shells) and the fleet's link inventory.

export interface SignInfo {
  name: string;
  dates: string;
  element: string;
  ruler: string;
  shadow: string; // the brutal shadow, one line
  truth: string; // two to three sentences of brutal, specific copy
}

export const SIGNS: Record<string, SignInfo> = {
  aries: { name: "Aries", dates: "March 21 to April 19", element: "Fire", ruler: "Mars", shadow: "impatience disguised as passion, the need to be first, starting fires you will not tend", truth: "You confuse motion with progress and call it drive. Mars rules you, so you charge, and you mistake the charge for courage even when it is just an exit. Merciless says what your friends will not: you start because finishing means being judged." },
  taurus: { name: "Taurus", dates: "April 20 to May 20", element: "Earth", ruler: "Venus", shadow: "possessiveness masked as loyalty, comfort as a cage, refusing the change that is already happening", truth: "You call your stubbornness loyalty and your hoarding security. Venus makes you crave comfort, and you will sit in a life that stopped fitting years ago rather than feel one day of the unfamiliar. The chart is clear: you are not steady, you are stuck." },
  gemini: { name: "Gemini", dates: "May 21 to June 20", element: "Air", ruler: "Mercury", shadow: "scattered attention, surface connection, the fear of being pinned to one truth", truth: "You keep every door open so you never have to walk through one. Mercury makes you quick, and you use the speed to stay unaccountable. Merciless reads what the wit is hiding: you talk so much because silence would make you choose." },
  cancer: { name: "Cancer", dates: "June 21 to July 22", element: "Water", ruler: "Moon", shadow: "emotional leverage, victimhood as armor, love that smothers what it claims to protect", truth: "You give care with a receipt attached and call the resentment when it is not repaid a broken heart. The Moon rules your moods and you let them rule everyone near you. The chart does not flinch: your shell is not protection, it is a weapon." },
  leo: { name: "Leo", dates: "July 23 to August 22", element: "Fire", ruler: "Sun", shadow: "the need for an audience, ego that bruises in private, drama mistaken for warmth", truth: "You perform generosity and keep score of the applause. The Sun rules you, so you need to be seen, and you confuse being seen with being loved. Merciless says it plainly: the spotlight you chase is the proof you do not believe you matter without it." },
  virgo: { name: "Virgo", dates: "August 23 to September 22", element: "Earth", ruler: "Mercury", shadow: "criticism as control, perfectionism as self-sabotage, service that keeps you safely indispensable", truth: "You fix everyone else so no one looks too closely at you. Mercury makes you precise, and you turn the precision into a scalpel you point inward. The chart calls it: your standards are not high, they are a hiding place." },
  libra: { name: "Libra", dates: "September 23 to October 22", element: "Air", ruler: "Venus", shadow: "people-pleasing as cowardice, indecision as avoidance, harmony that is really fear", truth: "You call your conflict-avoidance fairness and your fence-sitting open-mindedness. Venus makes you want everyone comfortable, especially when the cost is your own position. Merciless reads the truth: you are not balanced, you are afraid to be disliked." },
  scorpio: { name: "Scorpio", dates: "October 23 to November 21", element: "Water", ruler: "Pluto and Mars", shadow: "control through secrecy, intensity as intimidation, grudges worn as identity", truth: "You withhold to stay powerful and call it depth. Pluto and Mars make you intense, and you use the intensity to keep people guessing so they can never leave first. The chart says what you bury: the secrecy is not mystery, it is fear of being known." },
  sagittarius: { name: "Sagittarius", dates: "November 22 to December 21", element: "Fire", ruler: "Jupiter", shadow: "honesty weaponized, commitment phobia, restlessness sold as freedom", truth: "You call running away a love of freedom and call cruelty just being honest. Jupiter makes you expansive, and you expand right past anyone who asks you to stay. Merciless names it: the horizon you chase is the thing you use to avoid arriving." },
  capricorn: { name: "Capricorn", dates: "December 22 to January 19", element: "Earth", ruler: "Saturn", shadow: "work as escape, status as self-worth, emotional unavailability dressed as discipline", truth: "You climb because standing still would make you feel the thing you climbed to avoid. Saturn rules you, so you call your coldness maturity and your overwork ambition. The chart is blunt: the summit you want will not love you back, and you know it." },
  aquarius: { name: "Aquarius", dates: "January 20 to February 18", element: "Air", ruler: "Uranus and Saturn", shadow: "detachment as superiority, rebellion without a cause, intimacy held at arm's length", truth: "You call your distance independence and your contrarianism principle. Uranus makes you the outsider, and you choose the outside so no one can require anything of you up close. Merciless reads it: you are not above connection, you are scared of it." },
  pisces: { name: "Pisces", dates: "February 19 to March 20", element: "Water", ruler: "Neptune and Jupiter", shadow: "escapism, boundaries as a foreign concept, the comfort of the wound", truth: "You drift and call it depth, you dissolve and call it empathy. Neptune blurs your edges, and you let it because a clear line would mean a decision you could be held to. The chart does not let you off: the fog is not soulful, it is a place to hide." },
};

export const SIGN_KEYS = Object.keys(SIGNS);

export function esc(s: string | undefined | null): string {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export function lastPathSegment(u: string): string {
  const p = new URL(u).pathname.split("/").filter(Boolean);
  return decodeURIComponent(p[p.length - 1] || "").toLowerCase();
}

// Branded page shell. title/description/canonical/og + body, dark cosmic.
export function pageShell(opts: {
  title: string;
  description: string;
  canonical: string;
  jsonLd?: string;
  body: string;
}): string {
  const og = "https://merciless.app/og-image.png";
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" type="image/png" sizes="32x32" href="https://merciless.app/favicon-32.png">
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.description)}">
<link rel="canonical" href="${opts.canonical}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Merciless">
<meta property="og:title" content="${esc(opts.title)}"><meta property="og:description" content="${esc(opts.description)}">
<meta property="og:url" content="${opts.canonical}"><meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(opts.title)}">
<meta name="twitter:description" content="${esc(opts.description)}"><meta name="twitter:image" content="${og}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
${opts.jsonLd ? `<script type="application/ld+json">${opts.jsonLd}</script>` : ""}
<style>
  body{margin:0;background:radial-gradient(circle at 50% 0%,#0d0d14,#0A0A0B);color:#F0EDE8;font-family:'Space Grotesk',system-ui,sans-serif;line-height:1.6}
  .wrap{max-width:680px;margin:0 auto;padding:3rem 1.5rem 5rem}
  a{color:#F5A623;text-decoration:none}
  h1{font-size:clamp(1.8rem,6vw,2.6rem);font-weight:700;line-height:1.15;margin:0 0 .5rem;color:#F0EDE8}
  h1 .accent{color:#F5A623}
  h2{font-size:1.25rem;font-weight:700;margin:2.5rem 0 .75rem;color:#F5A623}
  .kicker{font-size:.72rem;letter-spacing:.28em;text-transform:uppercase;color:#6B6B7A;margin-bottom:1rem}
  .meta{font-size:.8rem;color:#6B6B7A;margin:.5rem 0 2rem}
  p{margin:0 0 1.1rem;color:#D8D4CC}
  .shadow{color:#9B9B9B;font-style:italic}
  .cta{display:inline-block;margin-top:1rem;background:#F5A623;color:#0A0A0B;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:.8rem;padding:.9rem 1.8rem;border-radius:.6rem}
  .cta.violet{background:#7B2FBE;color:#fff}
  .mark{margin-top:3rem;font-size:.7rem;letter-spacing:.3em;text-transform:uppercase;color:#6B6B7A}
  .mark a{color:#6B6B7A}
</style></head>
<body><div class="wrap">${opts.body}<div class="mark"><a href="https://merciless.app/">MERCILESS.APP</a> · brutally honest astrology from your real chart</div></div></body></html>`;
}
