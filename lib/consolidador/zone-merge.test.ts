import { describe, it, expect } from "vitest";
import { errorText, flattenParts, focusParts, pillLevel, sumParts } from "./zone-merge";
import type { ZonePart } from "@/lib/types/consolidador-zone";

const parts: ZonePart<{ rows: { tn: string }[] }>[] = [
  { subsidiaryId: "a", subsidiaryName: "Cabo San Lucas", data: { rows: [{ tn: "1" }, { tn: "2" }] }, error: null },
  { subsidiaryId: "b", subsidiaryName: "La Paz", data: null, error: "No se pudo cargar esta sucursal." },
  { subsidiaryId: "c", subsidiaryName: "Loreto", data: { rows: [{ tn: "3" }] }, error: null },
];

describe("focusParts", () => {
  it("con foco deja solo esa sucursal", () => expect(focusParts(parts, "c").map((p) => p.subsidiaryId)).toEqual(["c"]));
  it("sin foco deja todas", () => expect(focusParts(parts, null)).toHaveLength(3));
});

describe("flattenParts", () => {
  it("agrega la sucursal a cada fila y se salta las que fallaron", () => {
    expect(flattenParts(parts, (d) => d.rows)).toEqual([
      { tn: "1", subsidiaryId: "a", subsidiaryName: "Cabo San Lucas" },
      { tn: "2", subsidiaryId: "a", subsidiaryName: "Cabo San Lucas" },
      { tn: "3", subsidiaryId: "c", subsidiaryName: "Loreto" },
    ]);
  });
});

describe("sumParts", () => {
  it("suma un número de cada parte con datos", () => expect(sumParts(parts, (d) => d.rows.length)).toBe(3));
});

describe("pillLevel", () => {
  it("sin resumen → none", () => expect(pillLevel(null)).toBe("none"));
  it("usa el nivel del resumen", () => expect(pillLevel({ level: "bad" } as any)).toBe("bad"));
});

describe("errorText", () => {
  it("usa el mensaje en llano del servidor (apiMessage)", () => {
    expect(errorText({ response: { status: 403, data: { apiMessage: "Esta zona no tiene sucursales asignadas." } } }, "x")).toBe("Esta zona no tiene sucursales asignadas.");
  });
  it("5xx → mensaje genérico", () => {
    expect(errorText({ response: { status: 500, data: { apiMessage: "Internal" } } }, "No se pudo cargar")).toBe("No se pudo cargar. Intenta de nuevo.");
  });
  it("sin respuesta → sin conexión", () => {
    expect(errorText({}, "x")).toBe("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.");
  });
});
