/**
 * Geocoder gratuito (Nominatim / OpenStreetMap) para México, tolerante a
 * direcciones incompletas/mal escritas, con CASCADA:
 *   1) texto libre "dirección, ciudad, CP, México"  (lo más tolerante)
 *   2) solo código postal + México  (centroide del CP)  ← clave si la dirección viene mal
 *   3) solo ciudad + México
 *
 * Server-side para cumplir la política de Nominatim (User-Agent), evitar CORS y
 * cachear. Las llamadas upstream se SERIALIZAN con un lock global + espaciado de
 * 1.1s y reintento ante 429 (antes, al geocodificar varias paradas en paralelo,
 * Nominatim devolvía 429 y TODO salía "sin ubicar").
 *
 * Devuelve un ARRAY (compatible con shipment-map.tsx): [{ lat, lon, display_name, source }].
 */

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "PMY-RouteOptimizer/1.0 (javier.lopez@derevo.com.mx)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Caché en memoria del proceso.
const cache = new Map<string, any[]>();

// Lock global: serializa las llamadas a Nominatim (1 a la vez, ≥1.1s, retry 429).
let lastUpstream = 0;
let lock: Promise<void> = Promise.resolve();
async function throttledFetch(url: string): Promise<Response> {
  let release!: () => void;
  const prev = lock;
  lock = new Promise<void>((r) => (release = r));
  await prev;
  try {
    const wait = 1100 - (Date.now() - lastUpstream);
    if (wait > 0) await sleep(wait);
    const headers = { "User-Agent": USER_AGENT, "Accept-Language": "es-MX", Referer: "https://pmy.local/" };
    let res = await fetch(url, { headers });
    if (res.status === 429) { await sleep(1500); res = await fetch(url, { headers }); }
    lastUpstream = Date.now();
    return res;
  } finally {
    release();
  }
}

type Source = "address" | "postalcode" | "city";

async function nominatim(params: Record<string, string>, source: Source) {
  const url = new URL(NOMINATIM);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "mx");
  url.searchParams.set("addressdetails", "1");
  for (const [k, v] of Object.entries(params)) {
    if (v && v.trim()) url.searchParams.set(k, v.trim());
  }

  const res = await throttledFetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  if (!Array.isArray(data) || data.length === 0) return [];
  return data.map((d: any) => ({ lat: d.lat, lon: d.lon, display_name: d.display_name, source }));
}

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const address = sp.get("address") ?? "";
  const city = sp.get("city") ?? "";
  const zip = sp.get("zip") ?? "";
  const q = sp.get("q") ?? "";

  const key = JSON.stringify({ address, city, zip, q }).toLowerCase();
  if (cache.has(key)) return Response.json(cache.get(key));

  try {
    let result: any[] = [];

    // 1) Texto libre con todo lo disponible (lo más tolerante).
    const freeText = [q || address, city, zip, "México"].filter(Boolean).join(", ");
    if (freeText.replace(/méxico/i, "").trim().length > 2) {
      result = await nominatim({ q: freeText }, "address");
    }
    // 2) Solo código postal (centroide). Rescata direcciones malas con CP válido.
    if (result.length === 0 && zip) {
      result = await nominatim({ postalcode: zip, country: "México" }, "postalcode");
    }
    // 3) Solo ciudad.
    if (result.length === 0 && city) {
      result = await nominatim({ city, country: "México" }, "city");
    }

    // Solo cachear ACIERTOS: así un 429 transitorio no "envenena" el caché con [].
    if (result.length > 0) cache.set(key, result);
    return Response.json(result);
  } catch (err: any) {
    return Response.json({ error: err?.message ?? "geocode failed" }, { status: 500 });
  }
}
