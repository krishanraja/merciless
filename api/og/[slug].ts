// Dynamic Open Graph image for /og/{slug}, rendered server-side with @vercel/og
// so every shared Verdict link unfurls with its own brand-colored card instead
// of the generic site image. Edge runtime. Built with React.createElement to
// avoid relying on JSX transform in a non-Next /api context.

import { ImageResponse } from "@vercel/og";
import React from "react";

export const config = { runtime: "edge" };

const SB = process.env.VITE_SUPABASE_URL || "https://cgkcplcamsijghalintq.supabase.co";
const ANON = process.env.VITE_SUPABASE_ANON_KEY || "";

interface Verdict {
  headline?: string;
  sun_sign?: string;
  moon_sign?: string;
  rising_sign?: string;
}

function slugFromUrl(u: string): string {
  const path = new URL(u).pathname.split("/").filter(Boolean);
  return decodeURIComponent(path[path.length - 1] || "");
}

async function fetchVerdict(slug: string): Promise<Verdict | null> {
  if (!ANON || !slug) return null;
  try {
    const r = await fetch(`${SB}/rest/v1/public_verdicts?slug=eq.${encodeURIComponent(slug)}&select=headline,sun_sign,moon_sign,rising_sign&limit=1`, {
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
  const v = await fetchVerdict(slugFromUrl(req.url));
  const headline = (v?.headline || "Your chart has always known.").slice(0, 180);
  const signs = [
    v?.sun_sign && `Sun ${v.sun_sign}`,
    v?.moon_sign && `Moon ${v.moon_sign}`,
    v?.rising_sign && `Rising ${v.rising_sign}`,
  ].filter(Boolean).join("    ");

  const h = React.createElement;
  const element = h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "#0A0A0B",
        backgroundImage: "radial-gradient(circle at 50% 0%, #15151f, #0A0A0B)",
        padding: "80px",
        fontFamily: "sans-serif",
      },
    },
    signs
      ? h("div", { style: { color: "#6B6B7A", fontSize: 28, letterSpacing: 6, textTransform: "uppercase", marginBottom: 40, display: "flex" } }, signs)
      : null,
    h("div", { style: { color: "#F5A623", fontSize: 66, fontWeight: 700, lineHeight: 1.15, display: "flex" } }, headline),
    h("div", { style: { color: "#6B6B7A", fontSize: 26, letterSpacing: 8, textTransform: "uppercase", marginTop: 56, display: "flex" } }, "merciless.app"),
  );

  return new ImageResponse(element, {
    width: 1200,
    height: 630,
    headers: { "cache-control": "public, max-age=300, s-maxage=86400" },
  });
}
