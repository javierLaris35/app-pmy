import { describe, it, expect } from "vitest";
import { getWeekRange, shiftWeek, isCurrentWeek, formatWeekLabel } from "./week";

/**
 * La semana del selector es LUNES–DOMINGO (7 días). El domingo es el último día
 * de la semana y debe quedar incluido en el rango (antes se cortaba en sábado).
 */
describe("getWeekRange (lun–dom)", () => {
  it("lunes → de ese lunes al domingo siguiente", () => {
    // 2026-08-31 es lunes; el domingo de su semana es 2026-09-06.
    const r = getWeekRange(new Date("2026-08-31T12:00:00"));
    expect(r).toEqual({ from: "2026-08-31", to: "2026-09-06" });
  });

  it("miércoles → misma semana lun–dom", () => {
    const r = getWeekRange(new Date("2026-09-02T09:00:00"));
    expect(r).toEqual({ from: "2026-08-31", to: "2026-09-06" });
  });

  it("domingo → sigue perteneciendo a su propia semana (último día)", () => {
    // 2026-09-06 es domingo: pertenece a la semana que arranca el 2026-08-31.
    const r = getWeekRange(new Date("2026-09-06T20:00:00"));
    expect(r).toEqual({ from: "2026-08-31", to: "2026-09-06" });
  });

  it("semana anterior también incluye su domingo", () => {
    const r = getWeekRange(new Date("2026-08-24T10:00:00"));
    expect(r).toEqual({ from: "2026-08-24", to: "2026-08-30" });
  });
});

describe("shiftWeek", () => {
  it("retrocede una semana completa (lun–dom)", () => {
    const current = getWeekRange(new Date("2026-08-31T12:00:00"));
    expect(shiftWeek(current, -1)).toEqual({ from: "2026-08-24", to: "2026-08-30" });
  });

  it("avanza una semana completa (lun–dom)", () => {
    const current = getWeekRange(new Date("2026-08-31T12:00:00"));
    expect(shiftWeek(current, 1)).toEqual({ from: "2026-09-07", to: "2026-09-13" });
  });
});

describe("isCurrentWeek", () => {
  it("la semana devuelta por getWeekRange() es la actual", () => {
    expect(isCurrentWeek(getWeekRange())).toBe(true);
  });
});

describe("formatWeekLabel", () => {
  it("muestra inicio – fin del rango", () => {
    const label = formatWeekLabel({ from: "2026-08-31", to: "2026-09-06" });
    expect(label).toContain("–");
    expect(label.length).toBeGreaterThan(0);
  });
});
