import type { PackageInfo } from "@/lib/types";
import { isDueOn, type AlertDay } from "@/lib/next-operating-day";
import { noDueMark } from "@/lib/inventory-excel-rules";

/**
 * Conteos de la captura de inventario que TAMBIÉN filtran la lista (rediseño "lector a la
 * izquierda"): tocar "Vencen hoy" deja solo esas guías. Uno a la vez; tocar de nuevo lo quita.
 */
/** `nextDay` = vence el siguiente día que se opera (cuando mañana no se opera). */
export type QuickFilterKey = "today" | "tomorrow" | "nextDay" | "payment" | "f2" | "highValue";

/** Días entre hoy y el vencimiento (fechas locales). null sin fecha. */
const daysUntil = (commit?: string | null, now: Date = new Date()): number | null => {
  if (!commit) return null;
  const d = new Date(commit);
  if (Number.isNaN(d.getTime())) return null;
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((a - b) / 86_400_000);
};

export function matchesQuickFilter(
  pkg: PackageInfo,
  key: QuickFilterKey | null,
  now: Date = new Date(),
  alert: AlertDay | null = null,
): boolean {
  if (!key) return true;
  // Ya entregado o devuelto a FedEx: no cuenta como "vence hoy/mañana/siguiente día".
  const days = noDueMark(pkg.status) ? null : daysUntil(pkg.commitDateTime, now);
  switch (key) {
    case "today":
      return days === 0;
    case "tomorrow":
      return days === 1;
    case "nextDay":
      return days !== null && days !== 0 && days !== 1 && isDueOn(pkg.commitDateTime, alert);
    case "payment":
      return !!pkg.payment;
    case "f2":
      return !!pkg.isCharge;
    case "highValue":
      return !!pkg.isHighValue;
  }
}

export type QuickFilterCounts = Record<QuickFilterKey, number>;

/** Conteos sobre las guías válidas (las que entran al inventario). */
export function countQuickFilters(
  validPackages: PackageInfo[],
  now: Date = new Date(),
  alert: AlertDay | null = null,
): QuickFilterCounts {
  const keys: QuickFilterKey[] = ["today", "tomorrow", "nextDay", "payment", "f2", "highValue"];
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as QuickFilterCounts;
  for (const p of validPackages) for (const k of keys) if (matchesQuickFilter(p, k, now, alert)) out[k]++;
  return out;
}

/**
 * Busca, en lo ya validado, el paquete de un código escaneado (por guía o ID de pieza DHL,
 * aceptando la variante JJD/JD). Para la tarjeta "Última lectura".
 */
export function findScannedPackage(code: string | null | undefined, packages: PackageInfo[]): PackageInfo | null {
  const k = (code ?? "").trim().toUpperCase();
  if (!k) return null;
  const variants = new Set([k]);
  if (k.startsWith("JJD")) variants.add(k.slice(1));
  else if (k.startsWith("JD")) variants.add("J" + k);
  for (let i = packages.length - 1; i >= 0; i--) {
    const p = packages[i];
    const ids = [p.trackingNumber, p.dhlUniqueId].filter(Boolean).map((c) => (c as string).trim().toUpperCase());
    if (ids.some((id) => variants.has(id))) return p;
  }
  return null;
}
