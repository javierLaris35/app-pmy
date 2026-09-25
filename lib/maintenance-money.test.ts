import { describe, expect, it } from "vitest";
import { lineTaxes, totals } from "./maintenance-money";

// Mismos casos que pmy-api src/maintenance/utils/money.util.spec.ts (espejo).
describe("maintenance-money (espejo del backend)", () => {
  it("IEPS sobre el importe e IVA sobre importe + IEPS", () => {
    expect(lineTaxes({ quantity: 1, unitPrice: 100, ivaEnabled: true, iepsEnabled: true, iepsRate: 0.08 })).toEqual({ amount: 100, ieps: 8, iva: 17.28, total: 125.28 });
  });
  it("sin IVA y compat con taxRate", () => {
    expect(lineTaxes({ quantity: 2, unitPrice: 50, ivaEnabled: false }).total).toBe(100);
    expect(lineTaxes({ quantity: 1, unitPrice: 100, taxRate: 0.16 }).iva).toBe(16);
    expect(lineTaxes({ quantity: 1, unitPrice: 100, taxRate: 0 }).iva).toBe(0);
  });
  it("totales solo de aprobadas", () => {
    const t = totals([
      { quantity: 1, unitPrice: 100, ivaEnabled: true },
      { quantity: 1, unitPrice: 100, ivaEnabled: true, iepsEnabled: true, iepsRate: 0.08, approved: false },
    ], true);
    expect(t).toEqual({ subtotal: 100, ieps: 0, tax: 16, total: 116 });
  });
});
