import ExcelJS from "exceljs";
import { fmtDate, fmtDateTime } from "@/lib/audit-format";

const tipoLabel = (t?: string) => {
  const v = String(t || "").toLowerCase();
  if (v === "fedex") return "FedEx";
  if (v === "dhl") return "DHL";
  return v ? v.toUpperCase() : "Otro";
};
const catLabel = (c?: string) => (c === "hoy" ? "Con 44 hoy" : c === "nunca" ? "Nunca" : "Sin 44 hoy");

/**
 * Excel del reporte "Sin código 44" generado en el CLIENTE a partir de las filas
 * en pantalla (incluye la confirmación de FedEx cuando ya se consultó). A
 * diferencia de "Visibilidad 67", trae columna Sucursal porque el reporte puede
 * abarcar varias sucursales/una zona a la vez.
 */
export async function buildVisibility44Excel(rows: any[]): Promise<Blob> {
  const consulted = rows.some((r) => r.__diasSin44 != null);

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Sin código 44");

  const title = sheet.addRow(["📦 Reporte de Visibilidad 44"]);
  sheet.mergeCells(`A${title.number}:K${title.number}`);
  title.font = { size: 16, bold: true, color: { argb: "FFFFFF" } };
  title.alignment = { vertical: "middle", horizontal: "center" };
  for (let c = 1; c <= 11; c++) {
    sheet.getCell(title.number, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "ef883a" } };
  }
  sheet.addRow([`Generado: ${new Date().toLocaleString("es-MX")}`]);
  sheet.addRow([]);

  const headers = [
    "Guía",
    "Sucursal",
    "Tipo",
    "Estatus",
    "Alta en sistema",
    "Último 44",
    "Días sin 44 (propio)",
    "Visibilidad",
    "Destinatario",
    "CP",
  ];
  if (consulted) {
    headers.push("Días sin 44 (FedEx)", "Días faltantes", "Último movimiento", "Movimientos");
  }
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  for (let c = 1; c <= headers.length; c++) {
    sheet.getCell(headerRow.number, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "8C5E4E" } };
  }

  for (const r of rows) {
    const base = [
      r.trackingNumber || "",
      r.subsidiaryName || "",
      tipoLabel(r.shipmentType),
      r.status || "",
      fmtDate(r.createdAt),
      r.lastCodeDate ? fmtDate(r.lastCodeDate) : "—",
      r.daysSinceLastCode == null ? "Nunca" : r.daysSinceLastCode,
      catLabel(r.category),
      r.recipientName || "",
      r.recipientZip || "",
    ];
    if (consulted) {
      const missing: string[] = r.__missing44 || [];
      const movs: { date: string; description: string }[] = r.__events || [];
      base.push(
        r.__diasSin44 == null ? "—" : r.__diasSin44,
        missing.length ? missing.join(", ") : (r.__diasSin44 === 0 ? "Al día" : "—"),
        r.__lastMovement ? `${fmtDateTime(r.__lastMovement.date)} — ${r.__lastMovement.description}` : "—",
        movs.length ? movs.map((m) => `${fmtDate(m.date)}: ${m.description}`).join(" | ") : "—",
      );
    }
    sheet.addRow(base);
  }

  const widths = [22, 20, 8, 16, 16, 14, 14, 14, 26, 8, 16, 30, 34, 60];
  sheet.columns.forEach((col, i) => { col.width = widths[i] ?? 16; });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
