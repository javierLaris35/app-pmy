import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportDevolutionsToExcel = async (data: any[], sucursalName: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Devoluciones');

  // Configurar Columnas
  worksheet.columns = [
    { header: 'Guía', key: 'trackingNumber', width: 20 },
    { header: 'Fecha de Registro', key: 'createdAt', width: 20 },
    { header: 'Motivo/Excepción', key: 'reason', width: 30 },
    { header: 'Estado', key: 'status', width: 15 },
  ];

  // Estilo al encabezado
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '3d2b1f' } // El color café de tu marca
  };

  // Agregar filas
  data.forEach(item => {
    worksheet.addRow({
      trackingNumber: item.trackingNumber,
      createdAt: item.createdAt?.split('T')[0] || 'N/A',
      reason: item.reason || 'Sin motivo',
      status: item.status
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Devoluciones_${sucursalName}_${new Date().toLocaleDateString()}.xlsx`);
};