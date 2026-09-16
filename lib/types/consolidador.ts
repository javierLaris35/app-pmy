/** Tipos del Consolidador de Finanzas (espejo del backend `src/consolidador/consolidador.types.ts`). */

export type ConsolidadorSourceType =
  | "shipment"
  | "collection"
  | "charge"
  | "manual"
  | "tyco"
  | "aeropuerto"
  | "special_transfer";

export interface ConsolidadorRow {
  id: string;
  trackingNumber: string | null;
  sourceType: ConsolidadorSourceType;
  incomeType: string;
  cost: number;
  originalCost: number | null;
  date: string; // ISO
  consNumber: string | null;
  consolidatedId: string | null;
  routeId: string | null;
  shipmentId: string | null;
  shipmentStatus: string | null;
  editReason: string | null;
  secondAbordApplied: boolean | null;
  secondAbordAmount: number;
  subsidiaryId: string | null;
  subsidiaryName: string | null;
}

export interface ConsolidadorBucket {
  amount: number;
  count: number;
}

export interface ConsolidadorBuckets {
  envios: ConsolidadorBucket;
  cargas: ConsolidadorBucket;
  recolecciones: ConsolidadorBucket;
  traslados: ConsolidadorBucket;
  manual: ConsolidadorBucket;
  total: ConsolidadorBucket;
}

export interface ConsolidadorReadResult {
  rows: ConsolidadorRow[];
  buckets: ConsolidadorBuckets;
}

export type ManualKind = "recoleccion" | "pod" | "dex" | "manual";

export interface IncomeChangeLogEntry {
  id: string;
  incomeId: string | null;
  shipmentId: string | null;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  userId: string | null;
  createdAt: string;
}

export interface StatusHistoryEntry {
  status: string;
  timestamp: string | null;
}

export interface AnomalyRow extends ConsolidadorRow {
  anomalies: { code: string; label: string }[];
  statusDate: string | null;
  statusHistory: StatusHistoryEntry[];
}

export interface FedexLatestStatus {
  found: boolean;
  status: string | null;
  statusByLocale?: string | null;
  description?: string | null;
  error?: string;
}

export interface SearchPackageResult {
  shipment: { id: string; trackingNumber: string; status: string } | null;
  internalStatus: string | null;
  fedex: FedexLatestStatus;
  suggestion: { newStatus: string | null; incomeEffect: { kind: string } } | null;
  income: ConsolidadorRow | null;
  incomeRepairNeeded: boolean;
  incomeRepairType: string | null;
}

export interface SearchBatchItem extends SearchPackageResult {
  tracking: string;
  /** Fecha del último evento de estatus (shipment_status.timestamp). */
  statusDate: string | null;
  /** Fecha del registro en ingresos (income.date). */
  incomeDate: string | null;
  /** Anomalías detectadas (fecha desalineada, estatus retrocedió, ingreso sin respaldo…). */
  anomalies: { code: string; label: string }[];
  /** Secuencia de estatus del envío (status + timestamp), más reciente primero. */
  statusHistory: StatusHistoryEntry[];
}

export interface SearchBatchResult {
  results: SearchBatchItem[];
}

// --- Auditoría de cobros (FedEx envío, por sucursal + semana) ---
export type CobroRule = "entregado" | "no_entregado";
export type CobroDiscrepancy = "missing" | "extra";

export interface CobrosAuditRow {
  trackingNumber: string;
  rule: CobroRule;
  subCode: "07" | "08" | null;
  discrepancy: CobroDiscrepancy;
  reason: string;
  isF2: boolean;
  count: number;
  currentStatus: string | null;
  cost: number | null;
}

export interface CobrosAuditRuleBucket {
  rule: CobroRule;
  missing: CobrosAuditRow[];
  missingCount: number;
  missingAmount: number;
  extra: CobrosAuditRow[];
  extraCount: number;
  extraAmount: number;
}

export interface CobrosAuditReport {
  subsidiaryId: string;
  subsidiaryName: string | null;
  from: string;
  to: string;
  evaluated: number;
  rules: CobrosAuditRuleBucket[];
  totals: { missingCount: number; extraCount: number; missingAmount: number; extraAmount: number };
}
