import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Unloading } from '@/lib/types';
import { format, toZonedTime } from 'date-fns-tz';

export async function generateUnloadingExcelClient(data: Unloading, forDownload = true): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Desembarque');
  const timeZone = 'America/Hermosillo';

  // === ENCABEZADO GENERAL (A:G) ===
  const titleRow = sheet.addRow([`📦 Desembarque`]);
  sheet.mergeCells(`A${titleRow.number}:G${titleRow.number}`);
  titleRow.font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // color institucional (A:G)
  for (let col = 1; col <= 7; col++) {
    sheet.getCell(titleRow.number, col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ef883a' },
    };
  }

  sheet.addRow([]);

  // Unidad
  const row1 = sheet.addRow([`Unidad: ${data?.vehicle?.name ?? ''}`]);
  sheet.mergeCells(`A${row1.number}:G${row1.number}`);

  // Fecha formateada
  const createdAt = format(
    toZonedTime(new Date(data.createdAt), timeZone),
    'yyyy-MM-dd HH:mm'
  );
  const row2 = sheet.addRow([`Fecha: ${createdAt}`]);
  sheet.mergeCells(`A${row2.number}:G${row2.number}`);

  // Paquetes
  const row3 = sheet.addRow([`Paquetes: ${data.shipments.length}`]);
  sheet.mergeCells(`A${row3.number}:G${row3.number}`);

  sheet.addRow([]); // espacio en blanco

  // === ENCABEZADO DE COLUMNAS (A:G) ===
  const headerRow = sheet.addRow([
    'No.',
    'Guía',
    'Dirección',
    'Cobro',
    'Fecha',
    'Hora',
    'Celular',
  ]);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 20;

  // color institucional medio (A:G)
  for (let col = 1; col <= 7; col++) {
    sheet.getCell(headerRow.number, col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '8c5e4e' },
    };
    sheet.getCell(headerRow.number, col).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  // === DATOS (Shipments) ===
  data.shipments.forEach((pkg, index) => {
    const [commitDateRaw, commitTimeRaw] = pkg.commitDateTime.split('T');
    const commitDate = commitDateRaw;
    const commitTime = commitTimeRaw?.split('.')[0];

    const row = sheet.addRow([
      index + 1,
      pkg.trackingNumber,
      pkg.recipientAddress || '',
      pkg.payment?.amount != null
        ? `${pkg.payment?.type} $${pkg.payment.amount.toFixed(2)}`
        : '',
      commitDate || '',
      commitTime || '',
      pkg.recipientPhone || '',
    ]);

    // filas alternadas en gris (A:G)
    if (index % 2 === 0) {
      for (let col = 1; col <= 7; col++) {
        sheet.getCell(row.number, col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F2F2F2' },
        };
      }
    }

    // bordes y centrado
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
    });
  });

  // === Missing Trackings ===
  if (data.missingTrackings.length > 0) {
    sheet.addRow([]);
    const title = sheet.addRow(['❌ Missing Trackings']);
    sheet.mergeCells(`A${title.number}:G${title.number}`);
    title.font = { bold: true, color: { argb: 'FFFFFF' } };
    title.alignment = { vertical: 'middle', horizontal: 'left' };

    for (let col = 1; col <= 7; col++) {
      sheet.getCell(title.number, col).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'ef883a' },
      };
    }

    data.missingTrackings.forEach((trk) => {
      const row = sheet.addRow([trk]);
      sheet.mergeCells(`A${row.number}:G${row.number}`);
      row.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  }

  // === UnScanned Trackings ===
  if (data.unScannedTrackings.length > 0) {
    sheet.addRow([]);
    const title = sheet.addRow(['📍 UnScanned Trackings']);
    sheet.mergeCells(`A${title.number}:G${title.number}`);
    title.font = { bold: true, color: { argb: 'FFFFFF' } };
    title.alignment = { vertical: 'middle', horizontal: 'left' };

    for (let col = 1; col <= 7; col++) {
      sheet.getCell(title.number, col).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '8c5e4e' },
      };
    }

    data.unScannedTrackings.forEach((trk) => {
      const row = sheet.addRow([trk]);
      sheet.mergeCells(`A${row.number}:G${row.number}`);
      row.alignment = { vertical: 'middle', horizontal: 'left' };
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
  sheet.getColumn(1).width = 5;   // No.
  sheet.getColumn(2).width = 18;  // Guía
  sheet.getColumn(3).width = 45;  // Dirección
  sheet.getColumn(4).width = 20;  // Cobro
  sheet.getColumn(5).width = 12;  // Fecha
  sheet.getColumn(6).width = 12;  // Hora
  sheet.getColumn(7).width = 18;  // Celular

  // Generar el buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Opcional: descargar el archivo si se solicita
  if (forDownload) {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    
    saveAs(blob, `${data?.subsidiary?.name}--Desembarque--${createdAt.replace(/\//g, "-")}.xlsx`);
  }

  return buffer;
}