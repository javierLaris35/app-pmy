import type { DispatchOverviewPackage } from "@/lib/services/package-dispatchs"
import { statusLabel } from "@/lib/package-dossier"

/** Grupo del cierre (espejo de `closureBucket` en pmy-api dispatch-overview.util.ts). */
export type ClosureGroup = "entregado" | "no_entregado" | "otro"

const DELIVERED = new Set(["entregado", "entregado_en_bodega", "entregado_por_fedex"])
const NOT_DELIVERED = new Set([
  "no_entregado", "rechazado", "devuelto_a_fedex", "direccion_incorrecta", "cliente_no_disponible",
  "cambio_fecha_solicitado", "empresa_cerrada", "no_se_pudo_recolectar_el_cobro",
  "restriccion_seguridad_ubicacion", "cambio_domicilio", "demora_en_entrega",
])

export function closureGroupOf(status?: string | null): ClosureGroup {
  if (status && DELIVERED.has(status)) return "entregado"
  if (status && NOT_DELIVERED.has(status)) return "no_entregado"
  return "otro"
}

/** Texto del estatus con su código cuando es un no entregado ("Rechazado · 07"). */
export function statusWithCode(s: { status: string; code: string | null } | null): string {
  if (!s) return "Sin registro"
  return s.code ? `${statusLabel(s.status)} · ${s.code}` : statusLabel(s.status)
}

export type PackageKind = "paquete" | "carga" | "cobro" | "valor"

export interface OverviewFilters {
  q: string
  /** Estatus al cerrar (valor del estatus, o "sin_registro"). */
  atClosure: string[]
  current: string[]
  carrier: string[]
  kind: PackageKind[]
  onlyChanged: boolean
}

export const EMPTY_FILTERS: OverviewFilters = { q: "", atClosure: [], current: [], carrier: [], kind: [], onlyChanged: false }

export const hasFilters = (f: OverviewFilters) =>
  !!f.q.trim() || f.atClosure.length > 0 || f.current.length > 0 || f.carrier.length > 0 || f.kind.length > 0 || f.onlyChanged

function kindsOf(p: DispatchOverviewPackage): PackageKind[] {
  const k: PackageKind[] = [p.isCharge ? "carga" : "paquete"]
  if (p.payment) k.push("cobro")
  if (p.isHighValue) k.push("valor")
  return k
}

const closureKey = (p: DispatchOverviewPackage) => p.atClosure?.status ?? "sin_registro"

export function filterOverviewPackages(list: DispatchOverviewPackage[], f: OverviewFilters): DispatchOverviewPackage[] {
  const q = f.q.trim().toLowerCase()
  return list.filter((p) => {
    if (q) {
      const hay = [p.trackingNumber, p.recipientName, p.recipientAddress, p.recipientZip].some((v) => (v ?? "").toLowerCase().includes(q))
      if (!hay) return false
    }
    if (f.atClosure.length && !f.atClosure.includes(closureKey(p))) return false
    if (f.current.length && !f.current.includes(p.current.status)) return false
    if (f.carrier.length && !f.carrier.includes(p.carrier)) return false
    if (f.kind.length && !kindsOf(p).some((k) => f.kind.includes(k))) return false
    if (f.onlyChanged && !p.changedAfterClosure) return false
    return true
  })
}

/** Opciones con conteo para los chips de estatus (solo los que aparecen en la salida). */
export function statusOptions(list: DispatchOverviewPackage[], which: "atClosure" | "current") {
  const counts = new Map<string, number>()
  for (const p of list) {
    const key = which === "atClosure" ? closureKey(p) : p.current.status
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count, label: value === "sin_registro" ? "Sin registro" : statusLabel(value) }))
    .sort((a, b) => b.count - a.count)
}

export function kindOptions(list: DispatchOverviewPackage[]) {
  const labels: Record<PackageKind, string> = { paquete: "Paquete", carga: "Carga", cobro: "Cobro", valor: "Alto valor" }
  return (Object.keys(labels) as PackageKind[])
    .map((k) => ({ value: k, label: labels[k], count: list.filter((p) => kindsOf(p).includes(k)).length }))
    .filter((o) => o.count > 0)
}
