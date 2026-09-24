import { describe, expect, it } from "vitest";
import { findConflicts, parseList, parseSheetRows } from "./manual-count-parse";

describe("parseList", () => {
  it("separa por saltos, tabs, comas y espacios; quita duplicados y vacíos", () => {
    expect(parseList("540148275693\n877368113055\t540148275693, 111122223333  \n\n")).toEqual([
      "540148275693",
      "877368113055",
      "111122223333",
    ]);
  });

  it("quita comillas y signos pegados de Excel", () => {
    expect(parseList(`"540148275693"\n'877368113055'`)).toEqual(["540148275693", "877368113055"]);
  });

  it("ignora texto que no es guía (encabezados)", () => {
    expect(parseList("Guía\nPOD\n540148275693")).toEqual(["540148275693"]);
  });
});

describe("parseSheetRows", () => {
  it("formato 3 columnas POD | DEX07 | DEX08 (con columnas de distinto largo)", () => {
    const r = parseSheetRows([
      ["POD", "DEX 07", "DEX08"],
      ["111122223333", "222233334444", "540148275693"],
      ["555566667777", null, "877368113055"],
      [null, null, "999900001111"],
    ]);
    expect(r).toEqual({
      pod: ["111122223333", "555566667777"],
      dex07: ["222233334444"],
      dex08: ["540148275693", "877368113055", "999900001111"],
    });
  });

  it("acepta ENTREGADO / 07 / 08 como encabezados", () => {
    const r = parseSheetRows([["Entregado", "07", "08"], ["111122223333", "222233334444", "540148275693"]]);
    expect(r.pod).toEqual(["111122223333"]);
    expect(r.dex07).toEqual(["222233334444"]);
    expect(r.dex08).toEqual(["540148275693"]);
  });

  it("formato 2 columnas Guía | Estatus", () => {
    const r = parseSheetRows([
      ["Guía", "Estatus"],
      ["111122223333", "ENTREGADO"],
      ["222233334444", "DEX 07"],
      ["540148275693", "8"],
      [877368113055, "dex08"],
      ["333344445555", "POD"],
    ]);
    expect(r).toEqual({
      pod: ["111122223333", "333344445555"],
      dex07: ["222233334444"],
      dex08: ["540148275693", "877368113055"],
    });
  });

  it("formato 2 columnas: estatus que no se reconoce → error en llano", () => {
    const r = parseSheetRows([["Guía", "Estatus"], ["111122223333", "EN RUTA"]]);
    expect(r.error).toContain("111122223333");
  });

  it("encabezados desconocidos → error en llano", () => {
    const r = parseSheetRows([["Folio", "Nombre"], ["1", "x"]]);
    expect(r.error).toBeDefined();
    expect(r.pod).toEqual([]);
  });

  it("hoja vacía → error", () => {
    expect(parseSheetRows([]).error).toBeDefined();
  });
});

describe("findConflicts", () => {
  it("devuelve las guías que están en 2 o más cajas", () => {
    expect(findConflicts({ pod: ["1", "2"], dex07: ["2", "3"], dex08: ["3", "4"] })).toEqual(["2", "3"]);
  });
});
