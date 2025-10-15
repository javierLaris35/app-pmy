// lib/utils/excel/generateInventoryExcel.ts
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { InventoryRequest } from "@/lib/types";
import { format, toZonedTime } from "date-fns-tz";
import { mapToPackageInfo } from "@/lib/utils";

export async function generateInventoryExcel(
  report: InventoryRequest,
  forDownload = true
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Inventario");
  const timeZone = "America/Hermosillo";
  const packages = mapToPackageInfo(report.shipments, report.chargeShipments);
  const currentDate = new Date();

  // === ENCABEZADO GENERAL ===
  const titleRow = sheet.addRow([`📦 Inventario`]);
  sheet.mergeCells(`A${titleRow.number}:I${titleRow.number}`);
  titleRow.font = { size: 16, bold: true, color: { argb: "FFFFFF" } };
  titleRow.alignment = { vertical: "middle", horizontal: "center" };

  for (let col = 1; col <= 9; col++) {
    sheet.getCell(titleRow.number, col).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "ef883a" },
    };
  }

  sheet.addRow([]);
  sheet.addRow([`Sucursal: ${report.subsidiary.name}`]);

  const createdAt = format(
    toZonedTime(new Date(report.inventoryDate), timeZone),
    "yyyy-MM-dd HH:mm"
  );
  sheet.addRow([`Fecha: ${createdAt}`]);
  sheet.addRow([`Paquetes: ${packages.length}`]);
  sheet.addRow([]);

  // === ENCABEZADO DE COLUMNAS ===
  const headerRow = sheet.addRow([
    "No.",
    "Guía",
    "Nombre",
    "Dirección",
    "CP",
    "Cobro",
    "Fecha",
    "Hora",
    "Celular",
  ]);
  headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  for (let col = 1; col <= 9; col++) {
    sheet.getCell(headerRow.number, col).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "8c5e4e" },
    };
    sheet.getCell(headerRow.number, col).border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
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
      pkg.recipientZip ?? "",
      pkg.payment ? `${pkg.payment.type} $${pkg.payment.amount}` : "",
      commitDate,
      commitTime,
      pkg.recipientPhone || "",
    ]);

    // Filas alternadas en gris
    if (index % 2 === 0) {
      for (let col = 1; col <= 9; col++) {
        sheet.getCell(row.number, col).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F2F2F2" },
        };
      }
    }

    // Bordes y centrado
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
    });
  });

  // === Missing / UnScanned ===
  if (report.missingTrackings?.length > 0) {
    sheet.addRow([]);
    const title = sheet.addRow(["❌ Missing Trackings"]);
    sheet.mergeCells(`A${title.number}:I${title.number}`);
    title.font = { bold: true, color: { argb: "FFFFFF" } };
    title.alignment = { vertical: "middle", horizontal: "left" };

    for (let col = 1; col <= 9; col++) {
      sheet.getCell(title.number, col).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "ef883a" },
      };
    }

    report.missingTrackings.forEach((trk) => {
      const row = sheet.addRow([trk]);
      sheet.mergeCells(`A${row.number}:I${row.number}`);
      row.alignment = { vertical: "middle", horizontal: "left" };
    });
  }

  if (report.unScannedTrackings?.length > 0) {
    sheet.addRow([]);
    const title = sheet.addRow(["📍 UnScanned Trackings"]);
    sheet.mergeCells(`A${title.number}:I${title.number}`);
    title.font = { bold: true, color: { argb: "FFFFFF" } };
    title.alignment = { vertical: "middle", horizontal: "left" };

    for (let col = 1; col <= 9; col++) {
      sheet.getCell(title.number, col).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "8c5e4e" },
      };
    }

    report.unScannedTrackings.forEach((trk) => {
      const row = sheet.addRow([trk]);
      sheet.mergeCells(`A${row.number}:I${row.number}`);
      row.alignment = { vertical: "middle", horizontal: "left" };
    });
  }

  // === AJUSTE DE COLUMNAS ===
  sheet.getColumn(1).width = 5;   // No.
  sheet.getColumn(2).width = 18;  // Guía
  sheet.getColumn(3).width = 40;  // Nombre
  sheet.getColumn(4).width = 45;  // Dirección
  sheet.getColumn(5).width = 12;  // CP
  sheet.getColumn(6).width = 20;  // Cobro
  sheet.getColumn(7).width = 12;  // Fecha
  sheet.getColumn(8).width = 12;  // Hora
  sheet.getColumn(9).width = 18;  // Celular

  // === EXPORTACIÓN ===
  const buffer = await workbook.xlsx.writeBuffer();
  if (forDownload) {
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${report.subsidiary.name}--Inventario--${createdAt}.xlsx`
    );
  }

  return buffer;
}
