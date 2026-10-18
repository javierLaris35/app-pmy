import { describe, expect, it } from "vitest";
import { SCHEDULE_FIELDS, scheduleFormErrors, toSchedulePatch } from "./daily-tasks-schedule";

describe("scheduleFormErrors", () => {
  it("marca la hora inválida bajo su campo", () => {
    expect(scheduleFormErrors({ inventoryFinalTime: "25:00" })).toEqual({ inventoryFinalTime: "Usa una hora válida, por ejemplo 20:00" });
  });

  it("minutos fuera de rango", () => {
    expect(scheduleFormErrors({ dispatchAfterUnloadMinutes: "2000" })).toEqual({ dispatchAfterUnloadMinutes: "Escribe minutos entre 0 y 1440" });
  });

  it("vacío es válido (usa el valor general)", () => {
    expect(scheduleFormErrors({ closureTime: "" })).toEqual({});
  });
});

describe("toSchedulePatch", () => {
  it("vacío → null, minutos → número", () => {
    expect(toSchedulePatch({ closureTime: "", dispatchAfterUnloadMinutes: "90", inventoryFinalTime: "19:45" })).toMatchObject({ closureTime: null, dispatchAfterUnloadMinutes: 90, inventoryFinalTime: "19:45" });
  });

  it("incluye los 8 horarios acordados", () => {
    expect(SCHEDULE_FIELDS.map((f) => f.key)).toEqual([
      "uploadMinutes", "unloadingTime", "dispatchAfterUnloadMinutes", "dispatchNextDayTime", "closureTime", "inventoryInitialTime", "devolutionsTime", "inventoryFinalTime",
    ]);
  });
});
