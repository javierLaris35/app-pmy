import { describe, it, expect } from "vitest";
import { isDueOn, isHoliday, nextAlertDay } from "./next-operating-day";

// Fechas locales (sin "Z") para no depender de la zona horaria de quien corre la prueba.
const at = (m: number, d: number, h = 12) => new Date(2026, m - 1, d, h);

describe("nextAlertDay", () => {
  it("sábado normal → lunes", () => {
    const a = nextAlertDay(at(11, 21, 9));
    expect(a?.weekday).toBe("lunes");
    expect(a?.date.getDate()).toBe(23);
  });

  it("entre semana, si mañana se opera, no hay aviso", () => {
    expect(nextAlertDay(at(11, 18))).toBeNull(); // miércoles
    expect(nextAlertDay(at(11, 20))).toBeNull(); // viernes (el sábado sí se opera)
  });

  it("sábado con lunes festivo → martes", () => {
    const a = nextAlertDay(at(11, 14), [{ date: "2026-11-16", recurring: false }]);
    expect(a?.weekday).toBe("martes");
    expect(a?.date.getDate()).toBe(17);
  });

  it("miércoles antes de jueves festivo (recurrente) → viernes", () => {
    const a = nextAlertDay(at(12, 23), [{ date: "2000-12-24", recurring: true }]);
    expect(a?.weekday).toBe("viernes");
    expect(a?.date.getDate()).toBe(25);
  });

  it("cruza el cambio de mes", () => {
    const a = nextAlertDay(at(10, 31)); // sábado 31-oct
    expect(a?.date.getMonth()).toBe(10);
    expect(a?.date.getDate()).toBe(2);
  });
});

describe("isHoliday / isDueOn", () => {
  it("festivo exacto y recurrente", () => {
    expect(isHoliday(at(1, 1), [{ date: "2020-01-01", recurring: true }])).toBe(true);
    expect(isHoliday(at(1, 1), [{ date: "2020-01-01", recurring: false }])).toBe(false);
  });

  it("vence el día vigilado", () => {
    const a = nextAlertDay(at(11, 21, 9));
    expect(isDueOn(at(11, 23, 18).toISOString(), a)).toBe(true);
    expect(isDueOn(at(11, 24).toISOString(), a)).toBe(false);
    expect(isDueOn(null, a)).toBe(false);
    expect(isDueOn(at(11, 23).toISOString(), null)).toBe(false);
  });
});
