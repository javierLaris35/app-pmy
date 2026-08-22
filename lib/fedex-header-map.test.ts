import { describe, it, expect } from "vitest";
import {
  buildMappedTable,
  mergePayments,
  mergeHighValue,
  parsePaymentsPaste,
  parseHvPaste,
  isBadDate,
  parsePaymentCell,
} from "./fedex-header-map";

describe("buildMappedTable (pegar FedEx)", () => {
  it("mapea columnas FedEx, ignora las irrelevantes y marca duplicados/faltantes", () => {
    const rows = [
      ["Tracking No", "Origin Loc ID", "Shpr Name", "Recip Name", "Recip Addr", "Recip City", "Recip Postal", "Commit Date", "COD"],
      ["875824020332", "MUGA", "COSTCO", "JAIME ARENAS", "ALLENDE 123", "HERMOSILLO", "83000", "8/20/2026", "COD 1500.50"],
      ["875824020332", "MUGA", "COSTCO", "OTRO", "CALLE 2", "HERMOSILLO", "83001", "8/20/2026", ""], // duplicada
      ["", "MUGA", "COSTCO", "SIN GUIA", "CALLE 3", "HERMOSILLO", "83002", "fecha-mala", ""], // sin guía + fecha mala
    ];
    const t = buildMappedTable(rows)!;
    expect(t.hasTracking).toBe(true);
    expect(t.fields.map((f) => f.field)).not.toContain("recipientName2");
    expect(t.counts.total).toBe(3);
    expect(t.counts.withTracking).toBe(2);
    expect(t.counts.missingTracking).toBe(1);
    expect(t.counts.duplicates).toBe(2); // ambas filas con la misma guía
    expect(t.counts.withPayment).toBe(1);
    expect(t.rows[0].hasPayment).toBe(true);
    expect(t.rows[0].paymentNoType).toBe(false);
    expect(t.rows[2].missingTracking).toBe(true);
    expect(t.rows[2].badDate).toBe(true);
  });

  it("null si no hay encabezados reconocibles", () => {
    expect(buildMappedTable([["875824020332", "CUAH"], ["875827166531", "CUAH"]])).toBeNull();
  });
});

describe("parsePaymentCell / isBadDate", () => {
  it("extrae type y monto", () => {
    expect(parsePaymentCell("COD 1,500.50")).toEqual({ type: "COD", amount: 1500.5 });
    expect(parsePaymentCell("1500")).toEqual({ type: null, amount: 1500 });
    expect(parsePaymentCell("")).toEqual({ type: null, amount: null });
  });
  it("detecta fechas malas pero acepta vacías y seriales", () => {
    expect(isBadDate("")).toBe(false);
    expect(isBadDate("8/20/2026")).toBe(false);
    expect(isBadDate("45900")).toBe(false);
    expect(isBadDate("fecha-mala")).toBe(true);
  });
});

describe("enriquecimiento de pagos", () => {
  it("marca filas existentes, flaggea pago sin type y agrega guías faltantes", () => {
    const base = buildMappedTable([
      ["Tracking No", "Recip Name"],
      ["111111111", "A"],
      ["222222222", "B"],
    ])!;
    const payments = parsePaymentsPaste("111111111\tCOD 500\n999999999\t1200"); // 2ª guía no está en la tabla, sin type
    const merged = mergePayments(base, payments);
    expect(merged.counts.withPayment).toBe(2);
    expect(merged.counts.total).toBe(3); // se agregó 999999999
    const added = merged.rows.find((r) => r.values.trackingNumber === "999999999")!;
    expect(added.manual).toBe(true);
    expect(added.paymentNoType).toBe(true); // 1200 sin COD/FTC/ROD
    expect(merged.fields.some((f) => f.field === "cod")).toBe(true);
  });

  it("parsePaymentsPaste con texto libre del correo", () => {
    const parsed = parsePaymentsPaste("Guia 383012036065 pago COD $1,250.00 recibido\nnada aqui");
    expect(parsed).toHaveLength(1);
    expect(parsed[0].tracking).toBe("383012036065");
    expect(parsed[0].type).toBe("COD");
    expect(parsed[0].amount).toBe(1250);
  });

  it("el monto no se contamina con la guía aunque el importe venga antes", () => {
    const parsed = parsePaymentsPaste("COD $980.50 guia 383011751254");
    expect(parsed[0].tracking).toBe("383011751254");
    expect(parsed[0].amount).toBe(980.5);
    expect(parsed[0].type).toBe("COD");
  });
});

describe("enriquecimiento de high value", () => {
  it("marca filas HV y agrega las que falten, con conteo", () => {
    const base = buildMappedTable([
      ["Tracking No", "Recip Name"],
      ["111111111", "A"],
      ["222222222", "B"],
    ])!;
    const hv = parseHvPaste("111111111\n555555555");
    const merged = mergeHighValue(base, hv);
    expect(merged.counts.highValue).toBe(2);
    expect(merged.rows.find((r) => r.values.trackingNumber === "111111111")!.isHighValue).toBe(true);
    expect(merged.rows.find((r) => r.values.trackingNumber === "555555555")!.manual).toBe(true);
  });
});
