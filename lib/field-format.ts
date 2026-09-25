import { format } from "date-fns";
import { es } from "date-fns/locale";

/** Formatos de los campos del sistema de formularios (dinero y fecha larga). */

const moneyFmt = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "1,234.50" (sin símbolo: el `$` lo pone el campo). "" si no hay valor. */
export const formatMoneyInput = (n: number | ""): string => (n === "" || Number.isNaN(Number(n)) ? "" : moneyFmt.format(Number(n)));

/** Lee lo que escribió el usuario ("$1,234.5") → 1234.5 redondeado a centavos; "" si está vacío o no es número. */
export function parseMoneyInput(s: string): number | "" {
  const clean = (s ?? "").replace(/[$,\s]/g, "");
  if (!clean) return "";
  const n = Number(clean);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : "";
}

/** "2026-09-24" → "24 de septiembre de 2026" (fecha de calendario, sin zona horaria). */
export function formatLongDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return "";
  return format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])), "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** Date local → "YYYY-MM-DD". */
export const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "YYYY-MM-DD" → Date local (sin corrimiento); undefined si no es válida. */
export function fromIsoDate(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
}
