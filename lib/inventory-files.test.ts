import { describe, it, expect } from "vitest";
import { inventoryFileBase } from "./inventory-files";

describe("inventoryFileBase", () => {
  it("usa tipo, sucursal y la fecha del inventario en hora de Hermosillo", () => {
    // 18-nov 02:42Z = 17-nov 19:42 en Hermosillo
    expect(
      inventoryFileBase({ type: "final", subsidiary: { name: "Cabo San Lucas" }, inventoryDate: "2026-11-18T02:42:00.000Z" }),
    ).toBe("INVENTARIO-FINAL--Cabo San Lucas--17-11-2026");
  });

  it("sin tipo cae a Inicial y limpia caracteres que no van en nombres de archivo", () => {
    expect(inventoryFileBase({ subsidiary: { name: "Cd. Obregón/Centro" }, inventoryDate: "2026-11-17T17:00:00Z" })).toBe(
      "INVENTARIO-INICIAL--Cd. Obregón Centro--17-11-2026",
    );
  });
});
