import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PackageDispatch } from '@/lib/types';
import { format, toZonedTime } from 'date-fns-tz';

export async function generateDispatchExcelClient(data: PackageDispatch) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Despacho');
  const timeZone = 'America/Hermosillo';

  // Encabezado general
  const row0  = sheet.addRow([`Salida a Ruta`])
   
  const row1 = sheet.addRow([`Ruta: ${data.routes.map((r) => r.name).join(' -> ')}`]);
  sheet.mergeCells(`A${row1.number}:E${row1.number}`);

  // Conductores
  const row2 = sheet.addRow([`Conductores: ${data.drivers.map((d) => d.name).join(' - ')}`]);
  sheet.mergeCells(`A${row2.number}:E${row2.number}`);

  // Unidad
  const row3 = sheet.addRow([`Unidad: ${data.vehicle.name}`]);
  sheet.mergeCells(`A${row3.number}:E${row3.number}`);

  // Fecha
  const row4 = sheet.addRow([`Fecha: ${data.createdAt}`]);
  sheet.mergeCells(`A${row4.number}:E${row4.number}`);

  // Paquetes
  const row5 = sheet.addRow([`Paquetes: ${data.shipments.length}`]);
  sheet.mergeCells(`A${row5.number}:E${row5.number}`);

  // Espacio en blanco
  sheet.addRow([]);

  // Encabezado de columnas
  sheet.addRow([
    'No.',
    'Guía',
    'Recibe',
    'Dirección',
    'Cobro',
    'Fecha',
    'Hora',
    'Celular',
  ]);
  sheet.getRow(7).font = { bold: true };

  // Datos
  data.shipments.forEach((pkg, index) => {
    const [commitDateRaw, commitTimeRaw] = pkg.commitDateTime.split('T');
    const commitDate = commitDateRaw; // '2025-08-05'
    const commitTime = commitTimeRaw?.split('.')[0];

    sheet.addRow([
      index,
      pkg.trackingNumber,
      pkg.recipientName || '',
      pkg.recipientAddress || '',
      pkg.payment?.amount != null ? `$${pkg.payment.amount.toFixed(2)}` : '',
      commitDate || '',
      commitTime || '',
      pkg.recipientPhone || '',
    ]);
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

  sheet.getColumn('A').width = 5;

  // Crear archivo y descargar
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  saveAs(blob, `Salida_a_Ruta-${data.createdAt}.xlsx`);
}
