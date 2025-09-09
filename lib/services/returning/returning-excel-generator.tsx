import { Charge, Collection, Devolution } from '@/lib/types';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Enhanced status to DEX code mapping
const STATUS_TO_DEX_CODE: Record<string, string> = {
  "03": "DEX03",
  "07": "DEX07",
  "08": "DEX08",
  "12": "DEX12",
  "GF": "GUIA FRAUDE",
  DEX03: "DEX03",
  DEX07: "DEX07",
  DEX08: "DEX08",
  NO_ENTREGADO: "DEX03",
  RECHAZADO: "DEX07",
  PENDIENTE: "DEX08",
  ENTREGADO: "",
  "DATOS INCORRECTOS": "DEX03",
  "RECHAZO DE PAQUETES": "DEX07",
  "DOMICILIO CERRADO": "DEX08",
  "VISITA FALLIDA": "DEX08",
};

function getStatusCode(status: string): string {
  const cleanStatus = status.trim().toUpperCase();
  
  if (STATUS_TO_DEX_CODE[cleanStatus]) {
    return STATUS_TO_DEX_CODE[cleanStatus];
  }

  for (const [key, value] of Object.entries(STATUS_TO_DEX_CODE)) {
    if (cleanStatus.includes(key.toUpperCase()) || key.toUpperCase().includes(cleanStatus)) {
      return value;
    }
  }

  return status || "";
}

export async function generateFedExExcel(
  collections: Collection[],
  devolutions: Devolution[],
  subsidiaryName: string,
  charges: Charge[] = [],
  forDownload = true
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Devoluciones y Recolecciones');

  // === ESTILOS ===
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    fill: {
      type: 'pattern' as 'pattern',
      pattern: 'solid' as 'solid',
      fgColor: { argb: 'ef883a' },
    }
    // Sin border aquí
  };

  const subHeaderStyle = {
    font: { bold: true, color: { argb: 'FFFFFF' }, size: 10 },
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    fill: {
      type: 'pattern' as 'pattern',
      pattern: 'solid' as 'solid',
      fgColor: { argb: '8c5e4e' },
    },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
  };

  // Estilo para headers del resumen SIN bordes
  const summarySubHeaderStyle = {
    font: { bold: true, color: { argb: 'FFFFFF' }, size: 10 },
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    fill: {
      type: 'pattern' as 'pattern',
      pattern: 'solid' as 'solid',
      fgColor: { argb: '8c5e4e' },
    }
    // Sin border
  };

  const purpleHeaderStyle = {
    ...subHeaderStyle,
    fill: { ...subHeaderStyle.fill, fgColor: { argb: '662D91' } }
  };

  const orangeHeaderStyle = {
    ...subHeaderStyle,
    fill: { ...subHeaderStyle.fill, fgColor: { argb: 'FF6600' } }
  };

  const greenHeaderStyle = {
    ...subHeaderStyle,
    fill: { ...subHeaderStyle.fill, fgColor: { argb: '008000' } }
  };

  const dataCellStyle = {
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
  };

  const alternateFill = {
    type: 'pattern' as 'pattern',
    pattern: 'solid' as 'solid',
    fgColor: { argb: 'F2F2F2' },
  };

  // === ENCABEZADO PRINCIPAL ===
  const currentDate = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Logo y título
  worksheet.mergeCells('A1:H1');
  const titleRow = worksheet.getCell('A1');
  titleRow.value = 'FedEx - Devoluciones y Recolecciones';
  titleRow.style = {
    font: { size: 16, bold: true, color: { argb: 'FFFFFF' } },
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '662D91' },
    }
  };

  // Información de la subsidiaria
  worksheet.mergeCells('A2:H2');
  const subsidiaryCell = worksheet.getCell('A2');
  subsidiaryCell.value = `LOCALIDAD: ${subsidiaryName.toUpperCase()}`;
  subsidiaryCell.style = { 
    font: { bold: true, size: 14 }, 
    alignment: { horizontal: 'center', wrapText: true }
  };

  worksheet.mergeCells('A3:H3');
  const subtitleCell = worksheet.getCell('A3');
  subtitleCell.value = 'DEVOLUCIONES Y RECOLECCIONES';
  subtitleCell.style = { 
    font: { size: 14 }, 
    alignment: { horizontal: 'center', wrapText: true }
  };

  // Fecha
  worksheet.mergeCells('A4:H4');
  const dateCell = worksheet.getCell('A4');
  dateCell.value = currentDate;
  dateCell.style = { 
    font: { bold: true }, 
    alignment: { horizontal: 'center', wrapText: true }
  };

  // Espacio
  worksheet.addRow([]);

  // === RESUMEN DE PAQUETES ===
  worksheet.mergeCells('A6:H6');
  const summaryTitle = worksheet.getCell('A6');
  summaryTitle.value = 'RESUMEN DE PAQUETES';
  summaryTitle.style = headerStyle;

  // Calcular totales
  const totalCollectionPackages = collections.length;
  const totalDevolutionPackages = devolutions.length;
  const totalPackages = totalDevolutionPackages + totalCollectionPackages;

  // Tabla de resumen - SOLO 3 TOTALES
  const summaryHeaders = worksheet.addRow([
    'TOTAL RECOLECCIONES', '', 'TOTAL DEVOLUCIONES', '', 'TOTAL PAQUETES', '', '', ''
  ]);
  
  const summaryValues = worksheet.addRow([
    totalCollectionPackages, '', totalDevolutionPackages, '', totalPackages, '', '', ''
  ]);

  // Aplicar estilos a la tabla de resumen (SIN BORDES)
  for (let col = 1; col <= 5; col += 2) {
    if (col <= 5) {
      // Merge y estilo para headers SIN bordes
      worksheet.mergeCells(7, col, 7, col + 1);
      const headerCell = worksheet.getCell(7, col);
      headerCell.style = summarySubHeaderStyle;
      
      // Merge y estilo para valores SIN bordes
      worksheet.mergeCells(8, col, 8, col + 1);
      const valueCell = worksheet.getCell(8, col);
      valueCell.style = {
        alignment: { horizontal: 'center', wrapText: true },
        font: { bold: true, size: 12 },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F2F2F2' },
        }
        // Sin border
      };
      
      // Asegurar que las celdas merged no tengan border
      headerCell.border = undefined;
      valueCell.border = undefined;
    }
  }

  // Espacio
  worksheet.addRow([]);

  // === DEVOLUCIONES (LADO IZQUIERDO: Columnas A-D) ===
  const devolutionStartRow = 10;
  
  worksheet.mergeCells(`A${devolutionStartRow}:D${devolutionStartRow}`);
  const devolutionTitle = worksheet.getCell(`A${devolutionStartRow}`);
  devolutionTitle.value = 'DEVOLUCION (Envío no entregado)';
  devolutionTitle.style = purpleHeaderStyle;

  // Encabezados de tabla de devoluciones
  const devolutionHeaders = worksheet.addRow(['No.', 'NO. GUIA', 'MOTIVO', '']);
  devolutionHeaders.splice(4); // Evitar sobrescribir E-H
  
  // Aplicar estilo a los encabezados (CON BORDES)
  for (let col = 1; col <= 4; col++) {
    const cell = worksheet.getCell(devolutionHeaders.number, col);
    cell.style = subHeaderStyle;
  }

  // Datos de devoluciones
  devolutions.forEach((devolution, index) => {
    const statusCode = getStatusCode(devolution.status);
    const row = worksheet.addRow([
      index + 1,
      devolution.trackingNumber,
      statusCode,
      ''
    ]);

    // Estilo alternado para filas
    const isEven = index % 2 === 0;
    for (let col = 1; col <= 4; col++) {
      const cell = worksheet.getCell(row.number, col);
      cell.style = { ...dataCellStyle };
      if (isEven) {
        cell.fill = alternateFill;
      }
    }

    // Color rojo para códigos DEX
    if (statusCode.includes('DEX') || statusCode.includes('GUIA FRAUDE')) {
      worksheet.getCell(row.number, 3).font = { color: { argb: 'FF0000' }, bold: true };
    }
  });

  // === RECOLECCIONES (LADO DERECHO: Columnas E-H) ===
  const collectionStartRow = devolutionStartRow;
  
  worksheet.mergeCells(`E${collectionStartRow}:H${collectionStartRow}`);
  const collectionTitle = worksheet.getCell(`E${collectionStartRow}`);
  collectionTitle.value = 'RECOLECCIONES';
  collectionTitle.style = orangeHeaderStyle;

  // Encabezados de tabla de recolecciones
  const collectionHeadersRow = devolutionHeaders.number;
  worksheet.getRow(collectionHeadersRow).getCell(6).value = 'NO. GUIA';
  worksheet.getRow(collectionHeadersRow).getCell(7).value = 'SUCURSAL';
  worksheet.getRow(collectionHeadersRow).getCell(8).value = 'No.';
  
  // Aplicar estilo a los encabezados (CON BORDES)
  for (let col = 5; col <= 8; col++) {
    const cell = worksheet.getCell(collectionHeadersRow, col);
    cell.style = subHeaderStyle;
  }

  // Datos de recolecciones
  collections.forEach((collection, index) => {
    const rowNumber = collectionHeadersRow + 1 + index;
    
    if (!worksheet.getRow(rowNumber)) {
      worksheet.addRow([]);
    }
    
    const row = worksheet.getRow(rowNumber);
    row.getCell(6).value = collection.trackingNumber;
    row.getCell(7).value = subsidiaryName.substring(0, 3).toUpperCase();
    row.getCell(8).value = index + 1;

    // Estilo alternado para filas
    const isEven = index % 2 === 0;
    for (let col = 5; col <= 8; col++) {
      const cell = worksheet.getCell(rowNumber, col);
      cell.style = { ...dataCellStyle };
      if (isEven) {
        cell.fill = alternateFill;
      }
    }
  });

  // === LEYENDA DE CÓDIGOS DEX ===
  // Considerar la lista más grande (devolutions o collections) y sumar 2 para el espacio
  const maxLength = Math.max(devolutions.length, collections.length);
  const headersRow = devolutionHeaders.number;
  const legendStartRow = headersRow + maxLength + 2; // +1 implícito por header, + maxLength por datos, +2 por espacio

  worksheet.mergeCells(`A${legendStartRow}:H${legendStartRow}`);
  const legendTitle = worksheet.getCell(`A${legendStartRow}`);
  console.log("🚀 ~ generateFedExExcel ~ legendStartRow:", legendStartRow)
  legendTitle.value = 'LEYENDA DE CÓDIGOS DEX';
  legendTitle.style = { 
    font: { bold: true, size: 12 },
    alignment: { horizontal: 'center', wrapText: true },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E6E6E6' },
    }
    // Sin border
  };

  const legend1 = worksheet.addRow(['DEX 03: DATOS INCORRECTOS / DOM NO EXISTE', '', '', '', '', '', '', '']);
  const legend2 = worksheet.addRow(['DEX 07: RECHAZO DE PAQUETES POR EL CLIENTE', '', '', '', '', '', '', '']);
  const legend3 = worksheet.addRow(['DEX 08: VISITA / DOMICILIO CERRADO', '', '', '', '', '', '', '']);
  
  // Combinar celdas de leyenda (SIN BORDES)
  [legend1, legend2, legend3].forEach(row => {
    worksheet.mergeCells(`A${row.number}:H${row.number}`);
    const cell = worksheet.getCell(`A${row.number}`);
    cell.alignment = { horizontal: 'center', wrapText: true };
    cell.style = { font: { size: 10 }, alignment: { wrapText: true } };
    cell.border = undefined; // Asegurar sin bordes
    worksheet.getRow(row.number).height = 25;
  });

  // === AJUSTAR TAMAÑO DE COLUMNAS ===
  worksheet.columns = [
    { width: 8 },    // A: No.
    { width: 22 },   // B: No. GUIA
    { width: 20 },   // C: MOTIVO
    { width: 8 },    // D: Espacio
    { width: 8 },    // E: Espacio
    { width: 22 },   // F: No. GUIA
    { width: 15 },   // G: SUCURSAL
    { width: 8 },    // H: No.
  ];

  // === AJUSTE AUTOMÁTICO DE ALTURAS (SOLO WRAPTEXT, SIN BORDES GLOBALES) ===
  const maxRow = Math.max(worksheet.rowCount, legend3.number + 1);
  for (let rowNum = 1; rowNum <= maxRow; rowNum++) {
    const row = worksheet.getRow(rowNum);
    row.eachCell((cell) => {
      // Solo wrapText, no tocar bordes
      if (!cell.style.alignment) {
        cell.alignment = { wrapText: true };
      } else {
        cell.alignment = { ...cell.style.alignment, wrapText: true };
      }
    });
    // Auto-height para tablas y leyenda
    if (rowNum >= 10 || rowNum >= legendStartRow) {
      row.height = undefined;
    }
  }

  // === GUARDAR ARCHIVO ===
  const buffer = await workbook.xlsx.writeBuffer();

  if (forDownload) {
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    const fileName = `FedEx_Control_${subsidiaryName}_${currentDate.replace(/\//g, "-")}.xlsx`;
    saveAs(blob, fileName);
  }

  return buffer;
}