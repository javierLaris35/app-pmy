import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { mapComparisonPdf, mapPurchaseOrderPdf, mapRfqPdf } from "@/lib/compras-pdf";
import { ComparisonDocument, PurchaseOrderDocument, RfqDocument } from "./compras-pdf-documents";

const company = { name: "Paquetería y Mensajería del Yaqui", taxId: "PMY123456ABC", address: "Calle 1, Cd. Obregón" };
const isPdf = (b: Buffer) => b.subarray(0, 5).toString() === "%PDF-" && b.length > 1500;

describe("PDF de Compras (se generan en el navegador)", () => {
  it("orden de compra", async () => {
    const po: any = {
      folio: "OC-000001", status: "autorizada", createdAt: "2026-09-24T18:00:00Z", authorizedAt: "2026-09-24T18:00:00Z",
      authorizedBy: { name: "Edgardo", lastName: "Lugo" }, subsidiary: { name: "Hermosillo" }, request: { folio: "SOL-000001", type: "mantenimiento" },
      supplier: { name: "AutoZone", rfc: "AAA010101AAA" }, contact: { name: "Ana", email: "a@az.com" },
      vehicle: { code: "PMY13", plateNumber: "UU-1", brand: "Nissan", model: "Urvan", kms: 90500 }, notes: "Entregar en taller",
      items: [{ description: "Balata delantera · Brembo", quantity: 1, unitPrice: 450, ivaEnabled: true, iepsEnabled: false, approved: true }],
    };
    expect(isPdf(await renderToBuffer(<PurchaseOrderDocument data={mapPurchaseOrderPdf(po)} company={company} />))).toBe(true);
  });

  it("solicitud de cotización", async () => {
    const r: any = { folio: "SOL-000002", type: "reparacion", description: "Rechina al frenar", subsidiary: { name: "HMO" }, vehicle: null, services: [], items: [] };
    const needs: any = [{ id: "n1", category: { name: "BALATA DELANTERA" }, quantity: 1, unit: null, product: null }];
    const data = mapRfqPdf(r, needs, { name: "Orealli" }, null, { name: "Gerardo Robles", email: "g@pmy.mx" }, "Urgente");
    expect(isPdf(await renderToBuffer(<RfqDocument data={data} company={company} />))).toBe(true);
  });

  it("comparativo", async () => {
    const c: any = {
      units: {},
      quotes: [{ id: "qA", supplierId: "sA", supplierName: "AutoZone", total: 522, covered: 1 }],
      rows: [{ requestItemId: "n1", description: "BALATA DELANTERA", quantity: 1, bestQuoteItemId: "a1", selectedQuoteItemId: "a1",
        cells: { qA: { quoteItemId: "a1", unitPrice: 450, quantity: 1, amount: 450, total: 522, availability: "si", leadTimeDays: null, quality: 4 } } }],
    };
    const data = mapComparisonPdf({ folio: "SOL-000003", type: "mantenimiento", subsidiary: { name: "HMO" }, description: "x" } as any, c, "Gerardo");
    expect(isPdf(await renderToBuffer(<ComparisonDocument data={data} company={company} />))).toBe(true);
  });
});
