import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { workbookToRows, rowsToTsv, readWorkbook } from "./excel-to-rows";
import { buildMappedTable } from "./fedex-header-map";

// Archivo guardado con Excel real: guías/teléfonos de 12 dígitos (Excel los muestra
// como 3.8396E+11), fecha como fecha de Excel y hora como fracción con formato hh:mm:ss.
const fixture = () => readWorkbook(readFileSync(join(__dirname, "__fixtures__", "fedex-sci.xlsx")));

describe("workbookToRows (leer el archivo de Excel sin perder dígitos)", () => {
  it("guías y teléfonos completos, nunca en notación científica", () => {
    const rows = workbookToRows(fixture());
    expect(rows[1][0]).toBe("383961234567");
    expect(rows[2][0]).toBe("383975000123");
    expect(rows[1][5]).toBe("526421234567");
  });

  it("fecha de Excel → AAAA-MM-DD y hora de Excel → HH:MM:SS", () => {
    const rows = workbookToRows(fixture());
    expect(rows[1][3]).toBe("2026-10-07");
    expect(rows[1][4]).toBe("21:00:00");
    expect(rows[2][3]).toBe("2026-10-09"); // Excel convirtió el texto en fecha al guardarlo
    expect(rows[2][4]).toBe("21:00:00");
  });

  it("lo leído entra a la misma tabla del pegado sin guías cortadas", () => {
    const t = buildMappedTable(workbookToRows(fixture()))!;
    expect(t.rows.map((r) => r.values.trackingNumber)).toEqual(["383961234567", "383975000123"]);
    expect(t.counts.badTracking).toBe(0);
  });

  it("rowsToTsv arma el texto que se ve en el cuadro de pegado", () => {
    expect(rowsToTsv([["a", "b"], ["1", "2"]])).toBe("a\tb\n1\t2");
  });
});
