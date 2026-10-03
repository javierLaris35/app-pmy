import { axiosConfig } from "../axios-config";

export type OpsStep = "upload" | "unloading" | "dispatch" | "closure" | "inventory";

export interface OpsSettings {
  enabled: boolean;
  enabledAt: string | null;
  uploadMinutes: number;
  unloadingTime: string;
  dispatchTime: string;
  closureTime: string;
  inventoryTime: string;
  escalate1Min: number;
  escalate2Min: number;
  completePct: number;
  lookbackDays: number;
  activeFrom: string;
  activeTo: string;
}

export interface OpsSubsidiaryConfig {
  subsidiaryId: string;
  subsidiaryName: string;
  stepUpload: boolean;
  stepUnloading: boolean;
  stepDispatch: boolean;
  stepClosure: boolean;
  stepInventory: boolean;
  managerUserIds: string[];
  whatsappNumbers: string[];
  whatsappGroups: { id: string; name: string }[];
}

export interface TrackingStep {
  step: Exclude<OpsStep, "inventory">;
  dueAt: string;
  done: boolean;
  doneAt: string | null;
  pct: number;
  late: boolean;
}

export interface TrackingItem {
  inboxConsolidationId: string;
  inboxMessageId: string;
  consNumber: string;
  kind: "master" | "aereo" | "f2" | "high_value" | "dhl" | "cod";
  subsidiaryId: string;
  announcedCount: number | null;
  receivedAt: string;
  guides: number;
  progress: { unloading: number; dispatch: number; closure: number; unloadingAt: string | null; dispatchAt: string | null; closureAt: string | null };
  steps: TrackingStep[];
  alerts: { step: OpsStep; level: number; dueAt: string }[];
}

export interface OpenAlert {
  id: string;
  subsidiaryId: string;
  step: OpsStep;
  consNumber: string | null;
  inboxConsolidationId: string | null;
  dueAt: string;
  level: number;
  progressPct: number;
}

const base = "/ops-alerts";

export const getOpsSettings = async (): Promise<OpsSettings> => (await axiosConfig.get(`${base}/settings`)).data;
export const updateOpsSettings = async (patch: Partial<OpsSettings>): Promise<OpsSettings> => (await axiosConfig.put(`${base}/settings`, patch)).data;
export const getOpsSubsidiaries = async (): Promise<OpsSubsidiaryConfig[]> => (await axiosConfig.get(`${base}/subsidiaries`)).data;
export const updateOpsSubsidiary = async (id: string, patch: Partial<OpsSubsidiaryConfig>) => (await axiosConfig.put(`${base}/subsidiaries/${id}`, patch)).data;
export const getWhatsappGroups = async (): Promise<{ id: string; subject: string; participants: number }[]> => (await axiosConfig.get(`${base}/whatsapp-groups`)).data;
export const evaluateOpsAlerts = async () => (await axiosConfig.post(`${base}/evaluate`)).data;
export const getTracking = async (p: { from?: string; to?: string; subsidiaryId?: string }): Promise<TrackingItem[]> => (await axiosConfig.get(`${base}/tracking`, { params: p })).data;
export const getTrackingForMessage = async (id: string): Promise<TrackingItem[]> => (await axiosConfig.get(`${base}/tracking/message/${id}`)).data;
export const getOpenAlerts = async (): Promise<OpenAlert[]> => (await axiosConfig.get(`${base}/open`)).data;

export const STEP_LABEL: Record<OpsStep, string> = {
  upload: "Subido",
  unloading: "Desembarcado",
  dispatch: "En ruta",
  closure: "Ruta cerrada",
  inventory: "Inventario",
};
