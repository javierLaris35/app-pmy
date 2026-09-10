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
}

export interface SearchBatchItem extends SearchPackageResult {
  tracking: string;
}

export interface SearchBatchResult {
  results: SearchBatchItem[];
}
