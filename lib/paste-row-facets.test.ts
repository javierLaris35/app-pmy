import { describe, it, expect } from "vitest";
import { buildMappedTable, mergeHighValue, mergePayments } from "./fedex-header-map";
import { altoValorFacet, cobroFacet, matchesAnySelected, revisionFacets } from "./paste-row-facets";

const t0 = buildMappedTable([
  ["Tracking No", "Recip Name", "Recip Postal", "COD"],
  ["383961000001", "JUAN", "85880", "COD 100"],
  ["383961000002", "ANA", "85860", "1500"],
  ["383961000003", "LUIS", "85870", ""],
  ["383961000003", "LUIS", "85870", ""],
  ["3.83961E+11", "PEDRO", "85870", ""],
  ["", "SIN GUIA", "85870", ""],
])!;
const t = mergeHighValue(mergePayments(t0, []), [{ tracking: "383961000001", address: "" }]);
const byTracking = (x: string) => t.rows.find((r) => r.values.trackingNumber === x)!;

describe("filtros de la tabla del pegado", () => {
  it("Cobro: con cobro / sin tipo / sin cobro", () => {
    expect(cobroFacet(byTracking("383961000001"))).toBe("con_cobro");
    expect(cobroFacet(byTracking("383961000002"))).toBe("sin_tipo");
    expect(cobroFacet(byTracking("383961000003"))).toBe("sin_cobro");
  });

  it("Alto Valor", () => {
    expect(altoValorFacet(byTracking("383961000001"))).toBe("si");
    expect(altoValorFacet(byTracking("383961000002"))).toBe("no");
  });

  it("Revisión: duplicada, cortada, sin guía y sin problema", () => {
    expect(revisionFacets(byTracking("383961000003"))).toContain("duplicada");
    expect(revisionFacets(byTracking("3.83961E+11"))).toContain("cortada");
    expect(revisionFacets(byTracking(""))).toContain("sin_guia");
    expect(revisionFacets(byTracking("383961000002"))).not.toContain("duplicada");
  });

  it("matchesAnySelected sirve para un valor y para listas", () => {
    expect(matchesAnySelected("con_cobro", ["con_cobro", "sin_tipo"])).toBe(true);
    expect(matchesAnySelected("sin_cobro", ["con_cobro"])).toBe(false);
    expect(matchesAnySelected(["duplicada", "vencimiento"], ["vencimiento"])).toBe(true);
    expect(matchesAnySelected("x", undefined)).toBe(true);
  });

  it("filtrar por Cobro deja solo las filas con cobro", () => {
    const filtered = t.rows.filter((r) => matchesAnySelected(cobroFacet(r), ["con_cobro", "sin_tipo"]));
    expect(filtered.map((r) => r.values.trackingNumber)).toEqual(["383961000001", "383961000002"]);
  });
});
