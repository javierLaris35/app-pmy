import { getLabelShipmentStatus } from "@/lib/utils";
import { GuideBucket, Insight } from "@/lib/types/inbox-lookup";

export const BUCKET: Record<GuideBucket, { label: string; cls: string }> = {
  entregado: { label: "Entregada", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  dex: { label: "DEX", cls: "border-orange-200 bg-orange-50 text-orange-700" },
  devuelto: { label: "Devuelta", cls: "border-rose-200 bg-rose-50 text-rose-700" },
  en_ruta: { label: "En ruta", cls: "border-sky-200 bg-sky-50 text-sky-700" },
  en_bodega: { label: "En bodega", cls: "border-violet-200 bg-violet-50 text-violet-700" },
  pendiente: { label: "Pendiente", cls: "border-amber-200 bg-amber-50 text-amber-800" },
  otro: { label: "Otro", cls: "border-slate-200 bg-slate-50 text-slate-600" },
};

/** "cliente_no_disponible" → "Cliente No Disponible" (o el texto tal cual si no está en el catálogo). */
export const statusText = (s: string | null | undefined) =>
  !s ? "—" : getLabelShipmentStatus(s) ?? s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export const money = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

/** Día de negocio guardado como fecha (YYYY-MM-DD) → "18 oct 2026", sin correrlo de zona. */
export function dayText(day: string | null | undefined): string {
  if (!day) return "—";
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-MX", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
}

export const TYPE_LABEL = { paquete: "Paquetes", carga: "Carga (F2)" } as const;

export const INSIGHT_TONE: Record<Insight["severity"], string> = {
  alta: "border-red-200 bg-red-50 text-red-800",
  media: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};
