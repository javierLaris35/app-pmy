import { Collection, Devolution } from '@/lib/types';
import { STATUS_TO_DEX_CODE } from '@/utils/shipment-status.utils';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

function getStatusCode(status: string | undefined | null): string {
  if (!status) return "";
  const cleanStatus = status.trim().toUpperCase();
  if (STATUS_TO_DEX_CODE[cleanStatus]) return STATUS_TO_DEX_CODE[cleanStatus];
  for (const [key, value] of Object.entries(STATUS_TO_DEX_CODE)) {
    if (cleanStatus.includes(key.toUpperCase()) || key.toUpperCase().includes(cleanStatus)) return value;
  }
  return status || "";
}

export async function generateFedExExcel(
  collections: Collection[],
  devolutions: Devolution[],
  subsidiaryName: string,
  charges: any[] = [],
  forDownload = true
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte');

  // --- 1. CONFIGURACIÓN DE COLUMNAS (Indispensable definirlo al inicio) ---
  worksheet.columns = [
    { header: '', key: 'colA', width: 8 },
    { header: '', key: 'colB', width: 25 },
    { header: '', key: 'colC', width: 25 },
    { header: '', key: 'colD', width: 5 },
    { header: '', key: 'colE', width: 5 },
    { header: '', key: 'colF', width: 25 },
    { header: '', key: 'colG', width: 18 },
    { header: '', key: 'colH', width: 8 },
  ];

  // --- 2. ENCABEZADO ---
  const currentDate = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'FedEx - Devoluciones y Recolecciones';
  titleCell.style = {
    font: { size: 16, bold: true, color: { argb: 'FFFFFF' } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '662D91' } }
  };

  worksheet.mergeCells('A2:H2');
  worksheet.getCell('A2').value = `LOCALIDAD: ${subsidiaryName.toUpperCase()}`;
  worksheet.getCell('A2').alignment = { horizontal: 'center' };
  worksheet.getCell('A2').font = { bold: true, size: 12 };

  worksheet.mergeCells('A3:H3');
  worksheet.getCell('A3').value = currentDate;
  worksheet.getCell('A3').alignment = { horizontal: 'center' };

  // --- 3. RESUMEN (Simplificado para evitar errores de solapamiento) ---
  const totalColl = collections.length;
  const totalDev = devolutions.length;

  worksheet.getRow(5).getCell(1).value = 'TOTAL RECOLECCIONES:';
  worksheet.getRow(5).getCell(2).value = totalColl;
  worksheet.getRow(5).getCell(3).value = 'TOTAL DEVOLUCIONES:';
  worksheet.getRow(5).getCell(4).value = totalDev;
  worksheet.getRow(5).getCell(6).value = 'TOTAL GENERAL:';
  worksheet.getRow(5).getCell(7).value = totalColl + totalDev;
  worksheet.getRow(5).font = { bold: true };

  // --- 4. TABLAS (Lógica de espejo) ---
  const startRow = 7;
  
  // Headers de sección
  worksheet.mergeCells(`A${startRow}:C${startRow}`);
  const hDev = worksheet.getCell(`A${startRow}`);
  hDev.value = 'DEVOLUCIONES';
  hDev.style = { font: { color: { argb: 'FFFFFF' }, bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '662D91' } }, alignment: { horizontal: 'center' } };

  worksheet.mergeCells(`F${startRow}:H${startRow}`);
  const hColl = worksheet.getCell(`F${startRow}`);
  hColl.value = 'RECOLECCIONES';
  hColl.style = { font: { color: { argb: 'FFFFFF' }, bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6600' } }, alignment: { horizontal: 'center' } };

  // Headers de columnas
  const hRow = worksheet.getRow(startRow + 1);
  hRow.getCell(1).value = 'No.'; hRow.getCell(2).value = 'GUIA'; hRow.getCell(3).value = 'MOTIVO';
  hRow.getCell(6).value = 'GUIA'; hRow.getCell(7).value = 'SUCURSAL'; hRow.getCell(8).value = 'No.';
  hRow.font = { bold: true, size: 9 };

  // Datos
  const maxData = Math.max(devolutions.length, collections.length);
  const alternateFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'F9F9F9' } };
  const borderStyle: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'D3D3D3' } };

  for (let i = 0; i < maxData; i++) {
    const row = worksheet.getRow(startRow + 2 + i);
    const isEven = i % 2 === 0;

    // Devoluciones
    if (devolutions[i]) {
      const status = getStatusCode(devolutions[i].status);
      row.getCell(1).value = i + 1;
      row.getCell(2).value = String(devolutions[i].trackingNumber);
      row.getCell(3).value = status;
      if (status.includes('DEX')) row.getCell(3).font = { color: { argb: 'FF0000' }, bold: true };
    }

    // Recolecciones
    if (collections[i]) {
      row.getCell(6).value = String(collections[i].trackingNumber);
      row.getCell(7).value = subsidiaryName.substring(0, 3).toUpperCase();
      row.getCell(8).value = i + 1;
    }

    // Aplicar estilos solo a celdas con datos
    [1, 2, 3, 6, 7, 8].forEach(c => {
      const cell = row.getCell(c);
      cell.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };
      if (isEven) cell.fill = alternateFill;
      cell.alignment = { horizontal: 'center' };
    });
  }

  // --- 5. LEYENDA DEX (Calculada dinámicamente) ---
  const legendRowPos = startRow + 2 + maxData + 2;
  const dexItems = [
    'DEX 03: DATOS INCORRECTOS / DOM NO EXISTE',
    'DEX 07: RECHAZO DE PAQUETES POR EL CLIENTE',
    'DEX 08: VISITA / DOMICILIO CERRADO',
    'DEX 17: CAMBIO DE FECHA SOLICITADO'
  ];

  dexItems.forEach((text, index) => {
    const row = worksheet.getRow(legendRowPos + index);
    worksheet.mergeCells(`A${row.number}:H${row.number}`);
    row.getCell(1).value = text;
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(1).font = { size: 9, italic: true };
  });

  // --- 6. FINALIZAR ---
  // Forzar formato texto en columnas de guías
  worksheet.getColumn(2).numFmt = '@';
  worksheet.getColumn(6).numFmt = '@';

  const buffer = await workbook.xlsx.writeBuffer();
  if (forDownload) {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `FedEx_${subsidiaryName}_${currentDate.replace(/\//g, '-')}.xlsx`);
  }
  return buffer;
}