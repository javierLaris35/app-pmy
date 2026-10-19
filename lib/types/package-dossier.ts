/** Expediente de una guía (GET /package-dossier/:query). Espejo de pmy-api/src/package-dossier. */

export type DossierEventTone = "neutral" | "info" | "success" | "warning" | "danger"

export type DossierInternalKind =
  | "registro"
  | "desembarque"
  | "salida_ruta"
  | "ingreso"
  | "inventario"
  | "devolucion"

export interface DossierInternalEvent {
  kind: DossierInternalKind
  date: string | null
  /** Si viene, el evento es de día (ingreso): mostrar solo este día. */
  day?: string | null
  title: string
  detail: string | null
  tag: string | null
  tone: DossierEventTone
}

export interface DossierCarrierEvent {
  date: string | null
  status: string
  code: string | null
  description: string | null
}

export interface DossierIncome {
  id: string
  day: string
  cost: number
  incomeType: string | null
  sourceType: string
  isGrouped: boolean
  active: boolean
  subsidiaryName: string | null
  linkedByTracking: boolean
  createdAt: string | null
}

export interface DossierRecord {
  id: string
  kind: "shipment" | "charge"
  trackingNumber: string
  dhlUniqueId: string | null
  pieceKey: string
  carrier: string
  status: string
  priority: string | null
  isHighValue: boolean
  active: boolean
  subsidiary: { id: string; name: string } | null
  commitDateTime: string | null
  createdAt: string | null
  createdBy: string | null
  receivedByName: string | null
  recipient: { name: string | null; address: string | null; city: string | null; zip: string | null; phone: string | null }
  consolidated: { id: string; consNumber: string | null; type: string; day: string | null; numberOfPackages: number; createdBy: string | null } | null
  charge: { id: string; consNumber: string | null; day: string | null; isHalfTon: boolean; numberOfPackages: number; createdBy: string | null } | null
  unloading: { id: string; folio: string; date: string | null; createdBy: string | null } | null
  payment: { type: string; amount: number; status: string } | null
  incomes: DossierIncome[]
  internalEvents: DossierInternalEvent[]
  carrierEvents: DossierCarrierEvent[]
}

export interface PackageDossier {
  query: string
  matchedBy: "tracking" | "dhlPiece" | null
  selectedPieceKey: string | null
  records: DossierRecord[]
}
