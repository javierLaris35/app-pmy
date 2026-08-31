// lib/support/ticket-views.ts
// Vistas rápidas del rail izquierdo del tablero (imagen de referencia "Ticket Views").
// Cada vista es un predicado sobre el ticket + un contador derivado de la lista.
import type { Ticket, TicketStatus } from "@/lib/types/support-ticket"

export type ViewKey =
  | "todos" | "abiertos" | "vencidos" | "sin_asignar" | "resueltos"
  | "error" | "mejora" | "cambio" | "eliminar"

const OPEN_STATES: TicketStatus[] = ["pendiente", "por_hacer", "en_progreso", "en_revision"]

/** ¿El ticket pertenece a la vista `key`? */
export function viewMatches(t: Ticket, key: ViewKey): boolean {
  switch (key) {
    case "todos": return true
    case "abiertos": return OPEN_STATES.includes(t.estado)
    case "vencidos": return !!t.slaBreached && OPEN_STATES.includes(t.estado)
    case "sin_asignar": return !t.asignadoA
    case "resueltos": return t.estado === "completado" || t.estado === "rechazado"
    default: return t.tipo === key // error | mejora | cambio | eliminar
  }
}

export interface ViewDef { key: ViewKey; label: string }

/** Vistas por estado/situación (sección superior del rail). */
export const PRIMARY_VIEWS: ViewDef[] = [
  { key: "todos", label: "Todos" },
  { key: "abiertos", label: "Abiertos" },
  { key: "vencidos", label: "SLA vencido" },
  { key: "sin_asignar", label: "Sin asignar" },
  { key: "resueltos", label: "Resueltos" },
]

/** Vistas por tipo de ticket (sección inferior del rail). */
export const TYPE_VIEWS: ViewDef[] = [
  { key: "error", label: "Errores" },
  { key: "mejora", label: "Mejoras" },
  { key: "cambio", label: "Cambios" },
  { key: "eliminar", label: "Eliminaciones" },
]

/** Cuántos tickets de `list` caen en la vista `key`. */
export function countView(list: Ticket[], key: ViewKey): number {
  return list.reduce((n, t) => (viewMatches(t, key) ? n + 1 : n), 0)
}
