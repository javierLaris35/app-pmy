import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PackageDispatch, PackageInfo } from '@/lib/types';
import { format, toZonedTime } from 'date-fns-tz';
import { mapToPackageInfo } from '@/lib/utils';
import { sortByZip } from '@/lib/tracking/sort-by-zip';

export async function generateDispatchExcelClient(
  data: PackageDispatch,
  invalidPackages?: string[],
  forDownload = true,
  sortByPostalCode = true,
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Despacho');
  const timeZone = 'America/Hermosillo';
  // Orden: por código postal (recipientZip) si la sucursal lo configura; si no,
  // se conserva el orden en que se escanearon los paquetes.
  const mapped = mapToPackageInfo(data.shipments, data.chargeShipments);
  const packages: PackageInfo[] = sortByPostalCode ? sortByZip(mapped) : mapped;

  // === ENCABEZADO GENERAL (A:I) ===
  const titleRow = sheet.addRow([`🚚 Salida a Ruta`]);
  sheet.mergeCells(`A${titleRow.number}:I${titleRow.number}`);
  titleRow.font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // color institucional (A:I)
  for (let col = 1; col <= 9; col++) {
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
  const row5 = sheet.addRow([`Paquetes: ${packages.length}`]);
  sheet.mergeCells(`A${row5.number}:E${row5.number}`);

  // === SECCIÓN DE GUÍAS INVÁLIDAS (si existen) ===
  if (invalidPackages && invalidPackages.length > 0) {
    sheet.addRow([]); // Espacio en blanco
    
    const invalidTitleRow = sheet.addRow([`❌ Guías Inválidas (${invalidPackages.length})`]);
    sheet.mergeCells(`A${invalidTitleRow.number}:I${invalidTitleRow.number}`);
    invalidTitleRow.font = { size: 12, bold: true, color: { argb: 'FFFFFF' } };
    invalidTitleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Color rojo para el título de guías inválidas
    for (let col = 1; col <= 9; col++) {
      sheet.getCell(invalidTitleRow.number, col).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0000' },
      };
    }

    // Agrupar guías inválidas en filas para mejor presentación
    const maxGuidesPerRow = 6; // Máximo de guías por fila
    for (let i = 0; i < invalidPackages.length; i += maxGuidesPerRow) {
      const chunk = invalidPackages.slice(i, i + maxGuidesPerRow);
      const invalidRow = sheet.addRow([]);
      
      // Combinar celdas para esta fila de guías inválidas
      sheet.mergeCells(`A${invalidRow.number}:I${invalidRow.number}`);
      
      const guidesText = chunk.map(tracking => `📦 ${tracking}`).join('    ');
      sheet.getCell(`A${invalidRow.number}`).value = guidesText;
      sheet.getCell(`A${invalidRow.number}`).font = { bold: true, color: { argb: 'CC0000' } };
      sheet.getCell(`A${invalidRow.number}`).alignment = { vertical: 'middle', horizontal: 'left' };
      
      // Fondo rojo claro para las filas de guías inválidas
      for (let col = 1; col <= 9; col++) {
        sheet.getCell(invalidRow.number, col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6E6' },
        };
      }
    }

    sheet.addRow([]); // Espacio en blanco después de las guías inválidas
  }

  // Encabezado de columnas
  const headerRow = sheet.addRow([
    'No.',
    'Guía',
    'Recibe',
    'Dirección',
    'CP', // Nueva columna de Código Postal
    'Cobro',
    'Fecha',
    'Hora',
    'Celular',
  ]);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 20;

  // color institucional medio (A:I)
  for (let col = 1; col <= 9; col++) {
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
  packages.forEach((pkg, index) => {
    const zonedDate = toZonedTime(new Date(pkg.commitDateTime), timeZone);
    const commitDate = format(zonedDate, "yyyy-MM-dd");
    const commitTime = format(zonedDate, "HH:mm:ss");
    const hasPayment = pkg.payment?.amount != null;

    console.log("🚀 ~ generateDispatchExcelClient ~ hasPayment:", hasPayment);

    const row = sheet.addRow([
      index + 1,
      pkg.trackingNumber,
      pkg.recipientName || '',
      pkg.recipientAddress || '',
      pkg.recipientZip || '', // Nueva columna de Código Postal
      hasPayment ? `${pkg.payment?.type} $ ${pkg.payment?.amount}` : '',
      commitDate || '',
      commitTime || '',
      pkg.recipientPhone || '',
    ]);

    if (index % 2 === 0) {
      for (let col = 1; col <= 9; col++) {
        sheet.getCell(row.number, col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F2F2F2' },
        };
      }
    }

    // Color para filas con pago (amarillo suave)
    if (hasPayment) {
      for (let col = 1; col <= 9; col++) {
        sheet.getCell(row.number, col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'fff2cc' }, // Amarillo claro
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

  // Ajustes manuales de ancho de columnas
  sheet.getColumn(1).width = 5;   // No.
  sheet.getColumn(2).width = 18;  // Guía
  sheet.getColumn(3).width = 30;  // Recibe (reducido de 35)
  sheet.getColumn(4).width = 40;  // Dirección (reducido de 45)
  sheet.getColumn(5).width = 10;  // CP (nueva columna)
  sheet.getColumn(6).width = 18;  // Cobro (reducido de 20)
  sheet.getColumn(7).width = 12;  // Fecha
  sheet.getColumn(8).width = 12;  // Hora
  sheet.getColumn(9).width = 18;  // Celular

  // Crear archivo y descargar
  const buffer = await workbook.xlsx.writeBuffer();

  if(forDownload) {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(blob, `${data?.drivers[0]?.name.toUpperCase()}--${data?.subsidiary?.name}--Salida a Ruta--${createdAt.replace(/\//g, "-")}.xlsx`);
  }

  return buffer;
}