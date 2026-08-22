import { axiosConfig } from "../axios-config";

export type ApprovalType = "delete_consolidado" | "delete_route_dispatch";

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
    devoluciones?: number;
    hasRouteClosure?: boolean;
  };
  approver?: { id: string; name: string } | null;
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
}

export async function getApprovalImpact(type: ApprovalType, targetId: string): Promise<ApprovalImpact> {
  const { data } = await axiosConfig.get("/approvals/impact", { params: { type, targetId } });
  return data;
}

export async function requestApproval(type: ApprovalType, targetId: string): Promise<ApprovalRequestItem> {
  const { data } = await axiosConfig.post("/approvals", { type, targetId });
  return data;
}

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
