/**
 * Metadatos del cliente para auditoría/notificaciones:
 *  - IP pública + ciudad (vía servicio de geo; funciona aun en LAN).
 *  - "Equipo": navegador + SO (del User-Agent) + un deviceId estable por navegador.
 *
 * Nota: el navegador NO puede leer el hostname real del SO (privacidad); lo más
 * cercano es navegador+SO + deviceId. Se cachea en localStorage y se manda al
 * backend como headers en cada request (ver axios-config).
 */

const META_KEY = "pmy_client_meta";
const DEVICE_ID_KEY = "pmy_device_id";
const TTL_MS = 6 * 60 * 60 * 1000; // refrescar geo cada 6h

export interface ClientMeta {
  publicIp?: string;
  city?: string;
  region?: string;
  country?: string;
  device: string;
  deviceId: string;
  /** Nombre real del equipo (hostname) — solo disponible en la app Electron. */
  machineName?: string;
  osUser?: string;
  ts: number;
}

/** Info nativa del equipo vía Electron (hostname/usuario). null en navegador. */
async function getElectronMachine(): Promise<{ hostname?: string; username?: string } | null> {
  try {
    const api = (window as any).electronAPI;
    if (api?.getMachineInfo) {
      const info = await api.getMachineInfo();
      return { hostname: info?.hostname, username: info?.username };
    }
  } catch {}
  return null;
}

function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = (crypto?.randomUUID?.() ?? `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Desconocido";
  const ua = navigator.userAgent || "";
  let os = "SO desconocido";
  if (/windows nt 10/i.test(ua)) os = "Windows 10/11";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";
  let browser = "Navegador";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/(chrome|crios)\//i.test(ua) && !/edg\//i.test(ua)) browser = "Chrome";
  else if (/(firefox|fxios)\//i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/(chrome|crios)\//i.test(ua)) browser = "Safari";
  const isMobile = /mobile|iphone|android/i.test(ua);
  return `${browser} · ${os}${isMobile ? " (móvil)" : ""}`;
}

export function getClientMeta(): ClientMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as ClientMeta) : null;
  } catch {
    return null;
  }
}

/** Obtiene y cachea IP pública + ciudad (una vez cada TTL). No bloquea ni lanza. */
export async function ensureClientMeta(force = false): Promise<ClientMeta | null> {
  if (typeof window === "undefined") return null;

  const cached = getClientMeta();
  if (cached && !force && Date.now() - cached.ts < TTL_MS) return cached;

  let geo: Partial<ClientMeta> = {};
  try {
    const res = await fetch("https://ipwho.is/", { cache: "no-store" });
    const j = await res.json();
    if (j && j.success !== false) {
      geo = { publicIp: j.ip, city: j.city, region: j.region, country: j.country };
    }
  } catch {
    // sin conexión a internet o servicio caído: dejamos geo vacío
  }

  const machine = await getElectronMachine();

  const meta: ClientMeta = {
    ...cached,
    ...geo,
    device: getDeviceLabel(),
    deviceId: getDeviceId(),
    machineName: machine?.hostname ?? cached?.machineName,
    osUser: machine?.username ?? cached?.osUser,
    ts: Date.now(),
  };
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {}
  return meta;
}
