import { AttachmentKind, ConsolidationKind, InboxStatus, InboxView } from "@/lib/types/inbox";

export const VIEW_LABEL: Record<InboxView, string> = {
  revision: "Por revisar",
  detectado: "Detectados",
  confirmado: "Confirmados",
  ignorado: "Ignorados",
  error: "Con error",
  todos: "Todos",
};

export const STATUS_LABEL: Record<InboxStatus, string> = {
  nuevo: "Nuevo",
  detectado: "Detectado",
  revision: "Por revisar",
  confirmado: "Confirmado",
  ignorado: "Ignorado",
  error: "Con error",
};

export const ATTACHMENT_LABEL: Record<AttachmentKind, string> = {
  master: "Master",
  master_aereo: "Aéreo",
  f2: "F2",
  high_value: "Valor",
  ccp: "Carta porte",
  ccp_ignored: "Carta porte (no se usa)",
  dhl: "DHL",
  pdf: "PDF",
  other: "Otro",
};

export const ATTACHMENT_SHORT: Record<AttachmentKind, string> = {
  master: "Master",
  master_aereo: "Aéreo",
  f2: "F2",
  high_value: "Valor",
  ccp: "CCP",
  ccp_ignored: "CCP",
  dhl: "DHL",
  pdf: "PDF",
  other: "Otro",
};

export const CONS_KIND_LABEL: Record<ConsolidationKind, string> = {
  master: "Master",
  f2: "F2",
  aereo: "Aéreo",
  high_value: "Valor",
  dhl: "DHL",
};

export const SIGNAL_LABEL: Record<string, string> = {
  consolidado_conocido: "Consolidado registrado",
  cp_archivo: "Códigos postales",
  ciudad_archivo: "Ciudades del archivo",
  asunto_o_archivo: "Asunto / archivo",
  cuerpo: "Texto del correo",
  remitente: "Remitente",
  copia: "Copias",
  estacion: "Código de estación",
};

/** Clases de pastilla según qué tan segura es la detección. */
export function certaintyPill(status: InboxStatus, autoSafe: boolean): string {
  if (status === "confirmado") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "detectado" || autoSafe) return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "revision") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "error") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

/** Color por minutos de espera de un consolidado pendiente (ámbar ≥10, rojo ≥30). */
export function delayTone(minutes: number | null, pending: boolean): string {
  if (!pending || minutes == null) return "text-slate-600";
  if (minutes >= 30) return "text-red-600 font-semibold";
  if (minutes >= 10) return "text-amber-600 font-semibold";
  return "text-slate-600";
}

export function formatMinutes(m: number | null): string {
  if (m == null) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h < 24) return r ? `${h} h ${r} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d ${h % 24} h`;
}

const HMO = "America/Hermosillo";
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", { timeZone: HMO, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Fecha de hoy (Hermosillo) en YYYY-MM-DD, con desplazamiento de días. */
export function hmoDay(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toLocaleDateString("en-CA", { timeZone: HMO });
}
