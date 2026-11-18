import { describe, it, expect } from "vitest";
import { compareIsClean, describeMovement } from "./inventory-compare";

const label = (s?: string | null) => (s === "en_ruta" ? "En ruta" : s === "cliente_no_disponible" ? "Cliente no disponible" : String(s));

describe("inventory-compare", () => {
  it("cuadra si no hay sin movimiento ni bodega", () => {
    expect(compareIsClean({ sinMovimiento: 0, bodega: 0, dex: 2, ruta: 5, pod: 9, otros: 1 })).toBe(true);
    expect(compareIsClean({ sinMovimiento: 1, bodega: 0, dex: 0, ruta: 0, pod: 0, otros: 0 })).toBe(false);
    expect(compareIsClean(null)).toBe(false);
  });

  it("describe el último movimiento en llano (hora Hermosillo)", () => {
    // 17-nov 18:20Z = 11:20 en Hermosillo
    expect(describeMovement({ at: "2026-11-17T18:20:00Z", status: "en_ruta", notes: "En ruta" }, label)).toBe("17/11, 11:20 · En ruta");
    expect(
      describeMovement({ at: "2026-11-17T20:05:00Z", status: "cliente_no_disponible", exceptionCode: "08", notes: "Customer not available" }, label),
    ).toBe("17/11, 13:05 · Cliente no disponible · código 08 · Customer not available");
  });

  it("sin movimiento dice desde cuándo", () => {
    expect(describeMovement(null, label, "2026-11-17T16:15:00Z")).toBe("Sin movimiento desde 17/11, 09:15");
    expect(describeMovement(null, label)).toBe("Sin movimiento");
    expect(describeMovement(null, label, "2026-11-17T16:15:00Z", "2026-11-18T02:27:00Z")).toBe("Sin movimiento entre 17/11, 09:15 y 19:27");
  });
});
