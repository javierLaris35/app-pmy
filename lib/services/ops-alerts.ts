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
  uploadNotifyEnabled: boolean;
  /** Grupos generales de WhatsApp (aviso de subida y alertas). */
  uploadNotifyGroups: { id: string; name: string }[] | null;
  alertGroupsEnabled: boolean;
  /** Desde qué aviso van las alertas a los grupos: 1 vencido · 2 · 3. */
  alertGroupsLevel: number;
  /** Solo en desarrollo: número de prueba al que llegan los WhatsApp (permite "Probar alertas ahora"). */
  devTestNumber?: string | null;
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
  /** Se subió con otro número (p. ej. la F2 con el número del master). */
  uploadedAs?: string | null;
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
export const testOpsDigest = async (): Promise<{ sent: number; groups: number; message?: string }> => (await axiosConfig.post(`${base}/test-digest`)).data;
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

// ------------------------------------------------------------------ Mandar aviso + historial

export type FindingCode =
  | "no_subido"
  | "subida_parcial"
  | "entregadas_sin_desembarque"
  | "ruta_sin_desembarque"
  | "desembarque_incompleto"
  | "sin_ruta"
  | "ruta_sin_cierre"
  | "sin_pendientes";

export interface NoticeFinding {
  code: FindingCode;
  severity: "alta" | "media" | "info";
  text: string;
  count: number;
  samples: string[];
}

export interface NoticeAnalysis {
  consolidation: { id: string; consNumber: string; kind: string; kindLabel: string; receivedAt: string; subsidiaryId: string | null; subsidiaryName: string | null; inboxMessageId: string };
  progress: { total: number; unloaded: number; routed: number; closed: number };
  findings: NoticeFinding[];
  recipients: { groups: { id: string; name: string }[]; subsidiaryUsers: number; managers: { id: string; name: string }[]; numbers: string[] };
}

export interface NoticeRequest {
  findings: FindingCode[];
  note?: string;
  withSamples?: boolean;
  targets: { groups?: boolean; subsidiary?: boolean; managers?: boolean; numbers?: boolean };
}

export interface NoticeSendResult {
  channel: "whatsapp" | "campana" | "correo";
  recipientName: string | null;
  status: "enviado" | "fallido" | "en_cola";
  error?: string | null;
}

export const getNoticeAnalysis = async (id: string): Promise<NoticeAnalysis> => (await axiosConfig.get(`${base}/notice/${id}`)).data;
export const previewNotice = async (id: string, body: NoticeRequest): Promise<{ text: string; planned: { channel: string; recipientName: string }[] }> =>
  (await axiosConfig.post(`${base}/notice/${id}/preview`, body)).data;
export const sendNotice = async (id: string, body: NoticeRequest): Promise<{ text: string; results: NoticeSendResult[] }> =>
  (await axiosConfig.post(`${base}/notice/${id}/send`, body)).data;

export interface SendLogItem {
  id: string;
  createdAt: string;
  channel: "whatsapp" | "campana" | "correo";
  origin: "alerta" | "subida" | "manual";
  recipientType: "grupo" | "numero" | "usuario";
  recipientId: string;
  recipientName: string | null;
  sentById: string | null;
  sentByName: string | null;
  subsidiaryId: string | null;
  subsidiaryName: string | null;
  consNumber: string | null;
  inboxMessageId: string | null;
  title: string | null;
  body: string;
  status: "enviado" | "fallido" | "en_cola";
  error: string | null;
}

export const getSendLog = async (p: { from?: string; to?: string; subsidiaryId?: string; channel?: string; origin?: string; q?: string; page?: number; pageSize?: number }) =>
  (await axiosConfig.get<{ items: SendLogItem[]; total: number; page: number; pageSize: number }>(`${base}/send-log`, { params: p })).data;
