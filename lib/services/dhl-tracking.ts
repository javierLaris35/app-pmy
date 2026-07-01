import { axiosConfig } from "../axios-config";

/** Uso del plan WhereParcel (total/usado/restante del mes + llamadas de hoy). */
export interface WhereParcelUsage {
  total: number;
  used: number;
  remaining: number;
  todayUsed: number;
}

export interface DhlSyncSummary {
  success: boolean;
  polledActive: number;
  updated: number;
  released: number;
  registered: number;
  quotaCap: number;
  quotaUsedAfter: number;
  durationMin: number;
  /** true si se omitió porque ya había un ciclo DHL en curso. */
  skipped?: boolean;
}

/** Uso actual del plan WhereParcel (total/usado/restante). */
export async function getWhereParcelUsage(): Promise<WhereParcelUsage> {
  const { data } = await axiosConfig.get("/shipments/dhl/quota");
  return data;
}

/** Respuesta del disparo manual: corre en segundo plano y responde de inmediato. */
export interface DhlSyncStarted {
  success: boolean;
  started?: boolean;
  background?: boolean;
}

/** Dispara el ciclo de tracking DHL (WhereParcel) on-demand (en 2º plano). Solo superadmin. */
export async function runDhlSyncCron(): Promise<DhlSyncStarted> {
  const { data } = await axiosConfig.post("/shipments/dhl/sync-cron", {});
  return data;
}

export interface DhlWebhookSetup {
  success: boolean;
  started?: boolean;
  endpointId?: string | null;
  callbackUrl?: string | null;
  note?: string;
}

/** Registra a webhooks las guías DHL pendientes (en 2º plano). Devuelve la URL de callback. Solo superadmin. */
export async function setupDhlWebhooks(): Promise<DhlWebhookSetup> {
  const { data } = await axiosConfig.post("/shipments/dhl/webhooks/setup", {});
  return data;
}
