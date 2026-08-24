// Espejo de `src/common/expense-proration.util.ts` del backend (pmy-api).
// Regla única: la porción de un gasto que corresponde a un rango de días.
// Debe mantenerse en sync con la util del backend.

export interface ProratableExpense {
  amount: number | string;
  date: string | Date; // 'YYYY-MM-DD' (o Date; se recorta a día)
  periodStart?: string | null; // 'YYYY-MM-DD' or null
  periodEnd?: string | null; // 'YYYY-MM-DD' or null
}

const MS_PER_DAY = 86_400_000;

function toDay(value: string | Date): string {
  if (value instanceof Date) {
    // Día calendario local (evita corrimiento por zona horaria).
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

function toUtcMs(day: string): number {
  return Date.parse(`${day.slice(0, 10)}T00:00:00.000Z`);
}

/** Conteo inclusivo de días de startDay a endDay. <= 0 si endDay < startDay. */
export function dayCountInclusive(startDay: string, endDay: string): number {
  return Math.round((toUtcMs(endDay) - toUtcMs(startDay)) / MS_PER_DAY) + 1;
}

function hasPeriod(
  exp: ProratableExpense,
): exp is ProratableExpense & { periodStart: string; periodEnd: string } {
  return !!exp.periodStart && !!exp.periodEnd;
}

/**
 * Etiqueta legible del día/rango que el usuario consultó (columna "Día consultado" del
 * reporte). Un solo día -> 'dd/mm/yyyy'; rango -> 'dd/mm/yyyy – dd/mm/yyyy'. Vacío si falta
 * algún extremo. Aclara por qué un gasto recurrente creado fuera del rango aparece.
 */
export function consultedRangeLabel(startDay?: string | null, endDay?: string | null): string {
  if (!startDay || !endDay) return "";
  const fmt = (k: string) => k.slice(0, 10).split("-").reverse().join("/");
  const a = fmt(startDay);
  const b = fmt(endDay);
  return a === b ? a : `${a} – ${b}`;
}

/** Monto que este gasto aporta a [rangeStart, rangeEnd] (día calendario, inclusivo). */
export function proratedAmountInRange(
  exp: ProratableExpense,
  rangeStart: string,
  rangeEnd: string,
): number {
  const amount = Number(exp.amount || 0);
  if (!hasPeriod(exp)) {
    const d = toDay(exp.date);
    return d >= rangeStart && d <= rangeEnd ? amount : 0;
  }
  const periodDays = dayCountInclusive(exp.periodStart, exp.periodEnd);
  if (periodDays <= 0) return 0;
  const ovStart = exp.periodStart > rangeStart ? exp.periodStart : rangeStart;
  const ovEnd = exp.periodEnd < rangeEnd ? exp.periodEnd : rangeEnd;
  const overlap = dayCountInclusive(ovStart, ovEnd);
  if (overlap <= 0) return 0;
  return (amount * overlap) / periodDays;
}
