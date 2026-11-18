import type { Holiday } from "@/lib/types";

/**
 * Aviso de "días sin operación" (captura de Inventario).
 *
 * Si MAÑANA no se opera (domingo o día festivo de Configuración → Días festivos), hay que tener a la
 * vista hoy lo que vence el SIGUIENTE DÍA QUE SÍ SE OPERA: un sábado normal avisa del lunes; si el
 * lunes es festivo, del martes; si el jueves es festivo, el miércoles avisa del viernes.
 *
 * Fechas en hora local del navegador, igual que "Hoy"/"Mañana" (`daysUntilCommit`).
 */
export interface AlertDay {
  /** Día calendario local que se vigila. */
  date: Date;
  /** Nombre del día en minúsculas ("lunes"). */
  weekday: string;
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const dayOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** ¿Ese día es festivo? (`recurring` = cada año, compara mes-día). */
export function isHoliday(day: Date, holidays: Pick<Holiday, "date" | "recurring">[] = []): boolean {
  const full = ymd(day);
  const md = full.slice(5);
  return holidays.some((h) => (h.recurring ? String(h.date).slice(5, 10) === md : String(h.date).slice(0, 10) === full));
}

/** ¿Se opera ese día? (no domingo y no festivo). */
export function isOperatingDay(day: Date, holidays: Pick<Holiday, "date" | "recurring">[] = []): boolean {
  return day.getDay() !== 0 && !isHoliday(day, holidays);
}

/**
 * Día a vigilar hoy, o null si mañana se opera (entonces bastan "Hoy" y "Mañana").
 */
export function nextAlertDay(now: Date = new Date(), holidays: Pick<Holiday, "date" | "recurring">[] = []): AlertDay | null {
  const today = dayOnly(now);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (isOperatingDay(tomorrow, holidays)) return null;
  for (let i = 2; i <= 10; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    if (isOperatingDay(d, holidays)) return { date: d, weekday: WEEKDAYS[d.getDay()] };
  }
  return null;
}

/** ¿La guía vence justo el día que se vigila? */
export function isDueOn(commitDateTime: string | Date | null | undefined, alert: AlertDay | null): boolean {
  if (!commitDateTime || !alert) return false;
  const d = new Date(commitDateTime);
  if (Number.isNaN(d.getTime())) return false;
  return ymd(d) === ymd(alert.date);
}

/** "Lunes", "Martes"… para etiquetas. */
export const capitalizeDay = (weekday: string) => weekday.charAt(0).toUpperCase() + weekday.slice(1);
