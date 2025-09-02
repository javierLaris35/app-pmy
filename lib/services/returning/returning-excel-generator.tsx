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
    },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
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
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '662D91' },
    },
  };

  // Información de la subsidiaria
  worksheet.mergeCells('A2:H2');
  const subsidiaryCell = worksheet.getCell('A2');
  subsidiaryCell.value = `LOCALIDAD: ${subsidiaryName.toUpperCase()}`;
  subsidiaryCell.style = { 
    font: { bold: true, size: 14 }, 
    alignment: { horizontal: 'center' } 
  };

  worksheet.mergeCells('A3:H3');
  const subtitleCell = worksheet.getCell('A3');
  subtitleCell.value = 'DEVOLUCIONES Y RECOLECCIONES';
  subtitleCell.style = { 
    font: { size: 14 }, 
    alignment: { horizontal: 'center' } 
  };

  // Fecha
  worksheet.mergeCells('A4:H4');
  const dateCell = worksheet.getCell('A4');
  dateCell.value = currentDate;
  dateCell.style = { 
    font: { bold: true }, 
    alignment: { horizontal: 'center' } 
  };

  // Espacio
  worksheet.addRow([]);

  // === RESUMEN DE PAQUETES - ACTUALIZADO ===
  worksheet.mergeCells('A6:H6');
  const summaryTitle = worksheet.getCell('A6');
  summaryTitle.value = 'RESUMEN DE PAQUETES';
  summaryTitle.style = headerStyle;

  // Calcular totales (SOLO LOS 3 QUE NECESITAMOS)
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

  // Aplicar estilos a la tabla de resumen
  for (let col = 1; col <= 5; col += 2) {
    if (col <= 5) {
      worksheet.mergeCells(7, col, 7, col + 1);
      worksheet.mergeCells(8, col, 8, col + 1);
      
      worksheet.getCell(7, col).style = subHeaderStyle;
      worksheet.getCell(8, col).style = {
        alignment: { horizontal: 'center' },
        font: { bold: true, size: 12 },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F2F2F2' },
        },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }
      };
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
  
  // Aplicar estilo a los encabezados
  for (let col = 1; col <= 4; col++) {
    worksheet.getCell(devolutionHeaders.number, col).style = subHeaderStyle;
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
    if (index % 2 === 0) {
      for (let col = 1; col <= 4; col++) {
        worksheet.getCell(row.number, col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F2F2F2' },
        };
      }
    }

    // Bordes para todas las celdas
    for (let col = 1; col <= 4; col++) {
      worksheet.getCell(row.number, col).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }

    // Ajustar altura de fila
    worksheet.getRow(row.number).height = 20;

    // Color rojo para códigos DEX
    if (statusCode.includes('DEX') || statusCode.includes('GUIA FRAUDE')) {
      worksheet.getCell(row.number, 3).font = { color: { argb: 'FF0000' }, bold: true };
    }
  });

  // === RECOLECCIONES (LADO DERECHO: Columnas E-H) ===
  // Empezar en la misma fila que las devoluciones
  const collectionStartRow = devolutionStartRow;
  
  worksheet.mergeCells(`E${collectionStartRow}:H${collectionStartRow}`);
  const collectionTitle = worksheet.getCell(`E${collectionStartRow}`);
  collectionTitle.value = 'RECOLECCIONES';
  collectionTitle.style = orangeHeaderStyle;

  // Encabezados de tabla de recolecciones (misma fila que headers de devoluciones)
  const collectionHeadersRow = devolutionHeaders.number;
  const collectionHeaders = worksheet.getRow(collectionHeadersRow);
  collectionHeaders.getCell(6).value = 'NO. GUIA';
  collectionHeaders.getCell(7).value = 'SUCURSAL';
  collectionHeaders.getCell(8).value = 'No.';
  
  // Aplicar estilo a los encabezados de recolecciones
  for (let col = 5; col <= 8; col++) {
    worksheet.getCell(collectionHeadersRow, col).style = subHeaderStyle;
  }

  // Datos de recolecciones
  collections.forEach((collection, index) => {
    const rowNumber = devolutionHeaders.number + 1 + index;
    
    // Asegurarse de que la fila existe
    if (!worksheet.getRow(rowNumber)) {
      worksheet.addRow([]);
    }
    
    const row = worksheet.getRow(rowNumber);
    // Solo escribir en columnas E-H (5-8)
    row.getCell(6).value = collection.trackingNumber;
    row.getCell(7).value = subsidiaryName.substring(0, 3).toUpperCase();
    row.getCell(8).value = index + 1;

    // Estilo alternado para filas
    if (index % 2 === 0) {
      for (let col = 5; col <= 8; col++) {
        worksheet.getCell(rowNumber, col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F2F2F2' },
        };
      }
    }

    // Bordes para celdas de recolecciones
    for (let col = 5; col <= 8; col++) {
      worksheet.getCell(rowNumber, col).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }

    // Ajustar altura de fila
    worksheet.getRow(rowNumber).height = 20;
  });

  // === LEYENDA DE CÓDIGOS DEX ===
  const legendStartRow = collectionStartRow + Math.max(collections.length, devolutions.length) + 2;

  worksheet.mergeCells(`A${legendStartRow}:H${legendStartRow}`);
  const legendTitle = worksheet.getCell(`A${legendStartRow}`);
  legendTitle.value = 'LEYENDA DE CÓDIGOS DEX';
  legendTitle.style = { 
    font: { bold: true, size: 12 },
    alignment: { horizontal: 'center' },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E6E6E6' },
    }
  };

  const legend1 = worksheet.addRow(['DEX 03: DATOS INCORRECTOS / DOM NO EXISTE', '', '', '', '', '', '', '']);
  const legend2 = worksheet.addRow(['DEX 07: RECHAZO DE PAQUETES POR EL CLIENTE', '', '', '', '', '', '', '']);
  const legend3 = worksheet.addRow(['DEX 08: VISITA / DOMICILIO CERRADO', '', '', '', '', '', '', '']);
  
  // Combinar celdas de leyenda
  [legend1, legend2, legend3].forEach(row => {
    worksheet.mergeCells(`A${row.number}:H${row.number}`);
    worksheet.getCell(`A${row.number}`).alignment = { horizontal: 'center' };
    worksheet.getRow(row.number).height = 20; // Ajustar altura para texto
  });

  // === AJUSTAR TAMAÑO DE COLUMNAS PARA EVITAR CORTE DE TEXTO ===
  worksheet.columns = [
    { width: 8 },    // A: No. (más ancho para números)
    { width: 22 },   // B: No. GUIA (más ancho para números largos)
    { width: 20 },   // C: MOTIVO (más ancho para texto)
    { width: 8 },    // D: Espacio
    { width: 8 },    // E: Espacio
    { width: 22 },   // F: No. GUIA (más ancho para números largos)
    { width: 15 },   // G: SUCURSAL (más ancho)
    { width: 8 },    // H: No. (más ancho para números)
  ];

  // Ajustar automáticamente el alto de las filas para todo el contenido
  worksheet.eachRow((row) => {
    row.height = 20; // Altura mínima uniforme
  });

  // === GUARDAR ARCHIVO ===
  const buffer = await workbook.xlsx.writeBuffer();

  if(forDownload) {
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    const fileName = `FedEx_Control_${subsidiaryName}_${currentDate.replace(/\//g, "-")}.xlsx`;
    saveAs(blob, fileName);
  }

  return buffer;
}