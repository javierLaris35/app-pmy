import { axiosConfig } from "../axios-config";

export interface SeventeenTrackQuota {
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
}

/** Quota actual de la cuenta 17TRACK (total/usada/restante). */
export async function getSeventeenTrackQuota(): Promise<SeventeenTrackQuota> {
  const { data } = await axiosConfig.get("/shipments/dhl/quota");
  return data;
}

/** Dispara el ciclo de tracking DHL (reciclaje de quota) on-demand. Solo superadmin. */
export async function runDhlSyncCron(): Promise<DhlSyncSummary> {
  const { data } = await axiosConfig.post("/shipments/dhl/sync-cron", {});
  return data;
}
