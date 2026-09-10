import { axiosConfig } from "../axios-config";

/** Respuesta del disparo manual: corre en segundo plano y responde de inmediato. */
export interface DhlSyncStarted {
  success: boolean;
  started?: boolean;
  background?: boolean;
}

/** Dispara el ciclo de tracking DHL (API oficial) on-demand (en 2º plano). Solo superadmin. */
export async function runDhlSyncCron(): Promise<DhlSyncStarted> {
  const { data } = await axiosConfig.post("/shipments/dhl/sync-cron", {});
  return data;
}

/** Consulta manual de guías DHL en la API oficial (opcionalmente persiste). */
export interface DhlManualTrackResult {
  success: boolean;
  message?: string;
  totalProcessed?: number;
  data?: unknown;
  persisted?: unknown;
}

export async function manualTrackDhl(
  trackingNumbers: string[],
  persist = true,
): Promise<DhlManualTrackResult> {
  const { data } = await axiosConfig.post("/shipments/dhl/manual-track", { trackingNumbers, persist });
  return data;
}
