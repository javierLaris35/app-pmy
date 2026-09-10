import { ManualKind, SearchPackageResult } from "@/lib/types/consolidador";

/** ¿Es válido el ajuste de costo? cost >= 0 y motivo con al menos 3 caracteres. */
export function isValidCostEdit(cost: number, reason: string): boolean {
  return Number.isFinite(cost) && cost >= 0 && reason.trim().length >= 3;
}

export interface ManualIncomeDraft {
  kind: ManualKind | "";
  cost: number;
  date: string; // YYYY-MM-DD
  reason: string;
  trackingNumber?: string;
}

/** ¿Es válida el alta manual? tipo elegido, cost >= 0, motivo >= 3 y fecha dentro de la semana. */
export function isValidManualIncome(draft: ManualIncomeDraft, week: { from: string; to: string }): boolean {
  if (!draft.kind) return false;
  if (!Number.isFinite(draft.cost) || draft.cost < 0) return false;
  if (draft.reason.trim().length < 3) return false;
  if (!draft.date || draft.date < week.from || draft.date > week.to) return false;
  return true;
}

/** Máximo de guías por búsqueda en lote. */
export const MAX_BATCH_TRACKINGS = 30;

/**
 * Parsea un texto libre (saltos de línea, comas, espacios, tabs) a una lista de guías única,
 * recortada a {@link MAX_BATCH_TRACKINGS}.
 */
export function parseTrackingList(text: string): string[] {
  const tokens = (text || "")
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return [...new Set(tokens)].slice(0, MAX_BATCH_TRACKINGS);
}

/**
 * ¿Se puede corregir el estatus? Solo si hay shipment, FedEx confirmó (found y sin error), y su
 * estatus difiere del interno. Si FedEx falla o coincide, no se ofrece la corrección.
 */
export function canFixStatus(result: SearchPackageResult | null): boolean {
  if (!result?.shipment) return false;
  const { fedex, internalStatus } = result;
  if (!fedex.found || fedex.error) return false;
  if (!fedex.status || fedex.status === internalStatus) return false;
  return true;
}
