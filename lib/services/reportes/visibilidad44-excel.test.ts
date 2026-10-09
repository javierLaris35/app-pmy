import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { buildVisibility44Excel } from "./visibilidad44-excel";

const row = (over: Record<string, any>) => ({
  trackingNumber: "T",
  subsidiaryName: "Huatabampo",
  scanCode: "44",
  status: "pendiente",
  shipmentType: "fedex",
  createdAt: "2026-10-01T16:34:52.000Z",
  recipientName: "X",
  recipientZip: "86500",
  ...over,
});

const headerRowOf = (ws: ExcelJS.Worksheet) => {
  for (let i = 1; i <= 10; i++) if (ws.getRow(i).getCell(1).value === "Guía") return i;
  throw new Error("sin encabezado");
};

async function load(rows: any[], meta?: any) {
  const blob = await buildVisibility44Excel(rows, meta);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await blob.arrayBuffer());
  return wb;
}

describe("buildVisibility44Excel", () => {
  const rows = [
    row({ trackingNumber: "AL-DIA", daysSinceLastCode: 0, category: "hoy", lastCodeDate: "2026-10-09T04:36:00.000Z" }),
    row({ trackingNumber: "NUNCA", daysSinceLastCode: null, category: "nunca", subsidiaryName: "Navojoa" }),
    row({ trackingNumber: "TRES", daysSinceLastCode: 3, category: "sinCodigo" }),
    row({ trackingNumber: "UNO", daysSinceLastCode: 1, category: "sinCodigo" }),
  ];

  it("la hoja de detalle trae el filtro activado y el encabezado fijo", async () => {
    const ws = (await load(rows)).getWorksheet("Detalle")!;
    expect(ws.autoFilter).toBeTruthy();
    const headerRow = headerRowOf(ws);
    expect(String((ws.autoFilter as any)?.from?.row ?? ws.autoFilter)).toContain(String(headerRow));
    expect(ws.views[0]).toMatchObject({ state: "frozen", ySplit: headerRow });
  });

  it("ordena de la más atrasada a la menos: Nunca, 3, 1, al día", async () => {
    const ws = (await load(rows)).getWorksheet("Detalle")!;
    const headerRow = headerRowOf(ws);
    const tns = [1, 2, 3, 4].map((i) => ws.getRow(headerRow + i).getCell(1).value);
    expect(tns).toEqual(["NUNCA", "TRES", "UNO", "AL-DIA"]);
  });

  it("días sin código es número (se puede filtrar y ordenar) y el último escaneo va en hora de Hermosillo", async () => {
    const ws = (await load(rows)).getWorksheet("Detalle")!;
    const headerRow = headerRowOf(ws);
    const headers = (ws.getRow(headerRow).values as any[]).slice(1);
    const col = (name: string) => headers.indexOf(name) + 1;
    expect(ws.getRow(headerRow + 2).getCell(col("Días sin código")).value).toBe(3);
    expect(ws.getRow(headerRow + 4).getCell(col("Último escaneo")).value).toBe("08/10/2026 21:36");
    expect(ws.getRow(headerRow + 1).getCell(col("Visibilidad")).value).toBe("Nunca");
  });

  it("hoja por sucursal con conteos y filtro", async () => {
    const ws = (await load(rows)).getWorksheet("Por sucursal")!;
    expect(ws.autoFilter).toBeTruthy();
    const values = ws.getSheetValues().filter(Boolean).map((r: any) => r.slice(1));
    const hua = values.find((v: any[]) => v[0] === "Huatabampo");
    // Sucursal, Paquetes, Al día, Con días sin código, Nunca
    expect(hua).toEqual(["Huatabampo", 3, 1, 2, 0]);
  });
});
