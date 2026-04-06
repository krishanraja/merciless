import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Zodiac sign lookup based on ecliptic longitude
function getZodiacSign(longitude: number): string {
  const signs = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  return signs[Math.floor(longitude / 30) % 12];
}

function getDegreeInSign(longitude: number): number {
  return longitude % 30;
}

// Simplified planetary longitude calculation using mean orbital elements
// Returns approximate ecliptic longitude in degrees (0-360)
function calcPlanetLongitude(planet: string, jd: number): number {
  const T = (jd - 2451545.0) / 36525.0; // Julian centuries from J2000.0

  const orbitalElements: Record<string, { L0: number, L1: number }> = {
    Sun: { L0: 280.46646, L1: 36000.76983 },
    Moon: { L0: 218.3165, L1: 481267.8813 },
    Mercury: { L0: 252.2509, L1: 149472.6674 },
    Venus: { L0: 181.9798, L1: 58517.8156 },
    Mars: { L0: 355.4330, L1: 19140.2993 },
    Jupiter: { L0: 34.3515, L1: 3034.9057 },
    Saturn: { L0: 50.0774, L1: 1222.1138 },
    Uranus: { L0: 314.0550, L1: 428.4682 },
    Neptune: { L0: 304.3489, L1: 218.4862 },
    Pluto: { L0: 238.9290, L1: 144.9600 },
  };

  const el = orbitalElements[planet];
  if (!el) return 0;

  const L = ((el.L0 + el.L1 * T) % 360 + 360) % 360;
  return L;
}

function dateToJulianDay(year: number, month: number, day: number, hour: number = 12): number {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + hour/24 + B - 1524.5;
}

function calculateAspects(planets: Record<string, number>): Array<{planet1: string, planet2: string, aspect: string, orb: number}> {
  const aspects = [];
  const aspectDefs = [
    { name: "conjunction", angle: 0, orb: 8 },
    { name: "sextile", angle: 60, orb: 6 },
    { name: "square", angle: 90, orb: 8 },
    { name: "trine", angle: 120, orb: 8 },
    { name: "opposition", angle: 180, orb: 8 },
  ];

  const planetNames = Object.keys(planets);
  for (let i = 0; i < planetNames.length; i++) {
    for (let j = i + 1; j < planetNames.length; j++) {
      const p1 = planetNames[i];
      const p2 = planetNames[j];
      let diff = Math.abs(planets[p1] - planets[p2]);
      if (diff > 180) diff = 360 - diff;

      for (const asp of aspectDefs) {
        const orb = Math.abs(diff - asp.angle);
        if (orb <= asp.orb) {
          aspects.push({ planet1: p1, planet2: p2, aspect: asp.name, orb: Math.round(orb * 100) / 100 });
        }
      }
    }
  }
  return aspects;
}

function calculateHouses(ascendantLong: number): Array<{house: number, sign: string, longitude: number}> {
  const houses = [];
  for (let i = 0; i < 12; i++) {
    const houseLong = ((ascendantLong + i * 30) % 360 + 360) % 360;
    houses.push({ house: i + 1, sign: getZodiacSign(houseLong), longitude: houseLong });
  }
  return houses;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { birth_date, birth_time, birth_location, latitude, longitude, timezone, user_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [year, month, day] = birth_date.split("-").map(Number);
    let hour = 12;
    if (birth_time) {
      const [h, m] = birth_time.split(":").map(Number);
      hour = h + m / 60;
    }

    const jd = dateToJulianDay(year, month, day, hour);

    // Calculate planetary positions
    const planetNames = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"];
    const planetLongitudes: Record<string, number> = {};
    const planets: Record<string, {sign: string, longitude: number, degree: number}> = {};

    for (const planet of planetNames) {
      const long = calcPlanetLongitude(planet, jd);
      planetLongitudes[planet] = long;
      planets[planet] = {
        sign: getZodiacSign(long),
        longitude: Math.round(long * 100) / 100,
        degree: Math.round(getDegreeInSign(long) * 100) / 100
      };
    }

    // North Node (mean): approximate
    const northNodeLong = (((125.0445 - 1934.1363 * ((jd - 2451545.0) / 36525.0)) % 360) + 360) % 360;
    planets["NorthNode"] = { sign: getZodiacSign(northNodeLong), longitude: northNodeLong, degree: getDegreeInSign(northNodeLong) };
    planetLongitudes["NorthNode"] = northNodeLong;

    // Chiron approximate
    const T = (jd - 2451545.0) / 36525.0;
    const chironLong = ((208.9 + 50.42 * T) % 360 + 360) % 360;
    planets["Chiron"] = { sign: getZodiacSign(chironLong), longitude: chironLong, degree: getDegreeInSign(chironLong) };
    planetLongitudes["Chiron"] = chironLong;

    // Simplified Ascendant (based on latitude/longitude/time)
    const lat = latitude || 40.7128;
    const RAMC = ((jd - 2451545.0) * 360.9856473 / 1.0 + longitude) % 360;
    const ascLong = ((RAMC + 90 + lat * 0.5) % 360 + 360) % 360;
    const mcLong = (RAMC % 360 + 360) % 360;

    const aspects = calculateAspects(planetLongitudes);
    const houses = calculateHouses(ascLong);

    const chartData = {
      user_id,
      planets,
      houses,
      aspects,
      ascendant: getZodiacSign(ascLong),
      midheaven: getZodiacSign(mcLong),
      sun_sign: planets["Sun"].sign,
      moon_sign: planets["Moon"].sign,
      rising_sign: getZodiacSign(ascLong),
    };

    // Also store birth data
    await supabase.from("user_birth_data").upsert({
      user_id,
      birth_date,
      birth_time: birth_time || null,
      birth_location,
      latitude: lat,
      longitude: longitude || 0,
      timezone: timezone || "UTC",
      updated_at: new Date().toISOString(),
    });

    const { data, error } = await supabase.from("natal_charts").upsert(chartData).select().single();
    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
