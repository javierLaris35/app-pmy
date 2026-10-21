import { classifyClosureBucket, hermosilloDayKey } from "@/lib/tracking/closure-status"
import { getDexCode } from "@/lib/utils"
import type { PreClosurePackageContext } from "@/lib/types"

/**
 * Guía tal como la usa la pantalla de cierre con pre-cierre: datos del cierre (estatus del día
 * de la ruta) + contexto del back (ingreso entregado y señales de LD).
 */
export interface ClosurePackageVM {
  id: string
  isCharge: boolean
  trackingNumber: string
  carrier: "FedEx" | "DHL"
  recipient: string
  /** Estatus con el que el sistema cierra la guía (día de la ruta). */
  systemStatus: string
  systemCode: string | null
  commitDateTime?: string | null
  hasDeliveredIncome: boolean
  noMovement: boolean
  dueToday: boolean
  ldState: PreClosurePackageContext["ldState"]
}

export interface PreClosureDevolucion {
  trackingNumber: string
  dex: string
  /** También está en riesgo de LD (se marca junto a la guía). */
  ld: boolean
}

export interface PreClosureLdRisk {
  trackingNumber: string
  recipient: string
  due: string | null
  signals: string[]
}

export interface PreClosureCashRow {
  tc: string
  amount: number
  trackingNumber: string
}

export interface PreClosureSheet {
  companyName: string
  city: string
  driver: string
  routeDay: string
  vehicle?: string
  kmOut?: number
  /** 20 renglones por hoja, como la hoja impresa. Siempre hay al menos una (en blanco). */
  devolucionPages: PreClosureDevolucion[][]
  ldRisk: PreClosureLdRisk[]
  cash: { rows: PreClosureCashRow[]; total: number }
  totals: {
    received: number
    returned: number
    dex03: number
    dex07: number
    dex08: number
    dex12: number
    /** En blanco: lo llena el chofer a mano. */
    collections: number | null
    effective: number
  }
}

export const DEVOLUCIONES_PER_PAGE = 20

/** "DEX08", "DEX12", "STAT42"… El código guardado manda; si no hay, se deduce del estatus. */
export function dexLabel(status: string, code?: string | null): string {
  if (code && /^\d+$/.test(code)) return `DEX${code}`
  return getDexCode(status) ?? ""
}

const isAtRisk = (p: ClosurePackageVM) => p.ldState === "possible_ld" || p.ldState === "ld"

function ldSignals(p: ClosurePackageVM): string[] {
  const out: string[] = []
  if (p.noMovement) out.push("Sin movimiento")
  if (p.dueToday) out.push("Vence hoy")
  if (p.ldState === "possible_ld") out.push("Posible LD")
  if (p.ldState === "ld") out.push("LD")
  return out
}

/** Datos de la hoja de pre-cierre (lógica pura; el PDF solo los dibuja). */
export function buildPreClosureSheet(input: {
  companyName: string
  city: string
  driver: string
  routeDay: string
  vehicle?: string
  kmOut?: number
  packages: ClosurePackageVM[]
  codPackages: PreClosureCashRow[]
}): PreClosureSheet {
  const { packages } = input
  const returned = packages.filter((p) => classifyClosureBucket(p.systemStatus) === "not_delivered")
  const devoluciones = returned.map((p) => ({ trackingNumber: p.trackingNumber, dex: dexLabel(p.systemStatus, p.systemCode), ld: isAtRisk(p) }))

  const devolucionPages: PreClosureDevolucion[][] = []
  for (let i = 0; i < devoluciones.length; i += DEVOLUCIONES_PER_PAGE) {
    devolucionPages.push(devoluciones.slice(i, i + DEVOLUCIONES_PER_PAGE))
  }
  if (devolucionPages.length === 0) devolucionPages.push([])

  const countDex = (label: string) => devoluciones.filter((d) => d.dex === label).length

  return {
    companyName: input.companyName,
    city: input.city,
    driver: input.driver,
    routeDay: input.routeDay,
    vehicle: input.vehicle,
    kmOut: input.kmOut,
    devolucionPages,
    // Solo las que pueden causar LD: sin movimiento o en posible LD / LD. "Vence hoy" con un DEX
    // válido ese día ya no causa LD, así que sola no entra.
    ldRisk: packages
      .filter((p) => classifyClosureBucket(p.systemStatus) !== "delivered" && (p.noMovement || isAtRisk(p)))
      .map((p) => ({ trackingNumber: p.trackingNumber, recipient: p.recipient, due: hermosilloDayKey(p.commitDateTime), signals: ldSignals(p) })),
    cash: { rows: input.codPackages, total: input.codPackages.reduce((sum, r) => sum + Number(r.amount || 0), 0) },
    totals: {
      received: packages.length,
      returned: returned.length,
      dex03: countDex("DEX03"),
      dex07: countDex("DEX07"),
      dex08: countDex("DEX08"),
      dex12: countDex("DEX12"),
      collections: null,
      effective: packages.filter((p) => classifyClosureBucket(p.systemStatus) === "delivered").length,
    },
  }
}
