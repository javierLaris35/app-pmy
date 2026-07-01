import ExcelJS from "exceljs";
import { fmtDateTime } from "@/lib/audit-format";

const tipoLabel = (t?: string) => {
  const v = String(t || "").toLowerCase();
  return v === "fedex" ? "FedEx" : v === "dhl" ? "DHL" : v ? v.toUpperCase() : "Otro";
};
const siNo = (b?: boolean) => (b ? "Sí" : "No");
const money = (n: number) => (Number(n) || 0);

/**
 * Excel del reporte "Inventario sin movimiento (LD de bodega)". Dos hojas:
 *  1) "Por consolidado" — resumen por consNumber (en bodega / sin movimiento / LD / pérdida).
 *  2) "Detalle" — guías del inventario con movimiento, LD, destinatario, teléfono.
 */
export async function buildInventoryLDExcel(rows: any[], byCons?: any[], meta?: any): Promise<Blob> {
  const wb = new ExcelJS.Workbook();

  if (byCons && byCons.length) {
    const s1 = wb.addWorksheet("Por consolidado");
    const t = s1.addRow([`📦 Inventario sin movimiento (LD)${meta?.subsidiaryName ? " — " + meta.subsidiaryName : ""}`]);
    s1.mergeCells(`A${t.number}:F${t.number}`);
    t.font = { size: 15, bold: true, color: { argb: "FFFFFF" } };
    t.alignment = { vertical: "middle", horizontal: "center" };
    for (let c = 1; c <= 6; c++) s1.getCell(t.number, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "6366f1" } };
    s1.addRow([`Generado: ${new Date().toLocaleString("es-MX")}`]);
    s1.addRow([]);
    const h = s1.addRow(["Consolidado", "En bodega", "Con movimiento", "Sin movimiento", "LD", "Pérdida (MXN)"]);
    h.font = { bold: true, color: { argb: "FFFFFF" } };
    for (let c = 1; c <= 6; c++) s1.getCell(h.number, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4338ca" } };
    for (const g of byCons) {
      const row = s1.addRow([g.cons, g.enBodega, g.conMov, g.sinMov, g.ld, money(g.monto)]);
      if (g.ld > 0) { row.getCell(5).font = { bold: true, color: { argb: "E11D48" } }; row.getCell(6).font = { bold: true, color: { argb: "E11D48" } }; }
      row.getCell(6).numFmt = '"$"#,##0.00';
    }
    s1.columns.forEach((col, i) => { col.width = [26, 12, 14, 14, 8, 16][i] ?? 14; });
  }

  const s2 = wb.addWorksheet("Detalle");
  const headers = [
    "Guía", "Tipo", "Consolidado", "Estatus", "Vencimiento", "¿Movió ese día?", "LD",
    "Fuente LD", "Destinatario", "Dirección", "CP", "Teléfono", "Costo (MXN)",
  ];
  const hr = s2.addRow(headers);
  hr.font = { bold: true, color: { argb: "FFFFFF" } };
  hr.alignment = { vertical: "middle", horizontal: "center" };
  for (let c = 1; c <= headers.length; c++) s2.getCell(hr.number, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4338ca" } };
  for (const r of rows) {
    const row = s2.addRow([
      r.trackingNumber || "", tipoLabel(r.shipmentType), r.consNumber || "", r.status || "",
      r.commitDateTime ? fmtDateTime(r.commitDateTime) : "—", siNo(r.movedThatDay), r.isLD ? "LD" : "OK",
      r.ldSource === "fedex" ? "FedEx" : "Local", r.recipientName || "", r.recipientAddress || "",
      r.recipientZip || "", r.recipientPhone || "", money(r.costPackage),
    ]);
    row.getCell(13).numFmt = '"$"#,##0.00';
    if (r.isLD) row.getCell(7).font = { bold: true, color: { argb: "E11D48" } };
  }
  s2.columns.forEach((col, i) => { col.width = [22, 8, 20, 18, 18, 12, 6, 9, 24, 30, 8, 14, 12][i] ?? 14; });
  if (rows.length > 0) s2.autoFilter = { from: "A1", to: "M1" };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
