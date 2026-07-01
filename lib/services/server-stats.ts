import { axiosConfig } from "../axios-config"

export interface ServerStats {
  timestamp: string
  hostname: string
  platform: string
  uptimeSec: number
  cpu: {
    usagePct: number
    cores: number
    model: string
    loadAvg: { "1m": number; "5m": number; "15m": number }
  }
  memory: { total: number; used: number; free: number; pct: number }
  disk: { total: number; used: number; free: number; pct: number } | null
  network: { rxBytesPerSec: number; txBytesPerSec: number; rxTotal: number; txTotal: number } | null
}

/** Métricas de uso del servidor (solo superadmin). */
export const getServerStats = async () => {
  const response = await axiosConfig.get<ServerStats>("/server/stats")
  return response.data
}
