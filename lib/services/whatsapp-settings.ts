import { axiosConfig } from "../axios-config";

export interface WhatsappSettings {
  id?: string;
  /** Interruptor general del feature. */
  enabled: boolean;
  /** Número destino, solo dígitos, formato internacional (ej. "526444230374"). */
  driverPhone: string;
  /** Plantilla del mensaje. Placeholders: {cliente} {direccion} {cp} {guias} {vence} {ruta} {chofer}. */
  messageTemplate: string;
  updatedAt?: string;
}

export const getWhatsappSettings = async () => {
  const res = await axiosConfig.get<WhatsappSettings>("whatsapp-settings");
  return res.data;
};

export const updateWhatsappSettings = async (payload: Partial<WhatsappSettings>) => {
  const res = await axiosConfig.put<WhatsappSettings>("whatsapp-settings", payload);
  return res.data;
};

/** Contexto de una parada para rellenar la plantilla del mensaje. */
export interface DriverMessageContext {
  cliente: string;
  direccion: string;
  cp: string;
  guias: string;
  vence: string;
  ruta: string;
  chofer: string;
}

/** Reemplaza los placeholders {…} de la plantilla con los datos de la parada. */
export function buildDriverMessage(template: string, ctx: DriverMessageContext): string {
  const map = ctx as unknown as Record<string, string>;
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const v = map[key];
    return v != null && v !== "" ? v : "—";
  });
}

// ── Gateway auto-hospedado (Baileys): el envío sale DIRECTO de la API, no de wa.me ──

export type WaConnStatus = "disconnected" | "connecting" | "qr" | "connected";

export interface WhatsappConnection {
  status: WaConnStatus;
  /** QR (data URL) para vincular cuando status === "qr". */
  qr: string | null;
  /** Número vinculado (solo dígitos) cuando está conectado. */
  me: string | null;
  /** Último error de conexión (motivo de la última desconexión), si lo hubo. */
  lastError?: string | null;
}

/** Estado de la conexión del gateway (solo admin). */
export const getWhatsappConnection = async () => {
  const res = await axiosConfig.get<WhatsappConnection>("whatsapp/status");
  return res.data;
};

/** Inicia la vinculación (genera QR). */
export const linkWhatsapp = async () => {
  const res = await axiosConfig.post<WhatsappConnection>("whatsapp/link");
  return res.data;
};

/** Desvincula la cuenta y borra la sesión local. */
export const logoutWhatsapp = async () => {
  const res = await axiosConfig.post<WhatsappConnection>("whatsapp/logout");
  return res.data;
};

/** Envía el mensaje directo desde la API. Si `to` se omite, usa el número configurado. */
export const sendWhatsappMessage = async (message: string, to?: string) => {
  const res = await axiosConfig.post<{ ok: boolean; to: string }>("whatsapp/send", { message, to });
  return res.data;
};
