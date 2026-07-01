import ExcelJS from "exceljs";
import { fmtDateTime } from "@/lib/audit-format";

const tipoLabel = (t?: string) => {
  const v = String(t || "").toLowerCase();
  if (v === "fedex") return "FedEx";
  if (v === "dhl") return "DHL";
  return v ? v.toUpperCase() : "Otro";
};
const catLabel = (c?: string) =>
  c === "entregado" ? "Entregado" : c === "dex" ? "DEX" : "No entregado";
const siNo = (b?: boolean) => (b ? "Sí" : "No");
const money = (n: number) => (Number(n) || 0);

/**
 * Excel del reporte "Rutas del día pasado". Dos hojas:
 *  1) "Resumen por chofer" — contadores y pérdida por LD (como el análisis diario).
 *  2) "Detalle" — todas las guías con su categoría, vencimiento, LD, 67, inventario.
 * `byDriver` y `meta` son opcionales (compatibilidad).
 */
export async function buildRoutesReportExcel(rows: any[], byDriver?: any[], meta?: any): Promise<Blob> {
  const wb = new ExcelJS.Workbook();

  // ---- Hoja 1: Resumen por chofer ----
  if (byDriver && byDriver.length) {
    const s1 = wb.addWorksheet("Resumen por chofer");
    const t = s1.addRow([`🚚 Rutas del día pasado${meta?.subsidiaryName ? " — " + meta.subsidiaryName : ""}`]);
    s1.mergeCells(`A${t.number}:I${t.number}`);
    t.font = { size: 15, bold: true, color: { argb: "FFFFFF" } };
    t.alignment = { vertical: "middle", horizontal: "center" };
    for (let c = 1; c <= 9; c++) s1.getCell(t.number, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0ea5e9" } };
    s1.addRow([`Generado: ${new Date().toLocaleString("es-MX")}`]);
    s1.addRow([]);

    const h = s1.addRow(["Chofer", "Rutas", "Total enrutados", "Del día", "Otros", "DEV", "LD", "Pérdida (MXN)", "Entregados"]);
    h.font = { bold: true, color: { argb: "FFFFFF" } };
    h.alignment = { vertical: "middle", horizontal: "center" };
    for (let c = 1; c <= 9; c++) s1.getCell(h.number, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0369a1" } };

    let totLD = 0, totMonto = 0;
    for (const g of byDriver) {
      const row = s1.addRow([g.driver, g.rutas, g.total, g.delDia, g.otros, g.dev, g.ld, money(g.monto), g.entregados]);
      if (g.ld > 0) { row.getCell(7).font = { bold: true, color: { argb: "E11D48" } }; row.getCell(8).font = { bold: true, color: { argb: "E11D48" } }; }
      row.getCell(8).numFmt = '"$"#,##0.00';
      totLD += g.ld || 0; totMonto += Number(g.monto) || 0;
    }
    const totalRow = s1.addRow(["TOTAL", "", "", "", "", "", totLD, money(totMonto), ""]);
    totalRow.font = { bold: true };
    totalRow.getCell(8).numFmt = '"$"#,##0.00';
    s1.columns.forEach((col, i) => { col.width = [26, 8, 16, 10, 10, 8, 8, 16, 12][i] ?? 14; });
  }

  // ---- Hoja 2: Detalle ----
  const s2 = wb.addWorksheet("Detalle");
  const headers = [
    "Guía", "Tipo", "Chofer", "Categoría", "Estatus", "Vencimiento", "Del día", "LD",
    "Fuente LD", "En inv. ayer", "67 ayer", "67 hoy", "¿Movido ayer?", "DEV", "Destinatario", "Dirección", "CP", "Costo (MXN)",
  ];
  const hr = s2.addRow(headers);
  hr.font = { bold: true, color: { argb: "FFFFFF" } };
  hr.alignment = { vertical: "middle", horizontal: "center" };
  for (let c = 1; c <= headers.length; c++) s2.getCell(hr.number, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0369a1" } };

  for (const r of rows) {
    const row = s2.addRow([
      r.trackingNumber || "", tipoLabel(r.shipmentType), r.driver || "—", catLabel(r.category),
      r.status || "", r.commitDateTime ? fmtDateTime(r.commitDateTime) : "—",
      siNo(r.dueOnFilterDate), r.isLD ? "LD" : "OK", r.ldSource === "fedex" ? "FedEx" : "Local",
      siNo(r.inLastInventoryYesterday), siNo(r.has67Yesterday), siNo(r.has67Today),
      siNo(r.movedYesterday), siNo(r.isDev), r.recipientName || "", r.recipientAddress || "",
      r.recipientZip || "", money(r.costPackage),
    ]);
    row.getCell(18).numFmt = '"$"#,##0.00';
    if (r.isLD) { row.getCell(8).font = { bold: true, color: { argb: "E11D48" } }; }
  }
  s2.columns.forEach((col, i) => { col.width = [22, 8, 20, 14, 18, 18, 8, 6, 9, 12, 8, 8, 12, 6, 24, 30, 8, 12][i] ?? 14; });
  if (rows.length > 0) s2.autoFilter = { from: "A1", to: "R1" };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
