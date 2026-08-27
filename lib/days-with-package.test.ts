import { describe, it, expect } from "vitest";
import { daysWithPackage } from "./days-with-package";

/**
 * "Días con el paquete" = días CALENDARIO desde la creación del shipment (createdAt) hasta hoy.
 * Se usa en los reportes de inventario (vista + Excel).
 */
describe("daysWithPackage", () => {
  const now = new Date("2026-08-26T10:00:00");

  it("creado hoy → 0", () => {
    expect(daysWithPackage("2026-08-26T01:00:00", now)).toBe(0);
  });

  it("creado hace 3 días → 3", () => {
    expect(daysWithPackage("2026-08-23T23:00:00", now)).toBe(3);
  });

  it("acepta Date además de string ISO", () => {
    expect(daysWithPackage(new Date("2026-08-20T08:00:00"), now)).toBe(6);
  });

  it("sin fecha o inválida → null", () => {
    expect(daysWithPackage(null, now)).toBeNull();
    expect(daysWithPackage(undefined, now)).toBeNull();
    expect(daysWithPackage("no-es-fecha", now)).toBeNull();
  });

  it("fecha futura → 0 (no negativos)", () => {
    expect(daysWithPackage("2026-08-30T00:00:00", now)).toBe(0);
  });
});
