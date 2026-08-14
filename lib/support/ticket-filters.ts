/**
 * Filtrado en cliente del Tablero de Soporte. Los filtros son multi-select:
 * un arreglo vacío significa "sin filtro" (pasan todos). La comparación es por
 * "incluye" y todos los filtros se combinan con AND.
 */

/** Subconjunto estructural del Ticket que el filtro necesita (evita acoplarse al tipo completo). */
export interface FilterableTicket {
  tipo?: string | null
  prioridad?: string | null
  asignadoAId?: string | number | null
  subsidiaryId?: string | null
  titulo?: string | null
  descripcion?: string | null
  usuario?: string | null
  folio?: string | null
}

export interface TicketFilterState {
  search: string
  tipos: string[]
  prioridades: string[]
  /** ids de agente como string, o "__none__" para sin asignar. */
  asignados: string[]
  /** ids de sucursal, o "__none__" para sin sucursal. */
  sucursales: string[]
}

/** Sentinela para "sin asignar" / "sin sucursal". */
export const NONE_KEY = "__none__"

export function emptyTicketFilters(): TicketFilterState {
  return { search: "", tipos: [], prioridades: [], asignados: [], sucursales: [] }
}

export function assigneeKey(asignadoAId: string | number | null | undefined): string {
  return asignadoAId != null && asignadoAId !== "" ? String(asignadoAId) : NONE_KEY
}

export function subsidiaryKey(subsidiaryId: string | null | undefined): string {
  return subsidiaryId ?? NONE_KEY
}

export function matchesTicketFilters(t: FilterableTicket, f: TicketFilterState): boolean {
  if (f.tipos.length && !f.tipos.includes(String(t.tipo ?? ""))) return false
  if (f.prioridades.length && !f.prioridades.includes(String(t.prioridad ?? ""))) return false
  if (f.asignados.length && !f.asignados.includes(assigneeKey(t.asignadoAId))) return false
  if (f.sucursales.length && !f.sucursales.includes(subsidiaryKey(t.subsidiaryId))) return false

  const q = f.search.trim().toLowerCase()
  if (q) {
    const haystack = `${t.titulo ?? ""} ${t.descripcion ?? ""} ${t.usuario ?? ""} ${t.folio ?? ""}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}
