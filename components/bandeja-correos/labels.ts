import { AttachmentKind, ConsolidationKind, InboxView, PasteBatchKind, UploadState } from "@/lib/types/inbox";

export const VIEW_LABEL: Record<InboxView, string> = {
  falta_confirmar: "Falta confirmar",
  listos: "Listos para subir",
  subidos: "Subidos",
  todos: "Todos",
  ignorado: "Ignorados",
};

/** Estado de un correo en la lista, en palabras de la operación. */
export const UPLOAD_STATE: Record<UploadState, { label: string; cls: string }> = {
  falta_confirmar: { label: "Falta confirmar", cls: "border-amber-200 bg-amber-50 text-amber-800" },
  listo: { label: "Listo para subir", cls: "border-sky-200 bg-sky-50 text-sky-700" },
  subido: { label: "Subido", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  sin_guias: { label: "Sin guías", cls: "border-slate-200 bg-slate-50 text-slate-500" },
  ignorado: { label: "Ignorado", cls: "border-slate-200 bg-slate-50 text-slate-500" },
  error: { label: "No se pudo leer", cls: "border-red-200 bg-red-50 text-red-700" },
};

/** Nombre de cada bloque de guías que se sube. */
export const BATCH_LABEL: Record<PasteBatchKind, string> = {
  master: "Carga master",
  aereo: "Salida aérea",
  f2: "F2 / carga",
};

/** Cómo supimos la sucursal, en una frase: "Lo sabemos por …". */
const SIGNAL_PHRASE: Record<string, string> = {
  consolidado_conocido: "el consolidado ya está registrado en esa sucursal",
  cp_archivo: "los códigos postales de las guías",
  ciudad_archivo: "las ciudades de las guías",
  asunto_o_archivo: "el asunto o el nombre del archivo",
  cuerpo: "el texto del correo",
  remitente: "quién lo manda",
  copia: "las personas en copia",
  estacion: "el código de estación",
};

export function knownByPhrase(signals: { type: string; subsidiaryId: string; weight: number }[], subsidiaryId: string | null): string | null {
  const phrases = [...new Set(
    signals
      .filter((s) => s.subsidiaryId === subsidiaryId)
      .sort((a, b) => b.weight - a.weight)
      .map((s) => SIGNAL_PHRASE[s.type])
      .filter(Boolean),
  )];
  if (!phrases.length) return null;
  if (phrases.length === 1) return phrases[0];
  return `${phrases.slice(0, -1).join(", ")} y ${phrases[phrases.length - 1]}`;
}


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
