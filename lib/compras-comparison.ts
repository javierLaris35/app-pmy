import type { Comparison } from "./types/maintenance";
import { round2 } from "./maintenance-money";

export interface SelectionGroup {
  quoteId: string;
  supplierName: string;
  count: number;
  total: number;
}

/**
 * Órdenes que se generarían con lo elegido en el comparativo: una por proveedor, con sus renglones y total
 * (con impuestos). Espejo de `groupSelectionBySupplier` del backend.
 */
export function selectionSummary(c?: Comparison | null): { groups: SelectionGroup[]; total: number; skipped: number } {
  if (!c) return { groups: [], total: 0, skipped: 0 };
  const map = new Map<string, SelectionGroup>();
  let skipped = 0;
  for (const row of c.rows) {
    const entry = Object.entries(row.cells).find(([, cell]) => cell.quoteItemId === row.selectedQuoteItemId);
    if (!entry) { skipped += 1; continue; }
    const [quoteId, cell] = entry;
    const q = c.quotes.find((x) => x.id === quoteId);
    const g = map.get(quoteId) ?? { quoteId, supplierName: q?.supplierName ?? "Proveedor", count: 0, total: 0 };
    g.count += 1;
    g.total = round2(g.total + cell.total);
    map.set(quoteId, g);
  }
  const groups = [...map.values()];
  return { groups, total: round2(groups.reduce((a, g) => a + g.total, 0)), skipped };
}
