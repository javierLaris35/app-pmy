import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PackageDispatch } from '@/lib/types';
import { format, toZonedTime } from 'date-fns-tz';

export async function generateDispatchExcelClient(data: PackageDispatch, forDownload = true) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Despacho');
  const timeZone = 'America/Hermosillo';

 // === ENCABEZADO GENERAL (A:G) ===
  const titleRow = sheet.addRow([`🚚 Salida a Ruta`]);
  sheet.mergeCells(`A${titleRow.number}:H${titleRow.number}`);
  titleRow.font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // color institucional (A:G)
  for (let col = 1; col <= 8; col++) {
    sheet.getCell(titleRow.number, col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ef883a' },
    };
  }

  sheet.addRow([]);

  // Fecha formateada
  const createdAt = format(
    toZonedTime(new Date(data.createdAt), timeZone),
    'yyyy-MM-dd HH:mm'
  );
   
  const row1 = sheet.addRow([`Ruta: ${data.routes.map((r) => r.name).join(' -> ')}`]);
  sheet.mergeCells(`A${row1.number}:E${row1.number}`);

  // Conductores
  const row2 = sheet.addRow([`Conductores: ${data.drivers.map((d) => d.name).join(' - ')}`]);
  sheet.mergeCells(`A${row2.number}:E${row2.number}`);

  // Unidad
  const row3 = sheet.addRow([`Unidad: ${data.vehicle.name}`]);
  sheet.mergeCells(`A${row3.number}:E${row3.number}`);

  // Fecha
  const row4 = sheet.addRow([`Fecha: ${createdAt}`]);
  sheet.mergeCells(`A${row4.number}:E${row4.number}`);

  // Paquetes
  const row5 = sheet.addRow([`Paquetes: ${data.shipments.length}`]);
  sheet.mergeCells(`A${row5.number}:E${row5.number}`);

  // Espacio en blanco
  sheet.addRow([]);

  // Encabezado de columnas
  const headerRow = sheet.addRow([
    'No.',
    'Guía',
    'Recibe',
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
  for (let col = 1; col <= 8; col++) {
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

  // Datos
  data.shipments.forEach((pkg, index) => {
    const [commitDateRaw, commitTimeRaw] = pkg.commitDateTime.split('T');
    const commitDate = commitDateRaw; // '2025-08-05'
    const commitTime = commitTimeRaw?.split('.')[0];

    const row = sheet.addRow([
      index + 1,
      pkg.trackingNumber,
      pkg.recipientName || '',
      pkg.recipientAddress || '',
      pkg.payment?.amount != null ? `$${pkg.payment.amount.toFixed(2)}` : '',
      commitDate || '',
      commitTime || '',
      pkg.recipientPhone || '',
    ]);

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

  // Auto ajustar columnas
  sheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value?.toString().length || 0;
      if (len > maxLength) {
        maxLength = len;
      }
    });
    column.width = maxLength + 2;
  });

  sheet.getColumn(1).width = 5;   // No.
  sheet.getColumn(2).width = 18;  // Guía
  sheet.getColumn(3).width = 35;  // Dirección
  sheet.getColumn(4).width = 45;  // Dirección
  sheet.getColumn(5).width = 20;  // Cobro
  sheet.getColumn(6).width = 12;  // Fecha
  sheet.getColumn(7).width = 12;  // Hora
  sheet.getColumn(8).width = 18;  // Celular

  // Crear archivo y descargar
  const buffer = await workbook.xlsx.writeBuffer();

  if(forDownload) {
    const blob = new Blob([buffer], {
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(blob, `${data?.subsidiary?.name}--Salida a Ruta--${createdAt.replace(/\//g, "-")}.xlsx`);
  }

  return buffer;
}
