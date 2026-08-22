import { describe, it, expect } from "vitest";
import { buildMappedTable } from "./fedex-header-map";

describe("buildMappedTable (pegar FedEx)", () => {
  it("mapea columnas FedEx, ignora las irrelevantes y conserva el pago", () => {
    const rows = [
      // Encabezado real estilo FedEx: mezcla de columnas Shpr (irrelevantes) + Recip + COD.
      ["Tracking No", "Latest Dept Location", "Origin Loc ID", "Shpr Name", "Shpr Addr", "Recip Name", "Recip Addr", "Recip City", "Recip Postal", "Commit Date", "Recip Phone", "COD"],
      ["875824020332", "CUAH", "MUGA", "COSTCO MEXICO", "CENITRO CALLE", "JAIME ARENAS", "ALLENDE 123", "HERMOSILLO", "83000", "8/20/2026", "6621234567", "1500.50"],
      ["875827166531", "CUAH", "MUGA", "DHL SUPPLY", "AV X", "CORONADO", "CALLE 5", "HERMOSILLO", "83100", "8/20/2026", "", ""],
    ];
    const mapped = buildMappedTable(rows)!;
    expect(mapped).not.toBeNull();
    expect(mapped.hasTracking).toBe(true);
    expect(mapped.hasPayment).toBe(true);
    // Solo columnas reconocidas (Shpr/Latest Dept/Origin quedaron fuera).
    const fieldNames = mapped.fields.map((f) => f.field);
    expect(fieldNames).toContain("trackingNumber");
    expect(fieldNames).toContain("recipientName");
    expect(fieldNames).toContain("cod");
    expect(fieldNames).not.toContain("recipientName2");
    expect(mapped.rows).toHaveLength(2);
    expect(mapped.rows[0].trackingNumber).toBe("875824020332");
    expect(mapped.rows[0].recipientName).toBe("JAIME ARENAS");
    expect(mapped.rows[0].recipientCity).toBe("HERMOSILLO");
    expect(mapped.rows[0].cod).toBe("1500.50");
  });

  it("combina Dirección + Dirección 2", () => {
    const rows = [
      ["Tracking", "Recip Addr", "Rcvr Addr 2"],
      ["123", "Calle 1", "Int 4B"],
    ];
    const mapped = buildMappedTable(rows)!;
    expect(mapped.rows[0].recipientAddress).toBe("Calle 1, Int 4B");
  });

  it("devuelve null si no hay fila de encabezados reconocible", () => {
    const rows = [
      ["875824020332", "CUAH", "MUGA"],
      ["875827166531", "CUAH", "MUGA"],
    ];
    expect(buildMappedTable(rows)).toBeNull();
  });
});
