// lib/utils/excel/generateInventoryExcel.ts
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { InventoryRequest } from "@/lib/types";
import { format, toZonedTime } from "date-fns-tz";
import { mapToPackageInfo } from "@/lib/utils";

export async function generateInventoryExcel(report: InventoryRequest, forDownload = true): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Inventario");
  const timeZone = "America/Hermosillo";
  const packages = mapToPackageInfo(report.shipments, report.chargeShipments);

  // === ENCABEZADO GENERAL ===
  const titleRow = sheet.addRow([`📦 Inventario`]);
  sheet.mergeCells(`A${titleRow.number}:H${titleRow.number}`);
  titleRow.font = { size: 16, bold: true, color: { argb: "FFFFFF" } };
  titleRow.alignment = { vertical: "middle", horizontal: "center" };
  for (let col = 1; col <= 8; col++) {
    sheet.getCell(titleRow.number, col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "ef883a" } };
  }

  sheet.addRow([]);
  sheet.addRow([`Sucursal: ${report.subsidiary.name}`]);
  const createdAt = format(toZonedTime(new Date(report.inventoryDate), timeZone), "yyyy-MM-dd HH:mm");
  sheet.addRow([`Fecha: ${createdAt}`]);
  sheet.addRow([`Paquetes: ${packages.length}`]);
  sheet.addRow([]);

  // === ENCABEZADO DE COLUMNAS ===
  const headerRow = sheet.addRow(["No.", "Guía", "Nombre", "Dirección", "Cobro", "Fecha", "Hora", "Celular"]);
  headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  for (let col = 1; col <= 8; col++) {
    sheet.getCell(headerRow.number, col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "8c5e4e" } };
  }

  // === DATOS ===
  packages.forEach((pkg, index) => {
    const zoned = toZonedTime(new Date(pkg.commitDateTime), timeZone);
    const commitDate = format(zoned, "yyyy-MM-dd");
    const commitTime = format(zoned, "HH:mm:ss");

    const row = sheet.addRow([
      index + 1,
      pkg.trackingNumber,
      pkg.recipientName,
      pkg.recipientAddress,
      pkg.payment ? `${pkg.payment.type} $${pkg.payment.amount}` : "",
      commitDate,
      commitTime,
      pkg.recipientPhone || "",
    ]);

    if (index % 2 === 0) {
      for (let col = 1; col <= 8; col++) {
        sheet.getCell(row.number, col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F2F2F2" } };
      }
    }
  });

  // === Missing / UnScanned ===
  if (report.missingTrackings && report.missingTrackings.length > 0) {
    sheet.addRow([]);
    sheet.addRow(["❌ Missing Trackings"]);
    report.missingTrackings.forEach((trk) => sheet.addRow([trk]));
  }

  if (report.unScannedTrackings && report.unScannedTrackings.length > 0) {
    sheet.addRow([]);
    sheet.addRow(["📍 UnScanned Trackings"]);
    report.unScannedTrackings.forEach((trk) => sheet.addRow([trk]));
  }

  // === AJUSTE DE COLUMNAS ===
  sheet.columns.forEach((col) => {
    let maxLength = 10;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value?.toString().length || 0;
      if (len > maxLength) maxLength = len;
    });
    col.width = maxLength + 2;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  if (forDownload) {
    saveAs(
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `${report.subsidiary.name}--Inventario--${createdAt}.xlsx`
    );
  }
  return buffer;
}
