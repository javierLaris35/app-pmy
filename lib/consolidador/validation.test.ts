import { describe, it, expect } from "vitest";
import { isValidCostEdit, isValidManualIncome, canFixStatus, parseTrackingList, MAX_BATCH_TRACKINGS } from "./validation";
import type { SearchPackageResult } from "@/lib/types/consolidador";

describe("isValidCostEdit", () => {
  it("acepta costo >= 0 con motivo suficiente", () => {
    expect(isValidCostEdit(4000, "bajar costo")).toBe(true);
    expect(isValidCostEdit(0, "sin costo")).toBe(true);
  });
  it("rechaza costo negativo o motivo corto/vacío", () => {
    expect(isValidCostEdit(-1, "motivo")).toBe(false);
    expect(isValidCostEdit(100, "  ")).toBe(false);
    expect(isValidCostEdit(100, "ab")).toBe(false);
  });
});

describe("isValidManualIncome", () => {
  const week = { from: "2026-09-07", to: "2026-09-13" };
  it("acepta un alta válida dentro de la semana", () => {
    expect(isValidManualIncome({ kind: "recoleccion", cost: 120, date: "2026-09-09", reason: "cobro" }, week)).toBe(true);
  });
  it("rechaza fecha fuera de la semana", () => {
    expect(isValidManualIncome({ kind: "pod", cost: 100, date: "2026-09-14", reason: "pod" }, week)).toBe(false);
    expect(isValidManualIncome({ kind: "pod", cost: 100, date: "2026-09-06", reason: "pod" }, week)).toBe(false);
  });
  it("rechaza sin tipo, costo negativo o motivo corto", () => {
    expect(isValidManualIncome({ kind: "", cost: 100, date: "2026-09-09", reason: "ok?" }, week)).toBe(false);
    expect(isValidManualIncome({ kind: "dex", cost: -5, date: "2026-09-09", reason: "dex" }, week)).toBe(false);
    expect(isValidManualIncome({ kind: "manual", cost: 10, date: "2026-09-09", reason: "x" }, week)).toBe(false);
  });
});

describe("canFixStatus", () => {
  const base: SearchPackageResult = {
    shipment: { id: "s1", trackingNumber: "T1", status: "en_ruta" },
    internalStatus: "en_ruta",
    fedex: { found: true, status: "entregado" },
    suggestion: { newStatus: "entregado", incomeEffect: { kind: "reclassify" } },
    income: null,
  };
  it("permite corregir cuando FedEx confirma y difiere", () => {
    expect(canFixStatus(base)).toBe(true);
  });
  it("bloquea si FedEx no encontró o dio error", () => {
    expect(canFixStatus({ ...base, fedex: { found: false, status: null, error: "timeout" } })).toBe(false);
  });
  it("bloquea si FedEx coincide con el interno", () => {
    expect(canFixStatus({ ...base, fedex: { found: true, status: "en_ruta" } })).toBe(false);
  });
  it("bloquea sin shipment", () => {
    expect(canFixStatus({ ...base, shipment: null })).toBe(false);
  });
});

describe("parseTrackingList", () => {
  it("separa por saltos de línea, comas y espacios y deduplica", () => {
    expect(parseTrackingList("T1\nT2, T3  T2")).toEqual(["T1", "T2", "T3"]);
  });
  it("recorta a MAX_BATCH_TRACKINGS", () => {
    const many = Array.from({ length: 40 }, (_, i) => `T${i}`).join("\n");
    expect(parseTrackingList(many)).toHaveLength(MAX_BATCH_TRACKINGS);
  });
  it("texto vacío → lista vacía", () => {
    expect(parseTrackingList("   \n  ")).toEqual([]);
  });
});
