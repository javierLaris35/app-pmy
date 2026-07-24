import { useAuthStore } from "@/store/auth.store";
import { axiosConfig } from "../axios-config";

export interface BackupStatus {
  /** ¿Este backend puede restaurar en el MySQL local? (solo desarrollo) */
  canRestore: boolean;
  /** BD destino local (normalmente "pmy-db"). */
  targetDatabase: string;
  /** API de producción de donde se trae el dump. */
  prodApiUrl: string;
}

/** Fases del restore; el peso lo maneja el backend, aquí solo etiquetamos. */
export type BackupPhase = "connect" | "download" | "prepare" | "restore";

export type BackupEvent =
  | { type: "step"; key: BackupPhase; message: string; percent: number }
  | { type: "progress"; phase: BackupPhase; percent: number; bytes?: number; totalBytes?: number }
  | { type: "log"; stream: "stdout" | "stderr"; line: string }
  | { type: "done"; message: string; percent: number }
  | { type: "error"; message: string };

/** Estado de la función de respaldo (solo superadmin). */
export const getBackupStatus = async () => {
  const response = await axiosConfig.get<BackupStatus>("/server/backup/status");
  return response.data;
};

/**
 * Dispara el restore de producción → local y consume el stream NDJSON de
 * progreso vía `fetch` (POST con `Authorization`, igual patrón que
 * `streamServerLogs`). Llama `onEvent` por cada evento y `onEnd` al cerrar.
 */
export async function streamRestoreFromProd(
  onEvent: (event: BackupEvent) => void,
  onEnd: () => void,
  signal: AbortSignal,
): Promise<void> {
  const token = useAuthStore.getState().token;
  const url = `${process.env.NEXT_PUBLIC_API_URL}/server/backup/restore-from-prod`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal,
    });
    if (!res.ok || !res.body) {
      let message = `El servidor respondió ${res.status}.`;
      try {
        const body = await res.json();
        if (body?.message) message = body.message;
      } catch {
        /* respuesta sin cuerpo JSON */
      }
      onEvent({ type: "error", message });
      onEnd();
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          onEvent(JSON.parse(line) as BackupEvent);
        } catch {
          /* línea incompleta/corrupta, se ignora */
        }
      }
    }
    onEnd();
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      onEvent({ type: "error", message: "Se perdió la conexión con el servidor durante el respaldo." });
      onEnd();
    }
  }
}
