import { describe, it, expect } from "vitest";
import { getWeekRange, shiftWeek, isCurrentWeek, formatWeekLabel, getPresetRange } from "./week";

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

describe("getPresetRange", () => {
  // 2026-10-01 es jueves: "Semana" debe ser lun 28-sep → dom 04-oct, no jue→jue.
  const thursday = new Date("2026-10-01T15:00:00");

  it("week → lunes–domingo de la semana en curso (no últimos 7 días)", () => {
    expect(getPresetRange("week", thursday)).toEqual({ from: "2026-09-28", to: "2026-10-04" });
  });

  it("week en domingo → cierra su propia semana", () => {
    expect(getPresetRange("week", new Date("2026-10-04T22:00:00"))).toEqual({ from: "2026-09-28", to: "2026-10-04" });
  });

  it("today / yesterday", () => {
    expect(getPresetRange("today", thursday)).toEqual({ from: "2026-10-01", to: "2026-10-01" });
    expect(getPresetRange("yesterday", thursday)).toEqual({ from: "2026-09-30", to: "2026-09-30" });
  });

  it("month → últimos 30 días", () => {
    expect(getPresetRange("month", thursday)).toEqual({ from: "2026-09-02", to: "2026-10-01" });
  });
});
