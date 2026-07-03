import { useAuthStore } from "@/store/auth.store";

export type ServerLogSource = "combined" | "error";

export interface ServerLogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
}

export interface StreamServerLogsParams {
  /** Qué archivo leer en el backend (siempre "combined" en la UI actual; el filtro por nivel fino se hace en cliente). */
  source: ServerLogSource;
  /** `YYYY-MM-DD`. Si es hoy, el backend deja la conexión abierta y sigue mandando en vivo; si es una fecha pasada, manda una carga histórica y cierra. */
  date: string;
}

/**
 * Abre un stream NDJSON contra `/server/logs/stream` con `fetch` (no
 * `EventSource`): el token va en el header `Authorization`, igual que el resto
 * de la app (`axios-config.ts`), y `EventSource` nativo no permite headers
 * custom. Llama `onEntry` por cada línea completa recibida y `onEnd` cuando el
 * stream se cierra (ya sea porque terminó la carga histórica o por un error de
 * red — el llamador decide si eso amerita reintentar según si está viendo "hoy").
 */
export async function streamServerLogs(
  { source, date }: StreamServerLogsParams,
  onEntry: (entry: ServerLogEntry) => void,
  onEnd: () => void,
  signal: AbortSignal,
): Promise<void> {
  const token = useAuthStore.getState().token;
  const url = `${process.env.NEXT_PUBLIC_API_URL}/server/logs/stream?level=${source}&date=${date}`;

  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal,
    });
    if (!res.ok || !res.body) {
      onEnd();
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          onEntry(JSON.parse(line));
        } catch {
          // línea corrupta/incompleta, se ignora
        }
      }
    }
    onEnd();
  } catch (err: any) {
    if (err?.name !== "AbortError") onEnd();
  }
}
