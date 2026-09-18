import { describe, it, expect } from "vitest";
import { actionLabel, verdictTone } from "./verdict";

describe("actionLabel", () => {
  it("fix_status → 'Corregir estatus a …' en mayúsculas y sin guiones bajos", () => {
    expect(actionLabel({ kind: "fix_status", to: "entregado" })).toBe("Corregir estatus a ENTREGADO");
    expect(actionLabel({ kind: "fix_status", to: "entregado_por_fedex" })).toBe("Corregir estatus a ENTREGADO POR FEDEX");
  });
  it("delete_income → 'Eliminar cobro'", () => {
    expect(actionLabel({ kind: "delete_income" })).toBe("Eliminar cobro");
  });
  it("none → null", () => {
    expect(actionLabel({ kind: "none" })).toBeNull();
  });
});

describe("verdictTone", () => {
  it("da clases distintas por nivel", () => {
    expect(verdictTone("ok").dot).toContain("emerald");
    expect(verdictTone("warn").dot).toContain("amber");
    expect(verdictTone("danger").dot).toContain("rose");
  });
});
