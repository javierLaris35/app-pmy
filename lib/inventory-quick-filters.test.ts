import { describe, it, expect } from "vitest";
import type { PackageInfo } from "@/lib/types";
import { countQuickFilters, findScannedPackage, matchesQuickFilter } from "./inventory-quick-filters";
import { nextAlertDay } from "./next-operating-day";

const saturday = new Date(2026, 10, 21, 9, 0);
const alert = nextAlertDay(saturday);
const at = (d: number, h = 12) => new Date(2026, 10, d, h).toISOString();
const pkg = (p: Partial<PackageInfo>): PackageInfo => ({ trackingNumber: "1", isValid: true, ...p } as PackageInfo);

describe("matchesQuickFilter", () => {
  it("sin filtro deja todo", () => {
    expect(matchesQuickFilter(pkg({}), null, saturday)).toBe(true);
  });

  it("hoy, mañana y el siguiente día que se opera no se enciman", () => {
    const hoy = pkg({ commitDateTime: at(21) });
    const manana = pkg({ commitDateTime: at(22) });
    const lunes = pkg({ commitDateTime: at(23) });
    expect(matchesQuickFilter(hoy, "today", saturday)).toBe(true);
    expect(matchesQuickFilter(manana, "tomorrow", saturday)).toBe(true);
    expect(matchesQuickFilter(lunes, "nextDay", saturday, alert)).toBe(true);
    expect(matchesQuickFilter(manana, "nextDay", saturday, alert)).toBe(false);
  });

  it("cobro, F2 y alto valor", () => {
    expect(matchesQuickFilter(pkg({ payment: { amount: 1 } as any }), "payment", saturday)).toBe(true);
    expect(matchesQuickFilter(pkg({ isCharge: true }), "f2", saturday)).toBe(true);
    expect(matchesQuickFilter(pkg({ isHighValue: true }), "highValue", saturday)).toBe(true);
    expect(matchesQuickFilter(pkg({}), "f2", saturday)).toBe(false);
  });
});

describe("countQuickFilters", () => {
  it("cuenta cada categoría", () => {
    const c = countQuickFilters(
      [pkg({ commitDateTime: at(21), payment: { amount: 1 } as any }), pkg({ commitDateTime: at(23), isCharge: true })],
      saturday,
      alert,
    );
    expect(c).toEqual({ today: 1, tomorrow: 0, nextDay: 1, payment: 1, f2: 1, highValue: 0 });
  });
});

describe("findScannedPackage", () => {
  const list = [
    pkg({ trackingNumber: "794512345678" }),
    pkg({ trackingNumber: "1234567890", dhlUniqueId: "JD014600001234" }),
  ];
  it("encuentra por guía y por pieza DHL con variante JJD", () => {
    expect(findScannedPackage("794512345678", list)?.trackingNumber).toBe("794512345678");
    expect(findScannedPackage("jjd014600001234", list)?.dhlUniqueId).toBe("JD014600001234");
  });
  it("null si no está o no hay código", () => {
    expect(findScannedPackage("000", list)).toBeNull();
    expect(findScannedPackage("", list)).toBeNull();
  });
});

describe("entregados", () => {
  it("no cuentan como vence hoy / mañana / siguiente día", () => {
    const alert = nextAlertDay(saturday);
    expect(matchesQuickFilter(pkg({ commitDateTime: at(21), status: "entregado" } as any), "today", saturday)).toBe(false);
    expect(matchesQuickFilter(pkg({ commitDateTime: at(22), status: "entregado_en_bodega" } as any), "tomorrow", saturday)).toBe(false);
    expect(matchesQuickFilter(pkg({ commitDateTime: at(23), status: "entregado" } as any), "nextDay", saturday, alert)).toBe(false);
    expect(matchesQuickFilter(pkg({ commitDateTime: at(21), status: "devuelto_a_fedex" } as any), "today", saturday)).toBe(false);
    expect(matchesQuickFilter(pkg({ commitDateTime: at(21), status: "en_bodega" } as any), "today", saturday)).toBe(true);
  });
});
