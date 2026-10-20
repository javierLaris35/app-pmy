import type { SubsidiarySummary, SummaryLevel, ZonePart } from "@/lib/types/consolidador-zone";

/** Con foco en una sucursal deja solo esa parte; sin foco, todas. */
export function focusParts<T>(parts: ZonePart<T>[], focus: string | null): ZonePart<T>[] {
  return focus ? parts.filter((p) => p.subsidiaryId === focus) : parts;
}

/** Junta las filas de todas las sucursales agregando de cuál es cada una (se salta las que fallaron). */
export function flattenParts<T, R extends object>(parts: ZonePart<T>[], pick: (d: T) => R[]): (R & { subsidiaryId: string; subsidiaryName: string })[] {
  return parts.flatMap((p) => (p.data ? pick(p.data).map((r) => ({ ...r, subsidiaryId: p.subsidiaryId, subsidiaryName: p.subsidiaryName })) : []));
}

/** Suma un número de cada sucursal con datos (KPIs de la zona). */
export function sumParts<T>(parts: ZonePart<T>[], pick: (d: T) => number): number {
  return parts.reduce((s, p) => s + (p.data ? Number(pick(p.data) ?? 0) : 0), 0);
}

/** Color de la pastilla de una sucursal según su resumen. */
export function pillLevel(s: SubsidiarySummary | null | undefined): SummaryLevel {
  return s?.level ?? "none";
}

/** Mensaje para el usuario de un error del API (403/400 traen el motivo en llano; 5xx no se muestran). */
export function errorText(e: any, fallback: string): string {
  if (!e?.response) return "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.";
  if (e.response.status >= 500) return `${fallback}. Intenta de nuevo.`;
  const d = e.response.data ?? {};
  const m = d.apiMessage ?? (Array.isArray(d.message) ? d.message[0] : d.message);
  return typeof m === "string" && m.trim() ? m : fallback;
}
