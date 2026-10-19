import type { ZoneView } from "@/lib/types/consolidador-zone";

export type ScopeMode = "zone" | "subsidiary";

/** Qué se está revisando: una zona (con foco opcional en una de sus sucursales) o una sucursal sola. */
export interface ConsolidadorScope {
  mode: ScopeMode;
  zoneId: string;
  subsidiaryId: string;
  /** En zona: sucursal elegida en las pastillas (null = todas). */
  focusSubsidiaryId: string | null;
}

const STORAGE_KEY = "consolidador.scope";
export const EMPTY_SCOPE: ConsolidadorScope = { mode: "zone", zoneId: "", subsidiaryId: "", focusSubsidiaryId: null };

export function scopeReady(s: ConsolidadorScope): boolean {
  return s.mode === "zone" ? !!s.zoneId : !!s.subsidiaryId;
}

/** URL del API para una vista: por zona (endpoint genérico) o por sucursal (sus rutas de siempre). */
export function scopedUrl(s: ConsolidadorScope, from: string, to: string, view: ZoneView): string {
  if (s.mode === "zone") return `/consolidador/zone/${s.zoneId}/${from}/${to}/${view}`;
  const base = `/consolidador/${s.subsidiaryId}/${from}/${to}`;
  return view === "week" ? base : `${base}/${view}`;
}

/** Último alcance elegido por este usuario en este navegador (sin foco). */
export function loadScope(): ConsolidadorScope {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return EMPTY_SCOPE;
    const v = JSON.parse(raw);
    return { ...EMPTY_SCOPE, mode: v.mode === "subsidiary" ? "subsidiary" : "zone", zoneId: String(v.zoneId ?? ""), subsidiaryId: String(v.subsidiaryId ?? "") };
  } catch {
    return EMPTY_SCOPE;
  }
}

export function saveScope(s: ConsolidadorScope): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: s.mode, zoneId: s.zoneId, subsidiaryId: s.subsidiaryId }));
  } catch {
    // Sin almacenamiento (modo privado): solo no se recuerda.
  }
}
