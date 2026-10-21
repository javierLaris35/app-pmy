import { classifyClosureBucket } from "@/lib/tracking/closure-status"
import type { ClosurePackageVM } from "@/lib/services/route-closure/pre-closure-sheet"
import type { ManualOption, ManualStatusChangeInput, PackageInfo, PreClosurePackageContext } from "@/lib/types"

/**
 * Lógica pura del cierre con pre-cierre: qué cambió el usuario contra lo que dice el sistema, en
 * qué pestaña cae cada guía y qué se manda al cerrar. Nada se guarda hasta "Cerrar ruta".
 */

/** Opciones FedEx del selector "Según el chofer" (espejo de pmy-api manual-status.util). */
export const MANUAL_OPTIONS: { value: ManualOption; label: string; status: string; code: string | null }[] = [
  { value: "ENTREGADO", label: "Entregado", status: "entregado", code: null },
  { value: "DEX03", label: "DEX03 · Dirección incorrecta", status: "direccion_incorrecta", code: "03" },
  { value: "DEX07", label: "DEX07 · Rechazado", status: "rechazado", code: "07" },
  { value: "DEX08", label: "DEX08 · Cliente no disponible", status: "cliente_no_disponible", code: "08" },
  // DEX12 no tiene estatus propio: no_entregado + código 12 (empresa_cerrada es el STAT42).
  { value: "DEX12", label: "DEX12 · No entregado", status: "no_entregado", code: "12" },
  { value: "OCURRE", label: "Ocurre", status: "es_ocurre", code: null },
]

export type ClosureTab = "POD" | "DEX" | "Ocurre" | "Otros"

/** Cambios por guía: llave = id (paquete) o "c:<id>" (carga). */
export type ClosureChanges = Record<string, ManualOption>

export const changeKey = (pkg: Pick<ClosurePackageVM, "id" | "isCharge">) => (pkg.isCharge ? `c:${pkg.id}` : pkg.id)

/** Opción del selector que corresponde al estatus del sistema (null si no hay una: en ruta, etc.). */
export function optionForStatus(status: string, code?: string | null): ManualOption | null {
  const s = (status || "").toLowerCase()
  if (s === "no_entregado") return code === "12" ? "DEX12" : null
  return MANUAL_OPTIONS.find((o) => o.status === s)?.value ?? null
}

export function optionMeta(option: ManualOption) {
  return MANUAL_OPTIONS.find((o) => o.value === option)!
}

/** Registra el cambio; si vuelve a lo que dice el sistema (o se limpia), deja de ser cambio. */
export function applyChange(changes: ClosureChanges, pkg: ClosurePackageVM, option: ManualOption | null): ClosureChanges {
  const key = changeKey(pkg)
  const next = { ...changes }
  if (!option || option === optionForStatus(pkg.systemStatus, pkg.systemCode)) delete next[key]
  else next[key] = option
  return next
}

export function effectiveStatus(pkg: ClosurePackageVM, changes: ClosureChanges): { status: string; code: string | null } {
  const option = changes[changeKey(pkg)]
  if (!option) return { status: pkg.systemStatus, code: pkg.systemCode }
  const meta = optionMeta(option)
  return { status: meta.status, code: meta.code }
}

export function effectiveBucket(pkg: ClosurePackageVM, changes: ClosureChanges): ClosureTab {
  switch (classifyClosureBucket(effectiveStatus(pkg, changes).status)) {
    case "delivered":
      return "POD"
    case "not_delivered":
      return "DEX"
    case "ocurre":
      return "Ocurre"
    default:
      return "Otros"
  }
}

/** Aviso "ya tiene ingreso": solo paquetes (no cargas) fuera de 31.5 que dejan de estar entregados. */
export function needsIncomeWarning(pkg: ClosurePackageVM, option: ManualOption | null, is315: boolean): boolean {
  if (pkg.isCharge || is315 || !pkg.hasDeliveredIncome) return false
  if (classifyClosureBucket(pkg.systemStatus) !== "delivered") return false
  return !!option && option !== "ENTREGADO"
}

/** Lo que viaja en el cierre: `previousStatus` = estatus VIVO (el back rechaza si cambió). */
export function toPayload(changes: ClosureChanges, pkgs: ClosurePackageVM[]): ManualStatusChangeInput[] {
  return pkgs
    .filter((p) => changes[changeKey(p)])
    .map((p) => ({
      id: p.id,
      isCharge: p.isCharge,
      trackingNumber: p.trackingNumber,
      previousStatus: p.liveStatus ?? p.systemStatus,
      option: changes[changeKey(p)],
    }))
}

/** Cruza los paquetes del cierre (estatus del día de la ruta) con el estatus vivo y el contexto del back. */
export function toClosureVMs(
  packages: PackageInfo[],
  liveStatusById: Record<string, string>,
  context: PreClosurePackageContext[],
): ClosurePackageVM[] {
  const ctx = new Map(context.map((c) => [changeKey(c), c]))
  return packages.map((p) => {
    const isCharge = !!p.isCharge
    const id = p.id ?? ""
    const c = ctx.get(isCharge ? `c:${id}` : id)
    const systemStatus = String(p.status ?? "")
    return {
      id,
      isCharge,
      trackingNumber: p.trackingNumber,
      carrier: (p.shipmentType || "").toLowerCase() === "dhl" ? "DHL" : "FedEx",
      recipient: p.recipientName || "—",
      systemStatus,
      systemCode: p.exceptionCode || null,
      liveStatus: liveStatusById[isCharge ? `c:${id}` : id] ?? systemStatus,
      commitDateTime: p.commitDateTime ?? null,
      hasDeliveredIncome: c?.hasDeliveredIncome ?? false,
      noMovement: c?.noMovement ?? false,
      dueToday: c?.dueToday ?? false,
      ldState: c?.ldState ?? "active",
    }
  })
}
