import ExcelJS from "exceljs";
import { fmtDate, fmtDateTime } from "@/lib/audit-format";

const tipoLabel = (t?: string) => {
  const v = String(t || "").toLowerCase();
  if (v === "fedex") return "FedEx";
  if (v === "dhl") return "DHL";
  return v ? v.toUpperCase() : "Otro";
};
const catLabel = (c?: string) => (c === "hoy" ? "Con 67 hoy" : c === "nunca" ? "Nunca" : "Sin 67 hoy");
const unlDates = (r: any) => (r.unloadings || []).map((u: any) => fmtDate(u.date)).join(", ");

/**
 * Excel del reporte "Desembarques" (estilo Visibilidad 67, todos los estatus),
 * generado en el CLIENTE desde las filas en pantalla (incluye la confirmación
 * FedEx cuando ya se consultó).
 */
export async function buildUnloadingReportExcel(rows: any[]): Promise<Blob> {
  const consulted = rows.some((r) => r.__diasSin67 != null);

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Desembarques");

  const title = sheet.addRow(["🚚 Reporte de Desembarques (Visibilidad 67)"]);
  sheet.mergeCells(`A${title.number}:K${title.number}`);
  title.font = { size: 16, bold: true, color: { argb: "FFFFFF" } };
  title.alignment = { vertical: "middle", horizontal: "center" };
  for (let c = 1; c <= 11; c++) {
    sheet.getCell(title.number, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0ea5e9" } };
  }
  sheet.addRow([`Generado: ${new Date().toLocaleString("es-MX")}`]);
  sheet.addRow([]);

  const headers = [
    "Guía", "Tipo", "Estatus actual", "Desembarques", "Alta en sistema",
    "Último 67", "Días sin 67 (propio)", "Visibilidad", "Destinatario", "CP",
  ];
  if (consulted) headers.push("Días sin 67 (FedEx)", "Días faltantes", "Último movimiento", "Movimientos");

  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  for (let c = 1; c <= headers.length; c++) {
    sheet.getCell(headerRow.number, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0369a1" } };
  }

  for (const r of rows) {
    const base: any[] = [
      r.trackingNumber || "",
      tipoLabel(r.shipmentType),
      r.status || "",
      unlDates(r) || "—",
      fmtDate(r.createdAt),
      r.last67Date ? fmtDate(r.last67Date) : "—",
      r.daysSinceLast67 == null ? "Nunca" : r.daysSinceLast67,
      catLabel(r.category),
      r.recipientName || "",
      r.recipientZip || "",
    ];
    if (consulted) {
      const missing: string[] = r.__missing67 || [];
      const movs: { date: string; description: string }[] = r.__events || [];
      base.push(
        r.__diasSin67 == null ? "—" : r.__diasSin67,
        missing.length ? missing.join(", ") : (r.__diasSin67 === 0 ? "Al día" : "—"),
        r.__lastMovement ? `${fmtDateTime(r.__lastMovement.date)} — ${r.__lastMovement.description}` : "—",
        movs.length ? movs.map((m) => `${fmtDate(m.date)}: ${m.description}`).join(" | ") : "—",
      );
    }
    sheet.addRow(base);
  }

  const widths = [22, 8, 16, 20, 16, 14, 16, 14, 26, 8, 16, 30, 34, 60];
  sheet.columns.forEach((col, i) => { col.width = widths[i] ?? 16; });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
