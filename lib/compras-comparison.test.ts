import { describe, expect, it } from "vitest";
import { selectionSummary } from "./compras-comparison";

const cell = (id: string, total: number) => ({ quoteItemId: id, unitPrice: 1, quantity: 1, amount: total, total, availability: "si", leadTimeDays: null, quality: null });

describe("selectionSummary", () => {
  it("agrupa lo elegido por proveedor y cuenta renglones sin comprar", () => {
    const s = selectionSummary({
      units: {},
      quotes: [
        { id: "qA", supplierId: "sA", supplierName: "AutoZone", total: 0, covered: 2 },
        { id: "qB", supplierId: "sB", supplierName: "Orealli", total: 0, covered: 2 },
      ],
      rows: [
        { requestItemId: "r1", description: "A", quantity: 1, cells: { qA: cell("a1", 100), qB: cell("b1", 120) }, bestQuoteItemId: "a1", selectedQuoteItemId: "a1" },
        { requestItemId: "r2", description: "B", quantity: 1, cells: { qA: cell("a2", 50), qB: cell("b2", 40.5) }, bestQuoteItemId: "b2", selectedQuoteItemId: "b2" },
        { requestItemId: "r3", description: "C", quantity: 1, cells: { qA: cell("a3", 10) }, bestQuoteItemId: "a3", selectedQuoteItemId: null },
      ],
    });
    expect(s.groups).toEqual([
      { quoteId: "qA", supplierName: "AutoZone", count: 1, total: 100 },
      { quoteId: "qB", supplierName: "Orealli", count: 1, total: 40.5 },
    ]);
    expect(s.total).toBe(140.5);
    expect(s.skipped).toBe(1);
  });
});
