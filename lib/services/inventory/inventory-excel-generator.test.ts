import { describe, it, expect, vi } from "vitest";
import ExcelJS from "exceljs";

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

import { generateInventoryExcel } from "./inventory-excel-generator";

const localIso = (d: Date, addDays: number, h = 12) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + addDays, h).toISOString();

describe("generateInventoryExcel", () => {
  it("pinta hoy en rojo y mañana en naranja, pone filtro y las columnas nuevas", async () => {
    const now = new Date();
    const packages: any[] = [
      { trackingNumber: "111", isValid: true, shipmentType: "fedex", commitDateTime: localIso(now, 0, 18), status: "en_bodega", createdAt: localIso(now, -5, 9) },
      { trackingNumber: "222", isValid: true, shipmentType: "fedex", commitDateTime: localIso(now, 1), status: "en_ruta", createdAt: localIso(now, -1, 9) },
      { trackingNumber: "333", isValid: true, shipmentType: "fedex", commitDateTime: localIso(now, 0, 18), status: "entregado", createdAt: localIso(now, -3, 9), currentStatusAt: localIso(now, -1, 13) },
    ];
    const buf = await generateInventoryExcel(
      { type: "final", subsidiary: { name: "Cabo San Lucas" }, inventoryDate: now.toISOString() },
      false,
      { packages },
    );

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.getWorksheet("Inventario")!;

    let headerRow = 0;
    ws.eachRow((row, n) => {
      if (row.getCell(1).value === "No.") headerRow = n;
    });
    expect(headerRow).toBeGreaterThan(0);
    const headers = (ws.getRow(headerRow).values as any[]).slice(1);
    expect(headers.slice(-4)).toEqual(["Estatus", "Registrado en sistema", "Días en bodega", "Fecha entrega / DEX"]);
    expect(ws.autoFilter).toBeTruthy();

    const fill = (r: number) => (ws.getRow(r).getCell(2).fill as any)?.fgColor?.argb;
    expect(fill(headerRow + 1)).toMatch(/FFC7CE$/); // hoy: rojo
    expect(fill(headerRow + 2)).toMatch(/FFD8A8$/); // mañana: naranja
    expect(fill(headerRow + 3) ?? "").not.toMatch(/FFC7CE$/); // vence hoy pero ya entregado: sin rojo

    const row = (r: number) => (ws.getRow(r).values as any[]).slice(1);
    expect(row(headerRow + 1).slice(-4)).toEqual(["En Bodega", expect.any(String), 5, ""]);
    expect(row(headerRow + 2).slice(-2)).toEqual([1, ""]);
    expect(row(headerRow + 3)[13]).toBe(""); // entregado: sin días en bodega
    // Con su fecha de entrega (en hora Hermosillo; no se fija la hora para no depender de la zona de la máquina).
    expect(row(headerRow + 3)[14]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});
