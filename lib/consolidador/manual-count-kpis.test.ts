import { describe, it, expect } from "vitest";
import { countKpis, listsFromReport, sourceBadge } from "./manual-count-kpis";
import type { DiagnosisRow } from "@/lib/types/manual-count";

const r = (p: Partial<DiagnosisRow>): DiagnosisRow => ({ trackingNumber: "x", manual: null, charged: [], verdict: "CUADRA", cause: null, source: "shipment", where: "Paquete", ...p }) as DiagnosisRow;

describe("sourceBadge", () => {
  it("doble gana a la fuente", () => expect(sourceBadge(r({ source: "charge", cause: "DOBLE_PAQUETE_CARGA" }))?.label).toBe("Doble"));
  it("No VAN", () => expect(sourceBadge(r({ source: "novan" }))?.label).toBe("No VAN"));
  it("carga", () => expect(sourceBadge(r({ source: "charge" }))?.label).toBe("Carga"));
  it("no existe", () => expect(sourceBadge(r({ source: null }))?.label).toBe("No existe"));
  it("paquete normal → sin etiqueta", () => expect(sourceBadge(r({}))).toBeNull());
});

describe("countKpis", () => {
  it("separa cuadra, contó sin cobro, cobrado sin contar y error de conteo", () => {
    const k = countKpis([
      r({ verdict: "CUADRA", manual: "POD", charged: ["POD"] }),
      r({ verdict: "ERROR_SISTEMA", manual: "POD", charged: [], source: "novan", cause: "NOVAN_SIN_COBRO" }),
      r({ verdict: "ERROR_SISTEMA", manual: "POD", charged: [] }),
      r({ verdict: "ERROR_SISTEMA", manual: null, charged: ["POD"], cause: "DOBLE_PAQUETE_CARGA" }),
      r({ verdict: "ERROR_CONTEO", manual: "POD", charged: ["POD"] }),
    ]);
    expect(k).toEqual({ matched: 1, countedNotCharged: 2, countedNotChargedNoVan: 1, chargedNotCounted: 1, chargedNotCountedDoubles: 1, countErrors: 1 });
  });
});

describe("listsFromReport", () => {
  it("rearma lo que se contó en esa sucursal (marcas y recolecciones contadas)", () => {
    const rep = {
      rows: [r({ trackingNumber: "1", manual: "POD" }), r({ trackingNumber: "2", manual: "08" }), r({ trackingNumber: "3", manual: null }), r({ trackingNumber: "1", manual: "POD" })],
      collections: { rows: [{ trackingNumber: "R1", counted: true }, { trackingNumber: "R2", counted: false }] },
    } as any;
    expect(listsFromReport(rep, { charges: true, collections: true, novan: false })).toEqual({
      pod: ["1"], dex07: [], dex08: ["2"], recolecciones: ["R1"], sources: { charges: true, collections: true, novan: false },
    });
  });
});
