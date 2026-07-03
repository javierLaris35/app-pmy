import { axiosConfig } from "@/lib/axios-config";

export type RemoteProtocol = "vnc" | "ssh";

/**
 * Pide al backend (superadmin) un token de conexión CIFRADO. Las credenciales
 * del servidor nunca llegan al navegador; el gateway WS lo descifra.
 */
export const startRemoteSession = async (protocol: RemoteProtocol) => {
  const res = await axiosConfig.post("remote/session", { protocol });
  return res.data as { connection: string };
};

/** Deriva la URL WSS del túnel a partir de la URL del API (http→ws / https→wss). */
export const remoteWsBaseUrl = (): string => {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "";
  return api.replace(/^http/i, "ws").replace(/\/+$/, "");
};
