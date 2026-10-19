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

/** Días completos que lleva vencida (null si no está vencida o ya terminó). */
export function overdueDays(record: Pick<DossierRecord, "commitDateTime" | "status">, now = new Date()): number | null {
  if (!record.commitDateTime || FINAL_STATUSES.has(record.status)) return null
  const commit = new Date(record.commitDateTime)
  if (Number.isNaN(commit.getTime()) || commit >= now) return null
  return Math.floor((now.getTime() - commit.getTime()) / 86_400_000)
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
