export interface WeekRange {
  /** YYYY-MM-DD (lunes) */
  from: string;
  /** YYYY-MM-DD (domingo) */
  to: string;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Lunes–Domingo de la semana que contiene `refDate` (semana de 7 días).
 * El domingo es el último día de la semana, por lo que en domingo se devuelve
 * la semana en curso (ese domingo cierra su propia semana).
 */
export function getWeekRange(refDate: Date = new Date()): WeekRange {
  const d = new Date(refDate);
  const day = d.getDay(); // 0=Dom .. 6=Sab
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6); // lunes + 6 = domingo (semana lun–dom)
  return { from: toISODate(monday), to: toISODate(sunday) };
}

/** Mueve el rango `weeks` semanas (negativo = atrás). */
export function shiftWeek(range: WeekRange, weeks: number): WeekRange {
  const base = new Date(`${range.from}T00:00:00`);
  base.setDate(base.getDate() + weeks * 7);
  return getWeekRange(base);
}

export function isCurrentWeek(range: WeekRange): boolean {
  const current = getWeekRange();
  return range.from === current.from && range.to === current.to;
}

export function formatWeekLabel(range: WeekRange): string {
  const from = new Date(`${range.from}T00:00:00`);
  const to = new Date(`${range.to}T00:00:00`);
  const fmt = (d: Date) => d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
  return `${fmt(from)} – ${fmt(to)}`;
}

/** Atajos de rango de fechas usados en reportes / ingresos. */
export type DatePreset = "today" | "yesterday" | "week" | "month";

export const DATE_PRESETS: ReadonlyArray<readonly [DatePreset, string]> = [
  ["today", "Hoy"],
  ["yesterday", "Ayer"],
  ["week", "Semana"],
  ["month", "Mes"],
];

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/**
 * Rango (fechas LOCALES YYYY-MM-DD) de un atajo. "Semana" es la semana calendario
 * LUNES–DOMINGO que contiene `refDate` (igual que el selector de semana), no los
 * últimos 7 días corridos. "Mes" se mantiene como los últimos 30 días.
 */
export function getPresetRange(preset: DatePreset, refDate: Date = new Date()): WeekRange {
  if (preset === "today") return { from: toISODate(refDate), to: toISODate(refDate) };
  if (preset === "yesterday") {
    const y = toISODate(addDays(refDate, -1));
    return { from: y, to: y };
  }
  if (preset === "week") return getWeekRange(refDate);
  return { from: toISODate(addDays(refDate, -29)), to: toISODate(refDate) };
}
