import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PackageDispatch, PackageInfo } from '@/lib/types';
import { format, toZonedTime } from 'date-fns-tz';
import { mapToPackageInfo } from '@/lib/utils';

export async function generateRouteClosureExcel(
  returnedPackages: PackageInfo[],
  packageDispatch: PackageDispatch,
  actualKms: string,
  collections: string[] = [],
  podPackages: PackageInfo[] = [],
  forDownload = true
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Cierre de Ruta');
  const timeZone = 'America/Hermosillo';
  
  const packageDispatchShipments: PackageInfo[] = mapToPackageInfo(packageDispatch.shipments, packageDispatch.chargeShipments);
  
  // Cobros
  const charges = packageDispatchShipments
    .filter(pkg => pkg.payment)
    .map(pkg => ({
      trackingNumber: pkg.trackingNumber,
      amount: pkg.payment.amount,
      type: pkg.payment.type,
    }));

  // === ENCABEZADO GENERAL ===
  const titleRow = sheet.addRow(['📋 CIERRE DE RUTA']);
  sheet.mergeCells(`A${titleRow.number}:H${titleRow.number}`);
  titleRow.font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

  for (let col = 1; col <= 8; col++) {
    sheet.getCell(titleRow.number, col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '8c5e4e' },
    };
  }

  sheet.addRow([]);

  // === INFORMACIÓN GENERAL ===
  const { subsidiary, vehicle, shipments, trackingNumber, drivers, routes, createdAt, kms } = packageDispatch;

  const validReturns = returnedPackages.filter(p => p.isValid);
  const originalCount = packageDispatchShipments?.length || 0;
  const deliveredCount = Math.max(0, originalCount - validReturns.length);
  const returnRate = originalCount > 0 ? (validReturns.length / originalCount) * 100 : 0;
  const podDeliveredCount = podPackages?.length || 0;

  const currentDate = format(new Date(), 'yyyy-MM-dd', { timeZone });
  const currentTime = format(new Date(), 'HH:mm:ss', { timeZone });
  const dispatchDate = createdAt ? format(new Date(createdAt), 'yyyy-MM-dd', { timeZone }) : 'N/A';
  const mainDriver = drivers && drivers.length > 0 ? drivers[0].name : 'No asignado';
  const routeNames = routes?.map(r => r.name).join(', ') || 'No asignado';

  const infoTitleRow = sheet.addRow(['INFORMACIÓN GENERAL']);
  sheet.mergeCells(`A${infoTitleRow.number}:H${infoTitleRow.number}`);
  infoTitleRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  infoTitleRow.alignment = { horizontal: 'center' };

  for (let col = 1; col <= 8; col++) {
    sheet.getCell(infoTitleRow.number, col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '8c5e4e' },
    };
  }

  const generalData = [
    { label: 'Sucursal', value: subsidiary?.name || 'N/A' },
    { label: 'Unidad', value: vehicle?.name || 'N/A' },
    { label: 'Conductor', value: mainDriver },
    { label: 'Rutas', value: routeNames },
    { label: 'Fecha Salida', value: dispatchDate },
    { label: 'Km Inicial/Final', value: `${kms || 'N/A'} / ${actualKms} km` },
    { label: 'No. Seguimiento', value: trackingNumber },
    { label: 'Total Paquetes', value: originalCount },
    { label: 'Entregas Efectivas', value: deliveredCount },
    { label: 'Fecha Cierre', value: `${currentDate} ${currentTime}` }
  ];

  const infoHeaderRow = sheet.addRow(['CAMPO', 'VALOR']);
  infoHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  infoHeaderRow.alignment = { horizontal: 'center' };
  
  for (let col = 1; col <= 2; col++) {
    sheet.getCell(infoHeaderRow.number, col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '6d4c41' },
    };
  }

  generalData.forEach((item, index) => {
    const row = sheet.addRow([item.label, item.value]);
    if (item.label === 'Total Paquetes' || item.label === 'Entregas Efectivas') {
      row.getCell(2).numFmt = '#,##0';
    }
    if (index % 2 === 0) {
      for (let col = 1; col <= 2; col++) {
        sheet.getCell(row.number, col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8F9FA' },
        };
      }
    }
  });

  sheet.addRow([]);

  // === ESTADÍSTICAS ===
  const statsTitleRow = sheet.addRow(['ESTADÍSTICAS']);
  sheet.mergeCells(`A${statsTitleRow.number}:H${statsTitleRow.number}`);
  statsTitleRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  statsTitleRow.alignment = { horizontal: 'center' };
  
  for (let col = 1; col <= 8; col++) {
    sheet.getCell(statsTitleRow.number, col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '8c5e4e' },
    };
  }

  const statsData = [
    ['PAQUETES EN SALIDA', originalCount],
    ['ENTREGAS EFECTIVAS', deliveredCount],
    ['PAQUETES DEVUELTOS', validReturns.length],
    ['TASA DE DEVOLUCIÓN', `${returnRate.toFixed(1)}%`],
    ['PODs ENTREGADOS', podDeliveredCount]
  ];

  const statsHeaderRow = sheet.addRow(['ESTADÍSTICA', 'VALOR']);
  statsHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  statsHeaderRow.alignment = { horizontal: 'center' };
  
  for (let col = 1; col <= 2; col++) {
    sheet.getCell(statsHeaderRow.number, col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '6d4c41' },
    };
  }

  statsData.forEach(([label, value], index) => {
    const row = sheet.addRow([label, value]);
    if (typeof value === 'number') row.getCell(2).numFmt = '#,##0';
    row.getCell(1).font = { bold: true };
    row.getCell(2).font = { bold: true };
    if (index % 2 === 0) {
      for (let col = 1; col <= 2; col++) {
        sheet.getCell(row.number, col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8F9FA' },
        };
      }
    }
  });

  sheet.addRow([]);

  // === PAQUETES DEVUELTOS ===
  if (validReturns.length > 0) {
    const returnsTitleRow = sheet.addRow(['PAQUETES DEVUELTOS']);
    sheet.mergeCells(`A${returnsTitleRow.number}:H${returnsTitleRow.number}`);
    returnsTitleRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    returnsTitleRow.alignment = { horizontal: 'center' };
    for (let col = 1; col <= 8; col++) {
      sheet.getCell(returnsTitleRow.number, col).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '8c5e4e' },
      };
    }

    const returnsHeaderRow = sheet.addRow([
      'No.', 'GUÍA', 'MOTIVO', 'DESTINATARIO', 'TELÉFONO', 'DIRECCIÓN', 'FECHA', 'HORA'
    ]);
    returnsHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    returnsHeaderRow.alignment = { horizontal: 'center' };
    for (let col = 1; col <= 8; col++) {
      sheet.getCell(returnsHeaderRow.number, col).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '6d4c41' },
      };
    }

    validReturns.forEach((pkg, index) => {
      const zonedDate = pkg.commitDateTime ? toZonedTime(new Date(pkg.commitDateTime), timeZone) : new Date();
      const commitDate = format(zonedDate, 'yyyy-MM-dd');
      const commitTime = format(zonedDate, 'HH:mm:ss');

      const row = sheet.addRow([
        index + 1,
        pkg.trackingNumber,
        pkg.lastHistory?.exceptionCode ? `DEX-${pkg.lastHistory.exceptionCode}` : 'Devuelto',
        pkg.recipientName || 'N/A',
        pkg.recipientPhone || 'N/A',
        pkg.recipientAddress || 'N/A',
        commitDate,
        commitTime
      ]);

      if (index % 2 === 0) {
        for (let col = 1; col <= 8; col++) {
          sheet.getCell(row.number, col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F8F9FA' },
          };
        }
      }
    });

    const totalReturnsRow = sheet.addRow(['TOTAL DEVOLUCIONES', validReturns.length, '', '', '', '', '', '']);
    sheet.mergeCells(`A${totalReturnsRow.number}:C${totalReturnsRow.number}`);
    sheet.mergeCells(`D${totalReturnsRow.number}:H${totalReturnsRow.number}`);
    totalReturnsRow.getCell(1).font = { bold: true };
    totalReturnsRow.getCell(4).font = { bold: true };
    totalReturnsRow.getCell(4).value = validReturns.length;
    totalReturnsRow.getCell(4).numFmt = '#,##0';
    for (let col = 1; col <= 8; col++) {
      if (sheet.getCell(totalReturnsRow.number, col).value) {
        sheet.getCell(totalReturnsRow.number, col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E8E8E8' },
        };
      }
    }
    sheet.addRow([]);
  }

  // === CÓDIGOS DEX ===
  const dexCounts = {
    '03': validReturns.filter(p => p.lastHistory?.exceptionCode === '03').length,
    '07': validReturns.filter(p => p.lastHistory?.exceptionCode === '07').length,
    '08': validReturns.filter(p => p.lastHistory?.exceptionCode === '08').length,
    '12': validReturns.filter(p => p.lastHistory?.exceptionCode === '12').length,
    'OTROS': validReturns.filter(p => p.lastHistory?.exceptionCode && !['03','07','08','12'].includes(p.lastHistory.exceptionCode)).length,
    'SIN CÓDIGO': validReturns.filter(p => !p.lastHistory?.exceptionCode).length
  };

  const dexTitleRow = sheet.addRow(['CONTEO POR CÓDIGO DEX']);
  sheet.mergeCells(`A${dexTitleRow.number}:H${dexTitleRow.number}`);
  dexTitleRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  dexTitleRow.alignment = { horizontal: 'center' };
  for (let col = 1; col <= 8; col++) {
    sheet.getCell(dexTitleRow.number, col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '8c5e4e' },
    };
  }

  const dexHeaderRow = sheet.addRow(['CÓDIGO DEX', 'CANTIDAD']);
  dexHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  dexHeaderRow.alignment = { horizontal: 'center' };
  for (let col = 1; col <= 2; col++) {
    sheet.getCell(dexHeaderRow.number, col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '6d4c41' },
    };
  }

  const dexData = [
    ['DEX-03', dexCounts['03']],
    ['DEX-07', dexCounts['07']],
    ['DEX-08', dexCounts['08']],
    ['DEX-12', dexCounts['12']],
    ['OTROS DEX', dexCounts['OTROS']],
    ['SIN CÓDIGO DEX', dexCounts['SIN CÓDIGO']],
    ['TOTAL DEVOLUCIONES', validReturns.length]
  ];

  dexData.forEach(([code, count], index) => {
    const row = sheet.addRow([code, count]);
    row.getCell(2).numFmt = '#,##0';
    if (index % 2 === 0 && index !== dexData.length - 1) {
      for (let col = 1; col <= 2; col++) {
        sheet.getCell(row.number, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } };
      }
    }
    if (index === dexData.length - 1) {
      for (let col = 1; col <= 2; col++) {
        sheet.getCell(row.number, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8E8E8' } };
      }
    }
  });

  sheet.addRow([]);

  // === RECOLECCIONES ===
  if (collections.length > 0) {
    const collectionsTitleRow = sheet.addRow(['RECOLECCIONES']);
    sheet.mergeCells(`A${collectionsTitleRow.number}:H${collectionsTitleRow.number}`);
    collectionsTitleRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    collectionsTitleRow.alignment = { horizontal: 'center' };
    for (let col = 1; col <= 8; col++) {
      sheet.getCell(collectionsTitleRow.number, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '8c5e4e' } };
    }

    const collectionsHeaderRow = sheet.addRow(['No.', 'GUÍA DE RECOLECCIÓN']);
    collectionsHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    collectionsHeaderRow.alignment = { horizontal: 'center' };
    for (let col = 1; col <= 2; col++) {
      sheet.getCell(collectionsHeaderRow.number, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6d4c41' } };
    }

    collections.forEach((tracking, index) => {
      const row = sheet.addRow([index + 1, tracking]);
      if (index % 2 === 0) {
        for (let col = 1; col <= 2; col++) {
          sheet.getCell(row.number, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } };
        }
      }
    });

    const totalCollectionsRow = sheet.addRow(['TOTAL RECOLECCIONES', collections.length]);
    totalCollectionsRow.getCell(1).font = { bold: true };
    totalCollectionsRow.getCell(2).font = { bold: true };
    totalCollectionsRow.getCell(2).numFmt = '#,##0';
    for (let col = 1; col <= 2; col++) {
      sheet.getCell(totalCollectionsRow.number, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8E8E8' } };
    }
  }

  // === COBROS ===
  if (charges.length > 0) {
    const chargesTitleRow = sheet.addRow(['COBROS']);
    sheet.mergeCells(`A${chargesTitleRow.number}:H${chargesTitleRow.number}`);
    chargesTitleRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    chargesTitleRow.alignment = { horizontal: 'center' };
    for (let col = 1; col <= 8; col++) {
      sheet.getCell(chargesTitleRow.number, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '8c5e4e' } };
    }

    const chargesHeaderRow = sheet.addRow(['No.', 'GUÍA', 'MONTO', 'TIPO']);
    chargesHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    chargesHeaderRow.alignment = { horizontal: 'center' };
    for (let col = 1; col <= 4; col++) {
      sheet.getCell(chargesHeaderRow.number, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6d4c41' } };
    }

    charges.forEach((c, index) => {
      const row = sheet.addRow([index + 1, c.trackingNumber, c.amount, c.type]);
      row.getCell(3).numFmt = '"$"#,##0.00';
      if (index % 2 === 0) {
        for (let col = 1; col <= 4; col++) {
          sheet.getCell(row.number, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } };
        }
      }
    });

    const totalAmount = charges.reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalChargesRow = sheet.addRow(['TOTAL COBROS', '', totalAmount, '']);
    totalChargesRow.getCell(1).font = { bold: true };
    totalChargesRow.getCell(3).font = { bold: true };
    totalChargesRow.getCell(3).numFmt = '"$"#,##0.00';
    for (let col = 1; col <= 4; col++) {
      sheet.getCell(totalChargesRow.number, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8E8E8' } };
    }
  }

  // Auto-ajustar ancho columnas
  sheet.columns.forEach(column => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, cell => {
      const cellLength = cell.value ? cell.value.toString().length : 0;
      if (cellLength > maxLength) maxLength = cellLength;
    });
    column.width = maxLength + 2;
  });


  const buffer = await workbook.xlsx.writeBuffer();

  if(forDownload) {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(blob, `CIERRE DE RUTA ${packageDispatch?.drivers[0]?.name.toUpperCase()}--${packageDispatch?.subsidiary?.name}--Salida a Ruta--${createdAt.replace(/\//g, "-")}.xlsx`);
  }

  return buffer;
}
