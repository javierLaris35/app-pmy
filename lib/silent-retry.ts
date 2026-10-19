/**
 * Reintento silencioso mientras el servidor se reinicia por una actualización: los
 * usuarios no deben ver errores ni avisos. Solo se reintenta cuando el pedido NO llegó
 * a la API (sin respuesta, o el proxy responde 502/503/504), así nunca se duplica un
 * guardado. ~30 s en total (15 intentos × 2 s).
 */
export const SILENT_RETRY_MAX = 15
export const SILENT_RETRY_DELAY_MS = 2000

export function shouldSilentRetry(error: any, attempt: number): boolean {
  if (attempt >= SILENT_RETRY_MAX) return false
  const cfg = error?.config
  if (!cfg || cfg.__noSilentRetry) return false
  if (error?.code === "ERR_CANCELED" || error?.code === "ECONNABORTED") return false
  const ct = String(cfg.headers?.["Content-Type"] || cfg.headers?.["content-type"] || "")
  if (ct.includes("multipart/form-data")) return false
  const status = error?.response?.status
  if (status == null) return true
  return status === 502 || status === 503 || status === 504
}
