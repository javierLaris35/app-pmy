import { axiosConfig } from "../axios-config";

export type ApprovalType =
  | "delete_consolidado"
  | "delete_route_dispatch"
  | "change_subsidiary_consolidado"
  | "change_date_consolidado";

/** Acciones sobre consolidado (borrar / cambiar sucursal / cambiar fecha). */
export type ConsolidatedActionType = Extract<
  ApprovalType,
  "delete_consolidado" | "change_subsidiary_consolidado" | "change_date_consolidado"
>;

export interface ConsolidatedActionPayload {
  newSubsidiaryId?: string;
  newDate?: string; // yyyy-MM-dd
}

export interface ConsolidatedPlanSummary {
  consolidated: number;
  shipments: number;
  chargeShipments: number;
  charges: number;
  devolutions: number;
  incomesAnnulled: number;
  incomesMoved: number;
  incomesRecosted: number;
  incomesRedated: number;
  amountBefore: number;
  amountAfter: number;
}

export interface ApprovalImpact {
  type: ApprovalType;
  targetId: string;
  label: string;
  createdByName?: string;
  subsidiaryId?: string | null;
  counts: {
    shipments: number;
    charges: number;
    enRuta: number;
    withIncome: number;
    withRoute?: number;
    devoluciones?: number;
    hasRouteClosure?: boolean;
  };
  approver?: { id: string; name: string } | null;
  // Solo en acciones de consolidado:
  consNumber?: string;
  subsidiaryName?: string;
  summary?: ConsolidatedPlanSummary;
  warnings?: string[];
  change?: { from: string; to: string } | null;
}

export interface ApprovalRequestItem {
  id: string;
  type: ApprovalType;
  targetId: string;
  requestedByName: string | null;
  approverName: string | null;
  status: "pendiente" | "aprobado" | "rechazado";
  reason: string | null;
  impactSnapshot: ApprovalImpact | null;
  createdAt: string;
  justification?: string | null;
  payload?: ConsolidatedActionPayload | null;
  targetLabel?: string | null;
  approverId?: string | null;
  requestedById?: string | null;
  resolvedAt?: string | null;
  executedAt?: string | null;
  executionError?: string | null;
  resultSummary?: ConsolidatedPlanSummary | null;
}

/** Un registro cambiado por una acción autorizada (bitácora). */
export interface ConsolidatedChangeLogItem {
  id: string;
  approvalRequestId: string | null;
  action: ApprovalType;
  consNumber: string | null;
  entityType: "consolidated" | "shipment" | "charge_shipment" | "charge" | "income" | "devolution";
  entityId: string;
  trackingNumber: string | null;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  userId: string | null;
  userName: string | null;
  createdAt: string;
}

export async function getApprovalImpact(
  type: ApprovalType,
  targetId: string,
  payload?: ConsolidatedActionPayload,
): Promise<ApprovalImpact> {
  const { data } = await axiosConfig.get("/approvals/impact", { params: { type, targetId, ...(payload ?? {}) } });
  return data;
}

export async function requestApproval(
  type: ApprovalType,
  targetId: string,
  opts: { justification?: string; payload?: ConsolidatedActionPayload } = {},
): Promise<ApprovalRequestItem> {
  const { data } = await axiosConfig.post("/approvals", { type, targetId, ...opts });
  return data;
}

export async function getConsolidatedHistory(
  consNumber: string,
  subsidiaryId: string,
): Promise<{ requests: ApprovalRequestItem[]; changes: ConsolidatedChangeLogItem[] }> {
  const { data } = await axiosConfig.get("/approvals/history/consolidated", { params: { consNumber, subsidiaryId } });
  return data;
}

/** Texto en llano de cada tipo de solicitud. */
export const APPROVAL_TYPE_LABEL: Record<ApprovalType, string> = {
  delete_consolidado: "Eliminar consolidado",
  delete_route_dispatch: "Eliminar salida a ruta",
  change_subsidiary_consolidado: "Cambiar sucursal del consolidado",
  change_date_consolidado: "Cambiar fecha del consolidado",
};

export async function getMyApprovals(): Promise<ApprovalRequestItem[]> {
  const { data } = await axiosConfig.get("/approvals/mine");
  return data;
}

export async function approveRequest(id: string): Promise<void> {
  await axiosConfig.post(`/approvals/${id}/approve`);
}

export async function rejectRequest(id: string, reason: string): Promise<void> {
  await axiosConfig.post(`/approvals/${id}/reject`, { reason });
}
