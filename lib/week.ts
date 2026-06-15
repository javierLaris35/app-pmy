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

/** Lunes–Domingo de la semana que contiene `refDate`. */
export function getWeekRange(refDate: Date = new Date()): WeekRange {
  const d = new Date(refDate);
  const day = d.getDay(); // 0=Dom .. 6=Sab
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
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
