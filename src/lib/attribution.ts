// First-party attribution for Merciless.
//
// Mints a durable mcl_cid on first touch and captures UTM + agent + referrer +
// landing path. First-touch wins and is stored in BOTH localStorage and a cookie
// so it survives the SPA boundary AND the email-confirmation round trip (the user
// leaves to their inbox and comes back in a fresh context). Funnel events are
// sent to the `track` edge function, which forwards them to the Mindmaker OS
// warehouse. The browser never holds the warehouse ingest secret.

const STORAGE_KEY = "merciless_attribution_v1";
const CID_COOKIE = "mcl_cid";
const CID_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export interface Attribution {
  mcl_cid: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  agent?: string;
  referrer?: string;
  landing_path?: string;
  first_seen_at: string;
}

function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* fall through */ }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.floor(Date.now() + performance.now()) + Math.floor(Math.random() * 1e6)) % 16;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${CID_MAX_AGE}; samesite=lax${secure}`;
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "agent"] as const;

/** Capture first-touch attribution. Safe to call on every load; first touch wins. */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") {
    return { mcl_cid: "ssr", first_seen_at: new Date().toISOString() };
  }
  const existing = getAttribution();
  if (existing) {
    if (!readCookie(CID_COOKIE)) writeCookie(CID_COOKIE, existing.mcl_cid);
    return existing;
  }
  const params = new URLSearchParams(window.location.search);
  const cid = params.get("mcl_cid") || readCookie(CID_COOKIE) || uuid();
  const attribution: Attribution = {
    mcl_cid: cid,
    referrer: document.referrer || undefined,
    landing_path: window.location.pathname + window.location.search,
    first_seen_at: new Date().toISOString(),
  };
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) (attribution as unknown as Record<string, string>)[k] = v;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch { /* private mode: cookie is the fallback */ }
  writeCookie(CID_COOKIE, cid);
  return attribution;
}

export function getAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Attribution;
  } catch { /* fall through to cookie */ }
  const cid = readCookie(CID_COOKIE);
  return cid ? { mcl_cid: cid, first_seen_at: new Date().toISOString() } : null;
}

/** UTM-prefixed map for stamping onto Stripe customer + subscription metadata. */
export function attributionForCheckout(): Record<string, string> {
  const a = getAttribution() ?? captureAttribution();
  const out: Record<string, string> = { mcl_cid: a.mcl_cid };
  for (const k of [...UTM_KEYS, "landing_path", "referrer"] as const) {
    const v = (a as unknown as Record<string, string | undefined>)[k];
    if (v) out[k] = v;
  }
  return out;
}

/** Same shape, persisted onto the auth user at signup so it survives confirm. */
export function attributionUserMetadata(): Record<string, string> {
  return attributionForCheckout();
}

export interface TrackExtra {
  user_id?: string;
  email?: string;
  metadata?: Record<string, unknown>;
  dedupe_key?: string;
}

/** Emit a funnel event. Never throws; analytics must not break the product. */
export async function trackEvent(event: string, extra: TrackExtra = {}): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const a = getAttribution() ?? captureAttribution();
    const base = import.meta.env.VITE_SUPABASE_URL;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!base || !anon) return;
    await fetch(`${base}/functions/v1/track`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${anon}` },
      keepalive: true,
      body: JSON.stringify({
        event,
        anonymous_id: a.mcl_cid,
        utm_source: a.utm_source ?? null,
        utm_medium: a.utm_medium ?? null,
        utm_campaign: a.utm_campaign ?? null,
        utm_content: a.utm_content ?? null,
        utm_term: a.utm_term ?? null,
        agent: a.agent ?? null,
        referrer: a.referrer ?? null,
        landing_path: a.landing_path ?? null,
        ...extra,
      }),
    });
  } catch { /* swallow */ }
}
