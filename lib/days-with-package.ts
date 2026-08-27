/**
 * "Días con el paquete": días CALENDARIO transcurridos desde la creación del shipment
 * (`createdAt`) hasta `now`. Se usa como columna en los reportes de inventario (vista + Excel).
 * Devuelve `null` si no hay fecha válida; nunca negativos (fecha futura → 0).
 */
export function daysWithPackage(
  createdAt?: string | Date | null,
  now: Date = new Date(),
): number | null {
  if (!createdAt) return null;
  const c = new Date(createdAt);
  if (isNaN(c.getTime())) return null;
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((dayStart(now) - dayStart(c)) / 86_400_000);
  return Math.max(0, diffDays);
}

/** Etiqueta para celda/Excel: el número, o "—" cuando no hay fecha. */
export function daysWithPackageLabel(createdAt?: string | Date | null, now: Date = new Date()): string {
  const d = daysWithPackage(createdAt, now);
  return d == null ? "—" : String(d);
}
