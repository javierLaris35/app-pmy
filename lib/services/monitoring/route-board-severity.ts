import type { RouteBoardItem } from "@/lib/services/monitoring/route-monitor";

/** Severidad de una ruta en el tablero — misma clasificación usada por cuadros, tabla y gráficos. */
export type Severity = "crit" | "warn" | "normal" | "done";

export function severityOf(item: RouteBoardItem): Severity {
  if (item.status === "Completada" || item.routeClosedAt) return "done";
  if (item.criticalAlerts > 0) return "crit";
  if (item.warningAlerts > 0) return "warn";
  return "normal";
}

export function pillLabel(item: RouteBoardItem, sev: Severity): string {
  if (sev === "done") return "CERRADA";
  if (sev === "crit") return "CRÍTICA";
  if (sev === "warn") return "ATENCIÓN";
  if (item.status === "Pendiente") return "PENDIENTE";
  return "EN CURSO";
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  crit: "Crítica", warn: "Atención", normal: "En curso", done: "Cerrada",
};

/** Hex planos — para recharts (no acepta clases Tailwind) y para los generadores de Excel/PDF. */
export const SEVERITY_HEX: Record<Severity, string> = {
  crit: "#e11d48", warn: "#d97706", normal: "#6366f1", done: "#059669",
};

export const STRIPE_BG: Record<Severity, string> = { crit: "bg-rose-100", warn: "bg-amber-100", normal: "bg-indigo-50", done: "bg-emerald-100" };
export const STRIPE_TEXT: Record<Severity, string> = { crit: "text-rose-800", warn: "text-amber-800", normal: "text-indigo-800", done: "text-emerald-800" };
export const PILL_CLASS: Record<Severity, string> = { crit: "bg-rose-600 text-rose-50", warn: "bg-amber-600 text-amber-50", normal: "bg-indigo-600 text-indigo-50", done: "bg-emerald-600 text-emerald-50" };
export const BORDER_LEFT_CLASS: Record<Severity, string> = { crit: "border-l-rose-600", warn: "border-l-amber-600", normal: "border-l-indigo-500", done: "border-l-emerald-600" };
export const CARD_TINT_CLASS: Record<Severity, string> = {
  crit: "bg-gradient-to-b from-rose-50/70 to-white",
  warn: "bg-gradient-to-b from-amber-50/70 to-white",
  normal: "bg-white",
  done: "bg-gradient-to-b from-emerald-50/70 to-white",
};
export const PROGRESS_FILL_CLASS: Record<Severity, string> = {
  crit: "bg-gradient-to-r from-rose-400 to-rose-600",
  warn: "bg-gradient-to-r from-amber-400 to-amber-600",
  normal: "bg-gradient-to-r from-indigo-400 to-indigo-600",
  done: "bg-gradient-to-r from-emerald-400 to-emerald-600",
};
export const SEMAPHORE_DOT_CLASS: Record<Severity, string> = {
  crit: "bg-rose-600", warn: "bg-amber-600", normal: "bg-indigo-500", done: "bg-emerald-600",
};

export const KPI_CARD_BG: Record<string, string> = {
  total: "bg-gradient-to-br from-indigo-50/60 via-white to-white",
  crit: "bg-gradient-to-br from-rose-50 via-white to-white",
  warn: "bg-gradient-to-br from-amber-50 via-white to-white",
  done: "bg-gradient-to-br from-emerald-50 via-white to-white",
  cash: "bg-gradient-to-br from-teal-50 via-white to-white",
};
export const KPI_ICON_BG: Record<string, string> = {
  total: "bg-indigo-100 text-indigo-700",
  crit: "bg-rose-100 text-rose-700",
  warn: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
  cash: "bg-teal-100 text-teal-700",
};
export const KPI_NUM_CLASS: Record<string, string> = {
  total: "text-foreground",
  crit: "text-rose-700",
  warn: "text-amber-700",
  done: "text-emerald-700",
  cash: "text-teal-700",
};
