import { describe, expect, it } from "vitest";
import { closureLink, dayLabel, driverName, dayPct, hermosilloTime, routesSummary, sortConsolidated, stepLabel, stepLink, stepVisual, weekDays } from "./daily-tasks-view";

describe("stepVisual", () => {
  it("listo se tacha en verde; tarde en rojo; a medias en ámbar; pendiente gris", () => {
    expect(stepVisual("done")).toEqual({ icon: "done", strike: true, tone: "success" });
    expect(stepVisual("late")).toEqual({ icon: "late", strike: false, tone: "danger" });
    expect(stepVisual("partial")).toEqual({ icon: "partial", strike: false, tone: "warning" });
    expect(stepVisual("pending")).toEqual({ icon: "pending", strike: false, tone: "muted" });
  });
});

describe("stepLabel / stepLink", () => {
  it("textos en llano y liga a la pantalla donde se hace el paso", () => {
    expect(stepLabel("upload")).toBe("Consolidado subido");
    expect(stepLabel("inventory_final")).toBe("Inventario final de día");
    expect(stepLink("unloading")).toBe("/operaciones/desembarques");
    expect(stepLink("dispatch")).toBe("/operaciones/salidas-a-ruta");
    expect(stepLink("inventory_initial")).toBe("/operaciones/inventarios");
  });
});

describe("sortConsolidated", () => {
  it("con atrasos primero, terminados al final", () => {
    const list = [
      { id: "listo", tasks: [{ status: "done" as const }] },
      { id: "medias", tasks: [{ status: "done" as const }, { status: "partial" as const }] },
      { id: "tarde", tasks: [{ status: "late" as const }] },
    ];
    expect(sortConsolidated(list).map((x) => x.id)).toEqual(["tarde", "medias", "listo"]);
  });
});

describe("dayPct", () => {
  it("porcentaje entero de pasos listos", () => {
    expect(dayPct([{ status: "done" }, { status: "late" }, { status: "done" }])).toBe(67);
    expect(dayPct([])).toBe(0);
  });
});

describe("weekDays / hermosilloTime", () => {
  it("lunes a domingo con el nombre completo del día", () => {
    expect(weekDays("2026-10-12").map((d) => d.label)).toEqual([
      "Lunes 12 - Oct", "Martes 13 - Oct", "Miércoles 14 - Oct", "Jueves 15 - Oct", "Viernes 16 - Oct", "Sábado 17 - Oct", "Domingo 18 - Oct",
    ]);
    expect(dayLabel("2026-01-05")).toBe("Lunes 5 - Ene");
  });
  it("hora de Hermosillo en formato de 12 horas", () => {
    expect(hermosilloTime("2026-10-17T13:40:00.000Z")).toBe("6:40 a. m.");
    expect(hermosilloTime("2026-10-18T03:00:00.000Z")).toBe("8:00 p. m.");
    expect(hermosilloTime("2026-10-17T19:05:00.000Z")).toBe("12:05 p. m.");
    expect(hermosilloTime("2026-10-17T07:30:00.000Z")).toBe("12:30 a. m.");
  });
});

describe("routesSummary", () => {
  it("cuenta rutas como hechos, sin fracciones", () => {
    expect(routesSummary([{ closed: true }, { closed: false }, { closed: false }, { closed: false }])).toBe("4 salieron · 1 cerrada · 3 sin cerrar");
    expect(routesSummary([{ closed: true }, { closed: true }])).toBe("2 salieron · todas cerradas");
    expect(routesSummary([{ closed: false }])).toBe("1 salió · 1 sin cerrar");
    expect(routesSummary([])).toBe("No ha salido ninguna ruta");
  });
});

describe("closureLink", () => {
  it("lleva a Salidas a ruta enfocando la salida y pidiendo abrir su cierre", () => {
    expect(closureLink({ id: "d-1", trackingNumber: "068422797359" })).toBe("/operaciones/salidas-a-ruta?seguimiento=068422797359&cerrar=d-1");
  });
});

describe("driverName", () => {
  it("nombres de chofer en mayúsculas, con acentos y ñ, sin espacios de sobra", () => {
    expect(driverName("  juan  pérez, Ana Muñoz ")).toBe("JUAN PÉREZ, ANA MUÑOZ");
    expect(driverName("")).toBe("");
  });
});
