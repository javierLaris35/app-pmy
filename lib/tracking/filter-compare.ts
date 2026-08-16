import type { CompareResult } from "../services/tracking-sync";

export interface CompareFilter {
  /** all = todas; diverges = solo divergentes; stale = solo desactualizadas vs FedEx. */
  flag: "all" | "diverges" | "stale";
  /** Búsqueda por número de guía (substring, case-insensitive). */
  query: string;
}

/** Filtra las filas de comparación por bandera + búsqueda de guía. Puro. */
export function filterCompareRows(rows: CompareResult[], filter: CompareFilter): CompareResult[] {
  const q = (filter.query || "").trim().toLowerCase();
  return rows.filter((r) => {
    if (filter.flag === "diverges" && !r.diverges) return false;
    if (filter.flag === "stale" && !r.isStale) return false;
    if (q && !r.trackingNumber.toLowerCase().includes(q)) return false;
    return true;
  });
}
