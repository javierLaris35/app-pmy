import { ManualKind } from "@/lib/types/consolidador";

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
