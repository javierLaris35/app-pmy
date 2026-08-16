import type { CompareResult } from "../services/tracking-sync";

export function summarizeCompare(rows: CompareResult[]) {
  return {
    total: rows.length,
    stale: rows.filter((r) => r.isStale).length,
    diverging: rows.filter((r) => r.diverges).length,
  };
}

export function rowFlag(r: CompareResult): "diverges" | "stale" | "ok" {
  if (r.diverges) return "diverges";
  if (r.isStale) return "stale";
  return "ok";
}
