import type { DevolutionRecordOption, DevolutionRow } from "@/lib/types"

/**
 * Registros de una guía al capturar una devolución (uno por consolidado). La persona elige cuál
 * regresa; el backend sugiere el que no va en una ruta abierta. Caso 384096861505 (16-oct-2026):
 * la devolución del registro del 15 se aplicó al del 16, que iba en ruta.
 */

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

export const recordKey = (r: Pick<DevolutionRecordOption, "kind" | "id">) => `${r.kind}:${r.id}`

/** "15-oct" a partir de "2026-10-15". */
export function shortDay(ymd?: string | null): string {
  if (!ymd) return "—"
  const [, m, d] = ymd.slice(0, 10).split("-")
  return `${d}-${MONTHS[Number(m) - 1] ?? m}`
}

export function selectedRecord(row: DevolutionRow): DevolutionRecordOption | null {
  const records = row.records ?? []
  return records.find((r) => recordKey(r) === row.selectedRecordKey) ?? null
}

/** "Consolidado 36415102026 del 15-oct" */
export function recordTitle(r: DevolutionRecordOption): string {
  const cons = r.consNumber ? `Consolidado ${r.consNumber}` : "Sin consolidado"
  return `${cons} del ${shortDay(r.consDate ?? r.createdAt)}`
}

/** Dónde anda ese registro, en llano. */
export function recordRouteText(r: DevolutionRecordOption): string {
  if (!r.lastRoute) return "Nunca salió a ruta"
  const day = shortDay(r.lastRoute.routeDate)
  if (r.inOpenRoute) return `Va en la ruta ${r.lastRoute.folio ?? ""} del ${day}, que no se ha cerrado`
  return `Salió en la ruta ${r.lastRoute.folio ?? ""} del ${day}${r.lastRoute.closed ? " (ya cerrada)" : ""}`
}
