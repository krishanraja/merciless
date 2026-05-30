// Merciless real ephemeris engine.
//
// Replaces the old mean-motion theatre (L0 + L1*T, Moon error 5-6 degrees, a
// fabricated ascendant RAMC + 90 + lat*0.5, equal houses off a fake angle,
// retrograde hardcoded false) with positions computed from astronomy-engine,
// which matches JPL to arc-seconds for planets and ~1 arc-minute for the Moon.
//
// What is guaranteed to the arc-minute (verified in ephemeris.test.ts):
//   Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto,
//   the Ascendant, the Midheaven, whole-sign and equal house cusps, aspects,
//   retrograde state, daily speed.
// Approximate, labelled as such, NOT part of the arc-minute guarantee:
//   Mean Lunar Node (mean elements, good to ~1 arc-minute over the modern range
//   anyway) and Chiron (two-body Kepler from osculating elements; can drift to
//   tens of arc-minutes over decades). The brand promise rests on the first set.
//
// Longitudes are tropical, apparent, referred to the true ecliptic and equinox
// OF DATE (not J2000), so they match what astro.com prints. Times are UTC.

import * as A from "https://esm.sh/astronomy-engine@2.1.19";

export const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;
export type Sign = typeof SIGNS[number];

export interface BodyPosition {
  body: string;
  longitude: number; // ecliptic longitude of date, 0-360
  latitude: number; // ecliptic latitude
  sign: Sign;
  degree: number; // 0-30 within the sign
  dms: string; // "23 30' Pisces" style, em-dash-free
  speed: number; // degrees/day in longitude (negative => retrograde)
  retrograde: boolean;
  approximate?: boolean; // true for Chiron / mean node
}

export interface Angle {
  longitude: number;
  sign: Sign;
  degree: number;
  dms: string;
}

export interface HouseCusp {
  house: number; // 1-12
  longitude: number;
  sign: Sign;
}

export interface AspectHit {
  planet1: string;
  planet2: string;
  aspect: string;
  angle: number;
  orb: number;
  applying: boolean | null;
}

export interface NatalChart {
  julianDay: number;
  utc: string;
  positions: Record<string, BodyPosition>;
  ascendant: Angle | null;
  midheaven: Angle | null;
  houseSystem: "whole-sign" | "equal" | "none";
  houses: HouseCusp[]; // whole-sign by default
  equalHouses: HouseCusp[];
  aspects: AspectHit[];
  sun_sign: Sign;
  moon_sign: Sign | null;
  rising_sign: Sign | null;
  timeKnown: boolean;
  accuracy: {
    bodies: "arc-minute";
    angles: "arc-minute when birth time and place are known";
    notes: string;
  };
}

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const norm360 = (x: number) => ((x % 360) + 360) % 360;

export function signOf(longitude: number): Sign {
  return SIGNS[Math.floor(norm360(longitude) / 30) % 12];
}
export function degreeInSign(longitude: number): number {
  return norm360(longitude) % 30;
}
export function formatDMS(longitude: number): string {
  const d = degreeInSign(longitude);
  const deg = Math.floor(d);
  const min = Math.round((d - deg) * 60);
  // handle rounding to 60'
  const mm = min === 60 ? 0 : min;
  const dd = min === 60 ? deg + 1 : deg;
  return `${dd} ${String(mm).padStart(2, "0")}' ${signOf(longitude)}`;
}

function toAngle(longitude: number): Angle {
  return { longitude: norm360(longitude), sign: signOf(longitude), degree: degreeInSign(longitude), dms: formatDMS(longitude) };
}

// Mean obliquity of the ecliptic (Meeus 22.2), arcseconds -> degrees.
function meanObliquityDeg(time: A.AstroTime): number {
  const T = time.tt / 36525; // Julian centuries TT from J2000
  const sec = 84381.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T;
  return sec / 3600;
}

// Mean lunar node (Meeus 47.7), degrees. Negative coefficient => retrograde.
function meanNodeDeg(time: A.AstroTime): number {
  const T = time.tt / 36525;
  return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441 - (T * T * T * T) / 60616000);
}

// Ecliptic-of-date geocentric longitude/latitude of a major body.
function bodyEcliptic(body: A.Body, time: A.AstroTime): { lon: number; lat: number } {
  if (body === A.Body.Sun) {
    const s = A.SunPosition(time);
    return { lon: norm360(s.elon), lat: s.elat };
  }
  if (body === A.Body.Moon) {
    const m = A.EclipticGeoMoon(time);
    return { lon: norm360(m.lon), lat: m.lat };
  }
  const vec = A.GeoVector(body, time, true); // aberration-corrected, EQJ
  const rot = A.Rotation_EQJ_ECT(time); // EQJ -> true ecliptic of date
  const eclVec = A.RotateVector(rot, vec);
  const sph = A.SphereFromVector(eclVec);
  return { lon: norm360(sph.lon), lat: sph.lat };
}

function bodyLongitudeAt(body: A.Body, time: A.AstroTime): number {
  return bodyEcliptic(body, time).lon;
}

// Daily motion via central finite difference (deg/day), wrap-aware.
function bodySpeed(body: A.Body, time: A.AstroTime): number {
  const dt = 0.5; // days
  const before = bodyLongitudeAt(body, time.AddDays(-dt));
  const after = bodyLongitudeAt(body, time.AddDays(dt));
  let d = after - before;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d / (2 * dt);
}

const MAJOR_BODIES: Array<[string, A.Body]> = [
  ["Sun", A.Body.Sun],
  ["Moon", A.Body.Moon],
  ["Mercury", A.Body.Mercury],
  ["Venus", A.Body.Venus],
  ["Mars", A.Body.Mars],
  ["Jupiter", A.Body.Jupiter],
  ["Saturn", A.Body.Saturn],
  ["Uranus", A.Body.Uranus],
  ["Neptune", A.Body.Neptune],
  ["Pluto", A.Body.Pluto],
];

function makePosition(name: string, lon: number, lat: number, speed: number, approximate = false): BodyPosition {
  return {
    body: name,
    longitude: Math.round(lon * 1e5) / 1e5,
    latitude: Math.round(lat * 1e5) / 1e5,
    sign: signOf(lon),
    degree: Math.round(degreeInSign(lon) * 1e4) / 1e4,
    dms: formatDMS(lon),
    speed: Math.round(speed * 1e4) / 1e4,
    retrograde: speed < 0,
    ...(approximate ? { approximate: true } : {}),
  };
}

// Chiron via two-body Kepler from JPL osculating elements (epoch 2024-09-13 / JD
// 2460566.5). Labelled approximate; not part of the arc-minute guarantee.
const CHIRON_ELEMENTS = {
  epochTT: 2460566.5 - 2451545.0, // days from J2000 (TT)
  a: 13.6717, // AU
  e: 0.3823,
  iDeg: 6.9357,
  omegaDeg: 209.2497, // longitude of ascending node
  wDeg: 339.6766, // argument of perihelion
  mDeg: 132.7546, // mean anomaly at epoch
  n: 0.01958, // deg/day mean motion (approx; 360 / period)
};

function chironEcliptic(time: A.AstroTime): { lon: number; lat: number } {
  const e = CHIRON_ELEMENTS;
  const dtDays = time.tt - e.epochTT;
  const M = (e.mDeg + e.n * dtDays) * DEG;
  // Solve Kepler's equation
  let E = M;
  for (let i = 0; i < 50; i++) {
    const dE = (E - e.e * Math.sin(E) - M) / (1 - e.e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  const xv = e.a * (Math.cos(E) - e.e);
  const yv = e.a * (Math.sqrt(1 - e.e * e.e) * Math.sin(E));
  const v = Math.atan2(yv, xv);
  const r = Math.sqrt(xv * xv + yv * yv);
  const o = e.omegaDeg * DEG, w = e.wDeg * DEG, inc = e.iDeg * DEG;
  // Heliocentric ecliptic (J2000) coordinates
  const xh = r * (Math.cos(o) * Math.cos(v + w) - Math.sin(o) * Math.sin(v + w) * Math.cos(inc));
  const yh = r * (Math.sin(o) * Math.cos(v + w) + Math.cos(o) * Math.sin(v + w) * Math.cos(inc));
  const zh = r * (Math.sin(v + w) * Math.sin(inc));
  // Earth heliocentric (J2000 ecliptic) from astronomy-engine
  const earth = A.HelioVector(A.Body.Earth, time); // EQJ (equatorial J2000)
  const eclRot = A.Rotation_EQJ_ECL(); // EQJ -> J2000 ecliptic
  const earthEcl = A.RotateVector(eclRot, earth);
  // Geocentric ecliptic (J2000)
  const xg = xh - earthEcl.x, yg = yh - earthEcl.y, zg = zh - earthEcl.z;
  const lonJ2000 = norm360(Math.atan2(yg, xg) * RAD);
  const latJ2000 = Math.atan2(zg, Math.sqrt(xg * xg + yg * yg)) * RAD;
  // Precess J2000 ecliptic longitude to of-date (general precession ~50.29"/yr)
  const T = time.tt / 36525;
  const precDeg = (5028.796195 * T + 1.1054348 * T * T) / 3600;
  return { lon: norm360(lonJ2000 + precDeg), lat: latJ2000 };
}

export interface ChartInput {
  utc: Date; // the birth instant in UTC (caller resolves local + timezone)
  latitude?: number; // degrees north
  longitude?: number; // degrees east
  timeKnown?: boolean; // when false, angles/houses are suppressed
}

export function computeChart(input: ChartInput): NatalChart {
  const time = A.MakeTime(input.utc);
  const positions: Record<string, BodyPosition> = {};

  for (const [name, body] of MAJOR_BODIES) {
    const { lon, lat } = bodyEcliptic(body, time);
    const speed = bodySpeed(body, time);
    positions[name] = makePosition(name, lon, lat, speed);
  }

  // Mean node (and the opposite point as South Node)
  const node = meanNodeDeg(time);
  positions["NorthNode"] = makePosition("NorthNode", node, 0, -0.0529, true);
  positions["SouthNode"] = makePosition("SouthNode", norm360(node + 180), 0, -0.0529, true);

  // Chiron (approximate)
  const chiron = chironEcliptic(time);
  positions["Chiron"] = makePosition("Chiron", chiron.lon, chiron.lat, 0, true);

  const timeKnown = input.timeKnown !== false && input.latitude != null && input.longitude != null;

  let ascendant: Angle | null = null;
  let midheaven: Angle | null = null;
  let houses: HouseCusp[] = [];
  let equalHouses: HouseCusp[] = [];

  if (timeKnown) {
    const eps = meanObliquityDeg(time) * DEG;
    const gast = A.SiderealTime(time); // Greenwich apparent sidereal time, hours
    const lstHours = gast + (input.longitude as number) / 15;
    const ramc = norm360(lstHours * 15) * DEG;
    const phi = (input.latitude as number) * DEG;

    // Midheaven
    const mc = norm360(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) * RAD);
    // Ascendant (eastern horizon)
    let asc = norm360(
      Math.atan2(
        Math.cos(ramc),
        -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)),
      ) * RAD,
    );
    // The descendant satisfies the same equation 180 deg away. Force the eastern
    // (rising) intersection: a rising ecliptic point has a negative hour angle,
    // so sin(RAMC - RA_asc) < 0. Flip by 180 deg when we landed on the west.
    {
      const aL = asc * DEG;
      const raAsc = Math.atan2(Math.sin(aL) * Math.cos(eps), Math.cos(aL));
      if (Math.sin(ramc - raAsc) > 0) asc = norm360(asc + 180);
    }

    ascendant = toAngle(asc);
    midheaven = toAngle(mc);

    // Whole-sign houses: house 1 = the whole sign of the ascendant.
    const ascSign = Math.floor(norm360(asc) / 30);
    for (let i = 0; i < 12; i++) {
      const cuspLon = norm360((ascSign + i) * 30);
      houses.push({ house: i + 1, longitude: cuspLon, sign: signOf(cuspLon) });
    }
    // Equal houses: 30 deg arcs from the exact ascendant degree.
    for (let i = 0; i < 12; i++) {
      const cuspLon = norm360(asc + i * 30);
      equalHouses.push({ house: i + 1, longitude: cuspLon, sign: signOf(cuspLon) });
    }
  }

  const aspects = computeAspects(positions);

  return {
    julianDay: time.tt + 2451545.0,
    utc: input.utc.toISOString(),
    positions,
    ascendant,
    midheaven,
    houseSystem: timeKnown ? "whole-sign" : "none",
    houses,
    equalHouses,
    aspects,
    sun_sign: positions["Sun"].sign,
    moon_sign: positions["Moon"]?.sign ?? null,
    rising_sign: ascendant?.sign ?? null,
    timeKnown,
    accuracy: {
      bodies: "arc-minute",
      angles: "arc-minute when birth time and place are known",
      notes: timeKnown
        ? "Mean node and Chiron are approximate and labelled so."
        : "Birth time or place unknown, so houses and angles are omitted rather than fabricated. Moon and fast-moving placements carry intra-day uncertainty.",
    },
  };
}

const ASPECT_DEFS = [
  { name: "conjunction", angle: 0, orb: 8 },
  { name: "sextile", angle: 60, orb: 4 },
  { name: "square", angle: 90, orb: 7 },
  { name: "trine", angle: 120, orb: 7 },
  { name: "opposition", angle: 180, orb: 8 },
];

const ASPECT_BODIES = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

export function computeAspects(positions: Record<string, BodyPosition>): AspectHit[] {
  const hits: AspectHit[] = [];
  const names = ASPECT_BODIES.filter((n) => positions[n]);
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = positions[names[i]], b = positions[names[j]];
      let diff = Math.abs(a.longitude - b.longitude);
      if (diff > 180) diff = 360 - diff;
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.orb) {
          // Applying when the faster body is closing the exact angle.
          const relSpeed = a.speed - b.speed;
          const sep = a.longitude - b.longitude;
          let applying: boolean | null = null;
          if (a.speed !== 0 || b.speed !== 0) {
            const closing = Math.sign(Math.sin((sep - def.angle) * DEG)) !== Math.sign(relSpeed);
            applying = closing;
          }
          hits.push({
            planet1: names[i],
            planet2: names[j],
            aspect: def.name,
            angle: def.angle,
            orb: Math.round(orb * 100) / 100,
            applying,
          });
        }
      }
    }
  }
  return hits;
}

// Transits of the current sky against a set of natal longitudes (for the daily
// reading). Returns the aspects the moving planets make to the natal chart now.
export function computeTransits(
  natalLongitudes: Record<string, number>,
  at: Date,
): Array<{ transiting_planet: string; natal_planet: string; aspect: string; orb: number; applying: boolean }> {
  const time = A.MakeTime(at);
  const transiting = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
  const defs = [
    { name: "conjunct", angle: 0, orb: 5 },
    { name: "sextile", angle: 60, orb: 3 },
    { name: "square", angle: 90, orb: 5 },
    { name: "trine", angle: 120, orb: 5 },
    { name: "opposite", angle: 180, orb: 5 },
  ];
  const out: Array<{ transiting_planet: string; natal_planet: string; aspect: string; orb: number; applying: boolean }> = [];
  const bodyMap: Record<string, A.Body> = Object.fromEntries(MAJOR_BODIES);
  for (const tp of transiting) {
    const tlon = bodyLongitudeAt(bodyMap[tp], time);
    const tspeed = bodySpeed(bodyMap[tp], time);
    for (const [np, nlonRaw] of Object.entries(natalLongitudes)) {
      const nlon = norm360(nlonRaw);
      let diff = Math.abs(tlon - nlon);
      if (diff > 180) diff = 360 - diff;
      for (const def of defs) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.orb) {
          const sep = tlon - nlon;
          const applying = Math.sign(Math.sin((sep - def.angle) * DEG)) !== Math.sign(tspeed);
          out.push({ transiting_planet: tp, natal_planet: np, aspect: def.name, orb: Math.round(orb * 100) / 100, applying });
        }
      }
    }
  }
  return out;
}

// Synastry: inter-chart aspects between two people's placements. Uses the
// relational bodies (Sun..Saturn, Venus and Mars carry the weight), all slow
// enough that a date-only chart is reliable. Returns A-planet to B-planet hits.
export interface SynastryHit {
  a_planet: string;
  b_planet: string;
  aspect: string;
  angle: number;
  orb: number;
}

const SYNASTRY_BODIES = ["Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
const SYNASTRY_DEFS = [
  { name: "conjunction", angle: 0, orb: 7 },
  { name: "sextile", angle: 60, orb: 4 },
  { name: "square", angle: 90, orb: 6 },
  { name: "trine", angle: 120, orb: 6 },
  { name: "opposition", angle: 180, orb: 7 },
];

export function computeSynastryAspects(a: Record<string, number>, b: Record<string, number>): SynastryHit[] {
  const out: SynastryHit[] = [];
  for (const pa of SYNASTRY_BODIES) {
    if (a[pa] == null) continue;
    for (const pb of SYNASTRY_BODIES) {
      if (b[pb] == null) continue;
      let diff = Math.abs(norm360(a[pa]) - norm360(b[pb]));
      if (diff > 180) diff = 360 - diff;
      for (const def of SYNASTRY_DEFS) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.orb) {
          out.push({ a_planet: pa, b_planet: pb, aspect: def.name, angle: def.angle, orb: Math.round(orb * 100) / 100 });
        }
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

// Relational longitudes for a date-only chart (noon UTC), for synastry.
export function relationalLongitudes(birthDateISO: string): Record<string, number> {
  const [y, m, d] = birthDateISO.split("-").map(Number);
  const chart = computeChart({ utc: new Date(Date.UTC(y, m - 1, d, 12, 0, 0)), timeKnown: false });
  const out: Record<string, number> = {};
  for (const name of SYNASTRY_BODIES) {
    if (chart.positions[name]) out[name] = chart.positions[name].longitude;
  }
  return out;
}

// Date-only demo (no birth time, no place). Sun is accurate to sign + degree;
// Moon is given with an honest intra-day caveat; the sharpest natal aspect among
// the slow bodies is reliable because they barely move in a day.
export interface DemoChart {
  sun: BodyPosition;
  moon: BodyPosition;
  moonSignCertain: boolean; // false when the date crosses a sign boundary
  sharpestAspect: AspectHit | null;
  positions: Record<string, BodyPosition>;
}

export function computeDateOnlyDemo(birthDateISO: string): DemoChart {
  const [y, m, d] = birthDateISO.split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const chart = computeChart({ utc: noon, timeKnown: false });
  // Is the Moon's sign stable across the whole UTC day (so date-only is safe)?
  const start = computeChart({ utc: new Date(Date.UTC(y, m - 1, d, 0, 0, 0)), timeKnown: false });
  const end = computeChart({ utc: new Date(Date.UTC(y, m - 1, d, 23, 59, 0)), timeKnown: false });
  const moonSignCertain = start.positions["Moon"].sign === end.positions["Moon"].sign;
  // Sharpest aspect not involving the Moon (Moon timing is uncertain date-only).
  const slowAspects = chart.aspects
    .filter((a) => a.planet1 !== "Moon" && a.planet2 !== "Moon")
    .sort((a, b) => a.orb - b.orb);
  return {
    sun: chart.positions["Sun"],
    moon: chart.positions["Moon"],
    moonSignCertain,
    sharpestAspect: slowAspects[0] ?? null,
    positions: chart.positions,
  };
}

// Resolve a local wall-clock birth time + IANA time zone (or numeric offset
// hours) into a UTC Date. Handles DST/historical zones via the ICU data baked
// into the runtime. One-iteration approximation at exact DST seams (irrelevant
// for births, which are not recorded to the transition second).
export function localToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string | number | null | undefined,
): Date {
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  if (timezone == null || timezone === "" || timezone === "UTC") return new Date(asIfUtc);
  if (typeof timezone === "number") return new Date(asIfUtc - timezone * 3600_000);
  // Numeric offset string like "+05:30" or "-08:00"
  const off = /^([+-])(\d{2}):?(\d{2})$/.exec(timezone);
  if (off) {
    const sign = off[1] === "-" ? -1 : 1;
    const mins = sign * (parseInt(off[2]) * 60 + parseInt(off[3]));
    return new Date(asIfUtc - mins * 60_000);
  }
  // IANA name: find the offset that zone had at this instant.
  try {
    const probe = new Date(asIfUtc);
    const tzWall = new Date(probe.toLocaleString("en-US", { timeZone: timezone }));
    const utcWall = new Date(probe.toLocaleString("en-US", { timeZone: "UTC" }));
    const offsetMs = tzWall.getTime() - utcWall.getTime();
    return new Date(asIfUtc - offsetMs);
  } catch {
    return new Date(asIfUtc);
  }
}
