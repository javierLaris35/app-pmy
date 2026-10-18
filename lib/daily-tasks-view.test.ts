import { describe, expect, it } from "vitest";
import { dayPct, hermosilloTime, sortConsolidated, stepLabel, stepLink, stepVisual, weekDays } from "./daily-tasks-view";

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
    expect(stepLink("devolutions")).toBe("/operaciones/devoluciones");
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
  it("lunes a domingo con letra del día", () => {
    expect(weekDays("2026-10-12").map((d) => `${d.letter}${d.day.slice(8)}`)).toEqual(["L12", "M13", "M14", "J15", "V16", "S17", "D18"]);
  });
  it("hora de Hermosillo de un instante", () => {
    expect(hermosilloTime("2026-10-17T13:40:00.000Z")).toBe("06:40");
  });
});
