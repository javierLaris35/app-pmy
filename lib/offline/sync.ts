import { axiosConfig } from "@/lib/axios-config";
import { useOfflineStore } from "./offline-store";
import { toast } from "sonner";

let flushing = false;

/** Reenvía las mutaciones pendientes en orden. Se detiene si sigue sin red. */
export async function flushOutbox() {
  if (flushing) return;
  const state = useOfflineStore.getState();
  if (state.outbox.length === 0) return;

  flushing = true;
  let ok = 0;
  try {
    for (const item of [...useOfflineStore.getState().outbox]) {
      try {
        await axiosConfig.request({
          method: item.method,
          url: item.url,
          data: item.data,
          headers: item.headers,
          __isRetry: true,
        } as any);
        useOfflineStore.getState().remove(item.id);
        ok++;
      } catch (e: any) {
        if (!e?.response) break; // sigue sin conexión → reintentar luego
        // El servidor respondió con error (4xx/5xx): descartamos para no atorar la cola.
        useOfflineStore.getState().remove(item.id);
      }
    }
  } finally {
    flushing = false;
    if (ok > 0) toast.success(`Se sincronizaron ${ok} cambio(s) pendiente(s)`);
  }
}

/** Inicializa listeners de conexión y dispara la sincronización al reconectar. */
export function initOfflineSync() {
  if (typeof window === "undefined") return;
  const { setOnline } = useOfflineStore.getState();

  const onOnline = () => {
    setOnline(true);
    flushOutbox();
  };
  const onOffline = () => setOnline(false);

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  setOnline(navigator.onLine);
  if (navigator.onLine) flushOutbox();
}
