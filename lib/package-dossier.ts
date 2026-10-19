import type { DossierRecord } from "@/lib/types/package-dossier"

/** Estatus con los que la guía ya terminó su vida con nosotros (no aplica "vencida"). */
const FINAL_STATUSES = new Set([
  "entregado",
  "entregado_en_bodega",
  "entregado_por_fedex",
  "devuelto_a_fedex",
  "retorno_abandono_fedex",
])

const STATUS_LABELS: Record<string, string> = {
  devuelto_a_fedex: "Devuelto a FedEx",
  entregado_por_fedex: "Entregado por FedEx",
  retorno_abandono_fedex: "Retorno por abandono FedEx",
  estacion_fedex: "En estación FedEx",
  acargo_de_fedex: "A cargo de FedEx",
  es_ocurre: "Ocurre",
}

export const statusLabel = (status?: string | null): string => {
  if (!status) return "Sin estatus"
  if (STATUS_LABELS[status]) return STATUS_LABELS[status]
  const s = status.replace(/_/g, " ")
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const carrierLabel = (carrier?: string | null): string =>
  (carrier ?? "").toLowerCase() === "dhl" ? "DHL" : "FedEx"

export type CommitLevel = "closed" | "overdue" | "today" | "tomorrow" | "ok" | "none"

export interface CommitTrafficLight {
  level: CommitLevel
  /** Días de calendario hasta el vencimiento (negativo = vencida). */
  days: number | null
  label: string
}

/**
 * Semáforo del vencimiento, por días de calendario (misma regla que salidas a ruta e
 * inventario: hoy = rojo, mañana = ámbar). Vencida = rojo intenso; 2+ días = verde; si la
 * guía ya terminó (entregada/devuelta) no aplica.
 */
export function commitTrafficLight(
  record: Pick<DossierRecord, "commitDateTime" | "status">,
  now = new Date(),
): CommitTrafficLight {
  if (!record.commitDateTime) return { level: "none", days: null, label: "Sin fecha de vencimiento" }
  const commit = new Date(record.commitDateTime)
  if (Number.isNaN(commit.getTime())) return { level: "none", days: null, label: "Sin fecha de vencimiento" }
  const cDay = new Date(commit.getFullYear(), commit.getMonth(), commit.getDate())
  const tDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((cDay.getTime() - tDay.getTime()) / 86_400_000)
  if (FINAL_STATUSES.has(record.status)) return { level: "closed", days, label: "Ya no aplica: la guía terminó" }
  if (days < 0) return { level: "overdue", days, label: `Vencida hace ${-days} ${days === -1 ? "día" : "días"}` }
  if (days === 0) return { level: "today", days, label: "Vence hoy" }
  if (days === 1) return { level: "tomorrow", days, label: "Vence mañana" }
  return { level: "ok", days, label: `Vence en ${days} días` }
}

/** Agrupa los registros por pieza (JD en DHL, guía en el resto), conservando el orden. */
export function groupByPiece(records: DossierRecord[]): { key: string; records: DossierRecord[] }[] {
  const groups = new Map<string, DossierRecord[]>()
  for (const r of records) {
    const list = groups.get(r.pieceKey) ?? []
    list.push(r)
    groups.set(r.pieceKey, list)
  }
  return [...groups.entries()].map(([key, recs]) => ({ key, records: recs }))
}

/** Día de negocio 'YYYY-MM-DD' → "14 oct 2026" sin correr la zona horaria. */
export function formatDay(day?: string | null): string | null {
  if (!day) return null
  const [y, m, d] = day.split("-").map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
}

/** Instante → "14 oct 2026, 08:12". */
export function formatInstant(value?: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export const formatMoney = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" })

/** Teléfono de 10 dígitos → "(662) 123-4567"; si no, lo deja como viene. */
export function formatPhone(phone?: string | null): string | null {
  const raw = (phone ?? "").trim()
  if (!raw) return null
  const digits = raw.replace(/\D/g, "")
  const local = digits.length === 12 && digits.startsWith("52") ? digits.slice(2) : digits
  if (local.length !== 10) return raw
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`
}
