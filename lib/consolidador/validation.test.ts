import { describe, it, expect } from "vitest";
import { isValidCostEdit, isValidManualIncome } from "./validation";

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
