// Run: deno test --allow-net supabase/functions/_shared/ephemeris.test.ts
import { assert, assertAlmostEquals, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import * as A from "https://esm.sh/astronomy-engine@2.1.19";
import { computeChart, computeDateOnlyDemo, signOf, SIGNS } from "./ephemeris.ts";

const DEG = Math.PI / 180;
const norm360 = (x: number) => ((x % 360) + 360) % 360;
function meanObliquityDeg(ttDays: number): number {
  const T = ttDays / 36525;
  return (84381.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T) / 3600;
}

Deno.test("Sun and Moon land in plausible signs at a known instant", () => {
  const c = computeChart({ utc: new Date(Date.UTC(2000, 0, 1, 12, 0, 0)), timeKnown: false });
  // 2000-01-01: Sun in Capricorn (~280 deg), Moon ~223 (Scorpio).
  assertEquals(c.positions["Sun"].sign, "Capricorn");
  assertAlmostEquals(c.positions["Sun"].longitude, 280.37, 0.2);
  assertEquals(c.positions["Moon"].sign, "Scorpio");
  assertAlmostEquals(c.positions["Moon"].longitude, 223.32, 0.3);
});

Deno.test("longitudes are of-date (precession applied), not J2000", () => {
  // For a date ~25 yr after J2000, ecliptic-of-date longitude exceeds the
  // J2000-ecliptic longitude by general precession (~50.29 arcsec/yr ~= 0.35 deg).
  const t = A.MakeTime(new Date(Date.UTC(2025, 5, 15, 0, 0, 0)));
  const vec = A.GeoVector(A.Body.Mars, t, true);
  const eclJ2000 = norm360(A.SphereFromVector(A.RotateVector(A.Rotation_EQJ_ECL(), vec)).lon); // true J2000 ecliptic
  const c = computeChart({ utc: new Date(Date.UTC(2025, 5, 15, 0, 0, 0)), timeKnown: false });
  let d = norm360(c.positions["Mars"].longitude - eclJ2000);
  if (d > 180) d -= 360;
  // Expect ~ +0.35 deg, definitely positive and under 0.5 deg.
  assert(d > 0.25 && d < 0.45, `precession delta was ${d.toFixed(4)} deg`);
});

Deno.test("Midheaven RA equals the RAMC (proves the MC formula)", () => {
  const utc = new Date(Date.UTC(1990, 5, 15, 14, 30, 0));
  const lat = 51.5074, lon = -0.1278; // London
  const c = computeChart({ utc, latitude: lat, longitude: lon });
  assert(c.midheaven, "midheaven computed");
  const t = A.MakeTime(utc);
  const eps = meanObliquityDeg(t.tt) * DEG;
  const ramc = norm360((A.SiderealTime(t) + lon / 15) * 15);
  const lambda = c.midheaven!.longitude * DEG;
  const raMc = norm360(Math.atan2(Math.sin(lambda) * Math.cos(eps), Math.cos(lambda)) * (180 / Math.PI));
  let d = Math.abs(raMc - ramc);
  if (d > 180) d = 360 - d;
  assert(d < 0.02, `RA(MC)=${raMc.toFixed(4)} vs RAMC=${ramc.toFixed(4)}, diff ${(d * 60).toFixed(2)} arcmin`);
});

Deno.test("Ascendant sits on the horizon (altitude ~0) in the east (proves the ASC formula)", () => {
  const utc = new Date(Date.UTC(1990, 5, 15, 14, 30, 0));
  const lat = 51.5074, lon = -0.1278;
  const c = computeChart({ utc, latitude: lat, longitude: lon });
  assert(c.ascendant, "ascendant computed");
  const t = A.MakeTime(utc);
  const eps = meanObliquityDeg(t.tt) * DEG;
  const ramc = norm360((A.SiderealTime(t) + lon / 15) * 15) * DEG; // = LST in rad (RA of meridian)
  const lambda = c.ascendant!.longitude * DEG;
  // Ecliptic point (lat 0) -> equatorial
  const ra = Math.atan2(Math.sin(lambda) * Math.cos(eps), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const H = ramc - ra; // hour angle
  const alt = Math.asin(Math.sin(lat * DEG) * Math.sin(dec) + Math.cos(lat * DEG) * Math.cos(dec) * Math.cos(H));
  assert(Math.abs(alt / DEG) < 0.05, `ascendant altitude ${(alt / DEG).toFixed(4)} deg, expected ~0`);
  // A rising (eastern) ecliptic point has a negative hour angle, so sin(H) < 0.
  // (The descendant, also on the horizon, would give sin(H) > 0.)
  assert(Math.sin(H) < 0, "ascendant should be rising in the east");
});

Deno.test("Sun and Moon daily speeds are in known ranges, Sun never retrograde", () => {
  const c = computeChart({ utc: new Date(Date.UTC(2024, 2, 20, 0, 0, 0)), timeKnown: false });
  assert(c.positions["Sun"].speed > 0.95 && c.positions["Sun"].speed < 1.02, `sun speed ${c.positions["Sun"].speed}`);
  assert(!c.positions["Sun"].retrograde);
  assert(c.positions["Moon"].speed > 11 && c.positions["Moon"].speed < 15.5, `moon speed ${c.positions["Moon"].speed}`);
});

Deno.test("retrograde detection works for an outer planet near opposition", () => {
  // Saturn opposition 2024 was ~Sep 8; it is retrograde around then.
  const c = computeChart({ utc: new Date(Date.UTC(2024, 8, 8, 0, 0, 0)), timeKnown: false });
  assert(c.positions["Saturn"].retrograde, `saturn speed ${c.positions["Saturn"].speed}`);
});

Deno.test("whole-sign houses start at the ascendant sign and span all 12", () => {
  const c = computeChart({ utc: new Date(Date.UTC(1985, 10, 2, 9, 15, 0)), latitude: 40.71, longitude: -74.0 });
  assertEquals(c.houses.length, 12);
  assertEquals(c.houses[0].sign, c.ascendant!.sign);
  const signsCovered = new Set(c.houses.map((h) => h.sign));
  assertEquals(signsCovered.size, 12); // every sign is exactly one house
  assertEquals(c.houses[0].longitude % 30, 0); // whole-sign cusp is 0 deg of the sign
});

Deno.test("no angles or houses when birth time is unknown (no fabrication)", () => {
  const c = computeChart({ utc: new Date(Date.UTC(1992, 3, 10, 12, 0, 0)), timeKnown: false });
  assertEquals(c.ascendant, null);
  assertEquals(c.midheaven, null);
  assertEquals(c.houses.length, 0);
  assertEquals(c.houseSystem, "none");
  assert(c.accuracy.notes.includes("omitted rather than fabricated"));
});

Deno.test("date-only demo gives an accurate Sun and an honest Moon caveat", () => {
  const demo = computeDateOnlyDemo("1991-07-03");
  assertEquals(demo.sun.sign, "Cancer"); // July 3 is Cancer
  assert(typeof demo.moonSignCertain === "boolean");
  assert(SIGNS.includes(demo.moon.sign));
});

Deno.test("formatDMS is em-dash free and well-formed", () => {
  const c = computeChart({ utc: new Date(Date.UTC(2001, 5, 21, 6, 0, 0)), timeKnown: false });
  for (const p of Object.values(c.positions)) {
    assert(!/[‒–—―]/.test(p.dms), `dms had a dash: ${p.dms}`);
    assert(/^\d+ \d{2}' [A-Za-z]+$/.test(p.dms), `dms malformed: ${p.dms}`);
  }
});
