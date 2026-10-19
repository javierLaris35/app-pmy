import { describe, it, expect } from "vitest";
import { scopeReady, scopedUrl, type ConsolidadorScope } from "./scope";

const zone: ConsolidadorScope = { mode: "zone", zoneId: "z1", subsidiaryId: "", focusSubsidiaryId: null };
const sub: ConsolidadorScope = { mode: "subsidiary", zoneId: "", subsidiaryId: "s1", focusSubsidiaryId: null };

describe("scopedUrl", () => {
  it("zona → endpoint genérico con la vista", () => {
    expect(scopedUrl(zone, "2026-10-12", "2026-10-18", "by-route")).toBe("/consolidador/zone/z1/2026-10-12/2026-10-18/by-route");
  });
  it("sucursal 'week' → la ruta de ingresos de siempre", () => {
    expect(scopedUrl(sub, "2026-10-12", "2026-10-18", "week")).toBe("/consolidador/s1/2026-10-12/2026-10-18");
  });
  it("sucursal con otra vista → /vista al final", () => {
    expect(scopedUrl(sub, "2026-10-12", "2026-10-18", "summary")).toBe("/consolidador/s1/2026-10-12/2026-10-18/summary");
  });
});

describe("scopeReady", () => {
  it("zona sin zona elegida → no", () => expect(scopeReady({ ...zone, zoneId: "" })).toBe(false));
  it("sucursal sin sucursal → no", () => expect(scopeReady({ ...sub, subsidiaryId: "" })).toBe(false));
  it("con lo elegido → sí", () => {
    expect(scopeReady(zone)).toBe(true);
    expect(scopeReady(sub)).toBe(true);
  });
});
