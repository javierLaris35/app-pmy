import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Unloading } from "@/lib/types";
import { format, toZonedTime } from "date-fns-tz";

export async function generateUnloadingExcelClient(
  data: Unloading,
  forDownload = true
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Desembarque");
  const timeZone = "America/Hermosillo";

  // === ENCABEZADO GENERAL (A:I) ===
  const titleRow = sheet.addRow([`📦 Desembarque`]);
  sheet.mergeCells(`A${titleRow.number}:I${titleRow.number}`);
  titleRow.font = { size: 16, bold: true, color: { argb: "FFFFFF" } };
  titleRow.alignment = { vertical: "middle", horizontal: "center" };

  // color institucional (A:I)
  for (let col = 1; col <= 9; col++) {
    sheet.getCell(titleRow.number, col).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "ef883a" },
    };
  }

  sheet.addRow([]);

  // Unidad
  const row1 = sheet.addRow([`Unidad: ${data?.vehicle?.name ?? ""}`]);
  sheet.mergeCells(`A${row1.number}:I${row1.number}`);

  // Fecha formateada
  const createdAt = format(
    toZonedTime(new Date(data.createdAt), timeZone),
    "dd/MM/yyyy HH:mm"
  );
  const row2 = sheet.addRow([`Fecha: ${createdAt}`]);
  sheet.mergeCells(`A${row2.number}:I${row2.number}`);

  // Paquetes
  const row3 = sheet.addRow([`Paquetes: ${data.shipments.length}`]);
  sheet.mergeCells(`A${row3.number}:I${row3.number}`);

  sheet.addRow([]); // espacio en blanco

  // === ENCABEZADO DE COLUMNAS (A:I) ===
  const headerRow = sheet.addRow([
    "No.",
    "Guía",
    "Nombre",
    "Dirección",
    "C.P.",
    "Cobro",
    "Fecha",
    "Hora",
    "Celular",
  ]);
  headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 20;

  // color institucional medio (A:I)
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

  // === DATOS (Shipments) ===
  data.shipments.forEach((pkg, index) => {
    const zonedDate = toZonedTime(new Date(pkg.commitDateTime), timeZone);
    const commitDate = format(zonedDate, "dd/MM/yyyy");
    const commitTime = format(zonedDate, "HH:mm:ss");

    const row = sheet.addRow([
      index + 1,
      pkg.trackingNumber,
      pkg.recipientName,
      pkg.recipientAddress || "",
      pkg.recipientZip || "",
      pkg.payment?.amount != null
        ? `${pkg.payment?.type} ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(pkg.payment.amount)}`
        : "",
      commitDate || "",
      commitTime || "",
      pkg.recipientPhone || "",
    ]);

    // filas alternadas en gris (A:I)
    if (index % 2 === 0) {
      for (let col = 1; col <= 9; col++) {
        sheet.getCell(row.number, col).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F2F2F2" },
        };
      }
    }

    // bordes y centrado
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

  // === Missing Trackings ===
  if (data.missingTrackings.length > 0) {
    sheet.addRow([]);
    const title = sheet.addRow(["❌ Paquetes faltantes"]);
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

    data.missingTrackings.forEach((trk) => {
      const row = sheet.addRow([trk]);
      sheet.mergeCells(`A${row.number}:I${row.number}`);
      row.alignment = { vertical: "middle", horizontal: "left" };
    });
  }

  // === UnScanned Trackings ===
  if (data.unScannedTrackings.length > 0) {
    sheet.addRow([]);
    const title = sheet.addRow(["📍 Guías sobrantes"]);
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

    data.unScannedTrackings.forEach((trk) => {
      const row = sheet.addRow([trk]);
      sheet.mergeCells(`A${row.number}:I${row.number}`);
      row.alignment = { vertical: "middle", horizontal: "left" };
    });
  }

  // === AJUSTE DE COLUMNAS ===
  sheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value?.toString().length || 0;
      if (len > maxLength) maxLength = len;
    });
    column.width = maxLength + 2;
  });

  // ajustes manuales
  sheet.getColumn(1).width = 5; // No.
  sheet.getColumn(2).width = 18; // Guía
  sheet.getColumn(3).width = 45; // Nombre
  sheet.getColumn(4).width = 45; // Dirección
  sheet.getColumn(5).width = 12; // C.P.
  sheet.getColumn(6).width = 20; // Cobro
  sheet.getColumn(7).width = 12; // Fecha
  sheet.getColumn(8).width = 12; // Hora
  sheet.getColumn(9).width = 18; // Celular

  // === GENERAR BUFFER ===
  const buffer = await workbook.xlsx.writeBuffer();

  // === DESCARGA OPCIONAL ===
  if (forDownload) {
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(
      blob,
      `${data?.subsidiary?.name}--Desembarque--${createdAt.replace(/\//g, "-")}.xlsx`
    );
  }

  return buffer;
}
