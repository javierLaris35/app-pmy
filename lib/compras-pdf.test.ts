import { describe, expect, it } from "vitest";
import { mapComparisonPdf, mapPurchaseOrderPdf, mapRfqPdf, taxLabel } from "./compras-pdf";

describe("mapPurchaseOrderPdf", () => {
  const po: any = {
    folio: "OC-000123", status: "autorizada", notes: " Entregar en taller ", createdAt: "2026-09-20T18:00:00Z",
    authorizedAt: "2026-09-21T18:00:00Z", authorizedBy: { name: "Edgardo", lastName: "Lugo" },
    subsidiary: { name: "Hermosillo" }, request: { folio: "SOL-000010", type: "compra" },
    supplier: { name: "Taller X", rfc: "TXX010101AAA", address: "Calle 1" },
    contact: { name: "Juan", email: "j@x.com", phone: "6621234567" }, vehicle: null,
    items: [
      { description: "Aceite", quantity: 1, unitPrice: 100, ivaEnabled: true, iepsEnabled: true, iepsRate: 0.08, approved: true },
      { description: "Discos", quantity: 2, unitPrice: 500, ivaEnabled: true, approved: false },
      { description: "Flete", quantity: 1, unitPrice: 50, ivaEnabled: false, approved: true },
    ],
  };
  it("solo aprobadas, impuestos por partida, IEPS y total con letra", () => {
    const d = mapPurchaseOrderPdf(po);
    expect(d.rows.map((r) => [r.description, r.taxLabel])).toEqual([["Aceite", "IVA + IEPS 8%"], ["Flete", "Sin impuestos"]]);
    expect(d.hasIeps).toBe(true);
    expect(d.total).toContain("175.28");
    expect(d.totalInWords).toBe("CIENTO SETENTA Y CINCO PESOS 28/100 M.N.");
    expect(d.isDraft).toBe(false);
    expect(d.requestType).toBe("Compra de equipo/material");
    expect(d.vehicle.label).toBe("");
    expect(d.notes).toBe("Entregar en taller");
  });
  it("borrador marcado", () => expect(mapPurchaseOrderPdf({ ...po, status: "pendiente" }).isDraft).toBe(true));
});

describe("mapRfqPdf", () => {
  it("renglones de la solicitud + lo que se necesita, sin precios", () => {
    const r: any = {
      folio: "SOL-000007", type: "mantenimiento", description: "Rechina", subsidiary: { name: "HMO" },
      vehicle: { code: "PMY13", plateNumber: "UU-1" }, services: [{ id: "t1", name: "Revisión de frenos" }],
      items: [{ description: "Tapete", quantity: 2, unit: { name: "Pieza", abbreviation: "pza" }, product: null, notes: "negro" }],
    };
    const needs: any = [{ id: "n1", category: { name: "BALATA DELANTERA" }, quantity: 1, unit: null, product: { name: "Brembo P-83", brand: "Brembo" } }];
    const d = mapRfqPdf(r, needs, { name: "AutoZone" }, null, { name: "Gerardo Robles", email: "g@pmy.mx" });
    expect(d.rows.map((x) => [x.index, x.description, x.detail])).toEqual([[1, "Tapete", "negro"], [2, "BALATA DELANTERA", "Preferido: Brembo P-83 · Brembo"]]);
    expect(d.services).toEqual(["Revisión de frenos"]);
    expect(d.vehicle.label).toBe("PMY13");
    expect(d.supplierName).toBe("AutoZone");
  });
});

describe("mapComparisonPdf", () => {
  it("celdas, mejor precio, elegido y resumen de órdenes", () => {
    const cell = (id: string, unitPrice: number, total: number, availability = "si") => ({ quoteItemId: id, unitPrice, quantity: 1, amount: total, total, availability, leadTimeDays: availability === "sobre_pedido" ? 2 : null, quality: 4 });
    const c: any = {
      units: {},
      quotes: [{ id: "qA", supplierId: "sA", supplierName: "AutoZone", total: 348, covered: 1 }, { id: "qB", supplierId: "sB", supplierName: "Orealli", total: 406, covered: 1 }],
      rows: [{ requestItemId: "r1", description: "Aceite", quantity: 5, bestQuoteItemId: "a1", selectedQuoteItemId: "a1", cells: { qA: cell("a1", 60, 348), qB: cell("b1", 70, 406, "sobre_pedido") } }],
    };
    const d = mapComparisonPdf({ folio: "SOL-1", type: "compra", subsidiary: { name: "HMO" }, description: "x" } as any, c, "Gerardo");
    expect(d.rows[0].cells[0]).toMatchObject({ best: true, selected: true, quality: "4/5" });
    expect(d.rows[0].cells[1]).toMatchObject({ availability: "Sobre pedido (2 d)", selected: false });
    expect(d.selection).toEqual([{ name: "AutoZone", count: 1, total: expect.stringContaining("348.00") }]);
  });
});

describe("taxLabel", () => {
  it("compat con taxRate", () => expect(taxLabel({ quantity: 1, unitPrice: 1, taxRate: 0.16 })).toBe("IVA"));
});
