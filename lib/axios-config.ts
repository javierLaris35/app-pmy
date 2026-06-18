import axios from "axios";
import { useAuthStore } from "@/store/auth.store";
import { isTokenExpired } from "@/lib/jwt";
import { getClientMeta, ensureClientMeta } from "@/lib/client-meta";
import { useOfflineStore } from "@/lib/offline/offline-store";
import { toast } from "sonner";

export const axiosConfig = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Obtiene IP pública + ciudad + equipo apenas carga la app (incluye la pantalla
// de login), para que los headers viajen cuanto antes.
if (typeof window !== "undefined") {
  void ensureClientMeta();
}

/** Adjunta info del cliente (IP pública, ciudad, equipo) para auditoría. */
const attachClientMeta = (config: any) => {
  const meta = getClientMeta();
  if (!meta) return;
  if (meta.publicIp) config.headers["x-public-ip"] = meta.publicIp;
  if (meta.city) config.headers["x-geo-city"] = encodeURIComponent(meta.city);
  if (meta.region) config.headers["x-geo-region"] = encodeURIComponent(meta.region);
  if (meta.country) config.headers["x-geo-country"] = encodeURIComponent(meta.country);
  if (meta.device) config.headers["x-device"] = encodeURIComponent(meta.device);
  if (meta.deviceId) config.headers["x-device-id"] = meta.deviceId;
  if (meta.machineName) config.headers["x-machine-name"] = encodeURIComponent(meta.machineName);
};

axiosConfig.interceptors.request.use(
  (config) => {
    attachClientMeta(config);

    const { token, logout } = useAuthStore.getState();

    if (!token) return config;

    // 🔥 validación frontend (la importante)
    if (isTokenExpired(token)) {
      logout();
      return Promise.reject("Token expirado");
    }

    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== Offline: si una mutación falla por falta de red, se encola y se
// reenvía automáticamente al reconectar (ver lib/offline). =====
axiosConfig.interceptors.response.use(
  (response) => response,
  (error) => {
    const cfg: any = error?.config || {};
    const method = (cfg.method || "get").toLowerCase();
    const url: string = cfg.url || "";
    const isMutation = ["post", "put", "patch", "delete"].includes(method);
    const isNetworkError = !error?.response; // sin respuesta = red caída
    const isAuth = /auth\/(token|logout)/.test(url);

    if (isNetworkError && isMutation && !cfg.__isRetry && !isAuth && typeof window !== "undefined") {
      try {
        const ct = cfg.headers?.["Content-Type"] || cfg.headers?.["content-type"];
        useOfflineStore.getState().enqueue({
          method,
          url,
          data: cfg.data,
          headers: ct ? { "Content-Type": ct } : undefined,
          label: url,
        });
        useOfflineStore.getState().setOnline(false);
        toast.message("Sin conexión: el cambio se guardó y se enviará al reconectar.");
        // Respuesta optimista para no romper el flujo de la UI.
        return Promise.resolve({ data: { _queued: true }, status: 202, statusText: "Queued (offline)", headers: {}, config: cfg });
      } catch {
        /* si algo falla al encolar, caemos al reject normal */
      }
    }
    return Promise.reject(error);
  }
);