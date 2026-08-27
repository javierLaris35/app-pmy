import ExcelJS from "exceljs";
import { fmtDate, fmtDateTime } from "@/lib/audit-format";
import { daysWithPackageLabel } from "@/lib/days-with-package";

const tipoLabel = (t?: string) => {
  const v = String(t || "").toLowerCase();
  if (v === "fedex") return "FedEx";
  if (v === "dhl") return "DHL";
  return v ? v.toUpperCase() : "Otro";
};
const catLabel = (c?: string, code: string = "67") => (c === "hoy" ? `Con ${code} hoy` : c === "nunca" ? "Nunca" : `Sin ${code} hoy`);
const invTypeLabel = (t?: string) => {
  const v = String(t || "").toLowerCase();
  if (v === "initial") return "Inicial";
  if (v === "dex") return "DEX";
  if (v === "final") return "Final";
  return t || "";
};

/**
 * Excel del reporte "Inventarios" generado en el CLIENTE a partir de las filas
 * en pantalla, incluyendo la columna "Inventarios" (en cuáles estuvo) y, si ya
 * se consultó FedEx, días sin 67 / faltantes / último movimiento / movimientos.
 */
export async function buildInventoryReportExcel(rows: any[]): Promise<Blob> {
  const consulted = rows.some((r) => r.__diasSin67 != null);

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Inventarios");

  const title = sheet.addRow(["📦 Reporte de Inventarios (Visibilidad 67)"]);
  sheet.mergeCells(`A${title.number}:K${title.number}`);
  title.font = { size: 16, bold: true, color: { argb: "FFFFFF" } };
  title.alignment = { vertical: "middle", horizontal: "center" };
  for (let c = 1; c <= 11; c++) {
    sheet.getCell(title.number, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "6366f1" } };
  }
  sheet.addRow([`Generado: ${new Date().toLocaleString("es-MX")}`]);
  sheet.addRow([]);

  const headers = [
    "Guía", "Tipo", "Código", "Estatus actual", "Inventarios", "Alta en sistema", "Días con el paquete",
    "Último código", "Días sin código (propio)", "Visibilidad", "Destinatario", "CP",
  ];
  if (consulted) headers.push("Días sin código (FedEx)", "Días faltantes", "Último movimiento", "Movimientos");

  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  for (let c = 1; c <= headers.length; c++) {
    sheet.getCell(headerRow.number, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4338ca" } };
  }

  for (const r of rows) {
    const invStr = (r.inventories || []).map((i: any) => invTypeLabel(i.type)).join(", ") || r.inventoryTypes || "";
    const base: any[] = [
      r.trackingNumber || "",
      tipoLabel(r.shipmentType),
      String(r.scanCode ?? "67"),
      r.status || "",
      invStr,
      fmtDate(r.createdAt),
      daysWithPackageLabel(r.createdAt),
      r.last67Date ? fmtDate(r.last67Date) : "—",
      r.daysSinceLast67 == null ? "Nunca" : r.daysSinceLast67,
      catLabel(r.category, String(r.scanCode ?? "67")),
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

  const widths = [22, 8, 8, 16, 18, 16, 16, 14, 16, 14, 26, 8, 16, 30, 34, 60];
  sheet.columns.forEach((col, i) => { col.width = widths[i] ?? 16; });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
