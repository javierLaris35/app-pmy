import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { MonitoringInfo } from "./shipment-tracking";

export async function exportToExcel(packages: MonitoringInfo[]) {
  if (packages.length === 0) {
    alert("No hay datos para exportar")
    return
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Seguimiento de Paquetes");
  const currentDate = new Date();

  // === ENCABEZADO GENERAL ===
  const titleRow = sheet.addRow(["📦 Seguimiento de Paquetes"]);
  sheet.mergeCells(`A${titleRow.number}:L${titleRow.number}`);
  titleRow.font = { size: 16, bold: true, color: { argb: "FFFFFF" } };
  titleRow.alignment = { vertical: "middle", horizontal: "center" };

  for (let col = 1; col <= 12; col++) {
    sheet.getCell(titleRow.number, col).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "EF883A" },
    };
  }

  sheet.addRow([]);
  sheet.addRow([`Fecha de generación: ${currentDate.toLocaleDateString('es-ES')}`]);
  sheet.addRow([`Hora de generación: ${currentDate.toLocaleTimeString('es-ES')}`]);
  sheet.addRow([`Total de paquetes: ${packages.length}`]);
  sheet.addRow([]);

  // === ENCABEZADO DE COLUMNAS ===
  const headerRow = sheet.addRow([
    "No.",
    "Número de Tracking",
    "Destino",
    "Ubicación Actual",
    "Fecha Compromiso",
    "Estado del Envío",
    "Fecha de Actualización",
    "DEX Code",
    "Consolidado",
    "Desembarque",
    "Chofer Asignado",
    "Días en Bodega"
  ]);

  headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  for (let col = 1; col <= 12; col++) {
    sheet.getCell(headerRow.number, col).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "8C5E4E" },
    };
    sheet.getCell(headerRow.number, col).border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  }

  // === DATOS ===
  packages.forEach((pkg, index) => {
    const diasEnBodega = calculateDaysInWarehouse(pkg);
    const noTieneSalidaARuta = !pkg.packageDispatch;
    const debeResaltarFilaRoja = noTieneSalidaARuta && diasEnBodega > 3;
    
    // Solo verificar compromiso hoy para paquetes NO entregados
    const tieneCommitHoy = hasCommitDateToday(pkg);
    const noEstaEnRuta = pkg.shipmentData.shipmentStatus?.toLowerCase() !== "en_ruta";
    const noEstaEntregado = pkg.shipmentData.shipmentStatus?.toLowerCase() !== "entregado";
    const debeResaltarFilaNaranja = tieneCommitHoy && noEstaEnRuta && noEstaEntregado;

    // CORRECCIÓN: Ubicación actual para paquetes entregados
    const ubicacionActual = getUbicacionActual(pkg);
    
    // CORRECCIÓN: Estado del envío con lógica especial
    const estadoDelEnvio = getEstadoDelEnvio(pkg);

    const row = sheet.addRow([
      index + 1,
      pkg.shipmentData.trackingNumber || "N/A",
      pkg.shipmentData.destination || "N/A",
      ubicacionActual, // CORREGIDO
      pkg.shipmentData.commitDateTime ? formatExcelDate(pkg.shipmentData.commitDateTime) : "N/A",
      estadoDelEnvio, // CORREGIDO
      pkg.shipmentData.lastEventDate ? formatExcelDate(pkg.shipmentData.lastEventDate) : "N/A",
      pkg.shipmentData.dexCode,
      //pkg.shipmentData.isCharge ? "F2" : "Paquete",
      pkg.shipmentData.consolidated?.consNumber || "N/A",
      pkg.shipmentData.unloading?.trackingNumber || "N/A",
      pkg.packageDispatch?.driver || "No asignado",
      pkg.shipmentData.daysInWarehouse
      //diasEnBodega > 0 ? diasEnBodega.toString() : "N/A"
    ]);

    // Filas alternadas en gris (solo si no debe resaltarse)
    if (index % 2 === 0 && !debeResaltarFilaRoja && !debeResaltarFilaNaranja) {
      for (let col = 1; col <= 12; col++) {
        sheet.getCell(row.number, col).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F2F2F2" },
        };
      }
    }

    // Bordes y alineación
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      
      // Centrar columnas específicas
      if ([1, 6, 7, 8, 9, 10, 12].includes(colNumber)) {
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      }

      // PRIORIDAD 1: Fila naranja (máxima prioridad - compromiso hoy sin ruta)
      if (debeResaltarFilaNaranja) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF9900" }
        };
        cell.font = { 
          color: { argb: "FFFFFF" },
          bold: true 
        };
      }
      // PRIORIDAD 2: Fila roja (sin salida a ruta + >3 días)
      else if (debeResaltarFilaRoja) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0000" }
        };
        cell.font = { 
          color: { argb: "FFFFFF" },
          bold: true 
        };
      }
      else {
        // Colores condicionales para estado del envío (solo si no está resaltada)
        if (colNumber === 6) {
          const status = cell.value?.toString().toLowerCase();
          if (status === "en ruta") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF2CC" }
            };
            cell.font = { color: { argb: "7F6000" }, bold: true };
          } else if (status === "entregado") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "E2F0D9" }
            };
            cell.font = { color: { argb: "385723" }, bold: true };
          } else if (status === "en bodega") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "DEEBF7" }
            };
            cell.font = { color: { argb: "2F5597" }, bold: true };
          } else if (status === "devuelto a fedex" || status === "devuelto") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F2F2F2" }
            };
            cell.font = { color: { argb: "666666" }, bold: true };
          }
        }

        // Color para tipo de envío (Cargo)
        if (colNumber === 7 && cell.value === "Cargo") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FCE4D6" }
          };
          cell.font = { color: { argb: "943634" }, bold: true };
        }

        // Color para días en bodega > 3 (solo si no está resaltada)
        if (colNumber === 12 && diasEnBodega > 3) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC7CE" }
          };
          cell.font = { 
            color: { argb: "9C0006" },
            bold: true 
          };
        }

        // Color para fecha compromiso hoy (solo si no está resaltada)
        if (colNumber === 5 && tieneCommitHoy) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF9900" }
          };
          cell.font = { 
            color: { argb: "FFFFFF" },
            bold: true 
          };
        }
      }
    });
  });

  // === HOJA DE RESUMEN ===
  const summarySheet = workbook.addWorksheet("Resumen");

  // Título del resumen
  const summaryTitle = summarySheet.addRow(["📊 Resumen de Seguimiento"]);
  summarySheet.mergeCells(`A${summaryTitle.number}:B${summaryTitle.number}`);
  summaryTitle.font = { size: 14, bold: true, color: { argb: "FFFFFF" } };
  summaryTitle.alignment = { vertical: "middle", horizontal: "center" };

  for (let col = 1; col <= 2; col++) {
    summarySheet.getCell(summaryTitle.number, col).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "EF883A" },
    };
  }

  summarySheet.addRow([]);

  // Estadísticas generales
  const statsTitle = summarySheet.addRow(["ESTADÍSTICAS GENERALES"]);
  summarySheet.mergeCells(`A${statsTitle.number}:B${statsTitle.number}`);
  statsTitle.font = { bold: true, color: { argb: "FFFFFF" } };
  statsTitle.alignment = { vertical: "middle", horizontal: "left" };

  for (let col = 1; col <= 2; col++) {
    summarySheet.getCell(statsTitle.number, col).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "8C5E4E" },
    };
  }

  const enBodega = packages.filter(p => getEstadoDelEnvio(p) === "En Bodega").length;
  const enRuta = packages.filter(p => getEstadoDelEnvio(p) === "En Ruta").length;
  const entregados = packages.filter(p => getEstadoDelEnvio(p) === "Entregado").length;
  const devueltos = packages.filter(p => 
    getEstadoDelEnvio(p) === "Devuelto a FedEx" || 
    getEstadoDelEnvio(p) === "Devuelto"
  ).length;
  const cargos = packages.filter(p => p.shipmentData.isCharge).length;
  const paquetes = packages.filter(p => !p.shipmentData.isCharge).length;
  
  // Solo contar paquetes con compromiso hoy que NO estén entregados
  const paquetesConCommitHoy = packages.filter(pkg => hasCommitDateToday(pkg));
  const paquetesConCommitHoySinRuta = paquetesConCommitHoy.filter(pkg => {
    const estado = getEstadoDelEnvio(pkg);
    return estado !== "En Ruta" && estado !== "Entregado";
  }).length;
  
  // Estadísticas de paquetes sin salida a ruta
  const paquetesSinSalidaARuta = packages.filter(p => !p.packageDispatch);
  const paquetesCriticos = paquetesSinSalidaARuta.filter(pkg => 
    calculateDaysInWarehouse(pkg) > 3
  ).length;
  
  // Estadísticas de días en bodega (excluyendo entregados y devueltos)
  const paquetesEnBodega = packages.filter(p => {
    const estado = getEstadoDelEnvio(p);
    return estado === "En Bodega" || estado === "En Ruta";
  });
  
  const paquetesConMasDe3Dias = paquetesEnBodega.filter(pkg => 
    calculateDaysInWarehouse(pkg) > 3
  ).length;
  
  const paquetesConMasDe7Dias = paquetesEnBodega.filter(pkg => 
    calculateDaysInWarehouse(pkg) > 7
  ).length;

  // Promedio de días en bodega
  const totalDiasEnBodega = paquetesEnBodega.reduce((sum, pkg) => 
    sum + calculateDaysInWarehouse(pkg), 0
  );
  const promedioDiasEnBodega = paquetesEnBodega.length > 0 
    ? (totalDiasEnBodega / paquetesEnBodega.length).toFixed(1)
    : "0";

  summarySheet.addRow(["Total de paquetes:", packages.length]);
  summarySheet.addRow(["Paquetes en bodega:", enBodega]);
  summarySheet.addRow(["Paquetes en ruta:", enRuta]);
  summarySheet.addRow(["Paquetes entregados:", entregados]);
  summarySheet.addRow(["Paquetes devueltos:", devueltos]);
  summarySheet.addRow(["Cargos:", cargos]);
  summarySheet.addRow(["Paquetes regulares:", paquetes]);
  summarySheet.addRow(["Paquetes sin salida a ruta:", paquetesSinSalidaARuta.length]);
  summarySheet.addRow(["Paquetes críticos (>3 días sin ruta):", paquetesCriticos]);
  summarySheet.addRow(["Paquetes con compromiso hoy:", paquetesConCommitHoy.length]);
  summarySheet.addRow(["Paquetes con compromiso hoy SIN RUTA:", paquetesConCommitHoySinRuta]);
  summarySheet.addRow([]);

  // SECCIÓN: ALERTAS URGENTES
  const alertasTitle = summarySheet.addRow(["🚨 ALERTAS URGENTES"]);
  summarySheet.mergeCells(`A${alertasTitle.number}:B${alertasTitle.number}`);
  alertasTitle.font = { bold: true, color: { argb: "FFFFFF" } };
  alertasTitle.alignment = { vertical: "middle", horizontal: "left" };

  for (let col = 1; col <= 2; col++) {
    summarySheet.getCell(alertasTitle.number, col).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0000" },
    };
  }

  summarySheet.addRow(["Compromiso hoy SIN RUTA:", paquetesConCommitHoySinRuta]);
  summarySheet.addRow(["Críticos (>3 días sin ruta):", paquetesCriticos]);
  summarySheet.addRow([]);

  // SECCIÓN: Estadísticas de tiempo en bodega
  const tiempoTitle = summarySheet.addRow(["TIEMPO EN BODEGA"]);
  summarySheet.mergeCells(`A${tiempoTitle.number}:B${tiempoTitle.number}`);
  tiempoTitle.font = { bold: true, color: { argb: "FFFFFF" } };
  tiempoTitle.alignment = { vertical: "middle", horizontal: "left" };

  for (let col = 1; col <= 2; col++) {
    summarySheet.getCell(tiempoTitle.number, col).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "8C5E4E" },
    };
  }

  summarySheet.addRow(["Paquetes en bodega/ruta:", paquetesEnBodega.length]);
  summarySheet.addRow(["Paquetes > 3 días en bodega:", paquetesConMasDe3Dias]);
  summarySheet.addRow(["Paquetes > 7 días en bodega:", paquetesConMasDe7Dias]);
  summarySheet.addRow(["Promedio días en bodega:", promedioDiasEnBodega]);
  summarySheet.addRow([]);

  // Distribución por destino
  const destTitle = summarySheet.addRow(["DISTRIBUCIÓN POR DESTINO"]);
  summarySheet.mergeCells(`A${destTitle.number}:B${destTitle.number}`);
  destTitle.font = { bold: true, color: { argb: "FFFFFF" } };
  destTitle.alignment = { vertical: "middle", horizontal: "left" };

  for (let col = 1; col <= 2; col++) {
    summarySheet.getCell(destTitle.number, col).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "8C5E4E" },
    };
  }

  const destinos = packages.reduce((acc, pkg) => {
    const dest = pkg.shipmentData.destination || "Sin destino";
    acc.set(dest, (acc.get(dest) || 0) + 1);
    return acc;
  }, new Map<string, number>());

  Array.from(destinos).forEach(([destino, count]) => {
    summarySheet.addRow([destino, count]);
  });

  // === AJUSTE DE COLUMNAS ===
  // Hoja principal
  sheet.getColumn(1).width = 5;   // No.
  sheet.getColumn(2).width = 20;  // Número de Tracking
  sheet.getColumn(3).width = 25;  // Destino
  sheet.getColumn(4).width = 20;  // Ubicación Actual
  sheet.getColumn(5).width = 18;  // Fecha Compromiso
  sheet.getColumn(6).width = 15;  // Estado del Envío
  sheet.getColumn(7).width = 18;  // Fecha Actualización
  sheet.getColumn(8).width = 15;  // Dex Code
  sheet.getColumn(9).width = 20; // Consolidado
  sheet.getColumn(10).width = 18; // Desembarque
  sheet.getColumn(11).width = 20; // Chofer Asignado
  sheet.getColumn(12).width = 15; // Días en Bodega

  // Hoja de resumen
  summarySheet.getColumn(1).width = 30;
  summarySheet.getColumn(2).width = 15;

  // Aplicar bordes a la hoja de resumen
  for (let i = 1; i <= summarySheet.rowCount; i++) {
    for (let j = 1; j <= 2; j++) {
      const cell = summarySheet.getCell(i, j);
      if (cell.value) {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }
  }

  // Centrar valores en la hoja de resumen
  for (let i = 5; i <= summarySheet.rowCount; i++) {
    const cell = summarySheet.getCell(i, 2);
    if (cell.value) {
      cell.alignment = { vertical: "middle", horizontal: "center" };
    }
  }

  // === EXPORTACIÓN ===
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `Seguimiento_Paquetes_${formatDateForFilename(currentDate)}.xlsx`;

  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName
  );

  return buffer;
}

// NUEVA FUNCIÓN: Obtener ubicación actual con lógica especial
const getUbicacionActual = (pkg: MonitoringInfo): string => {
  const status = pkg.shipmentData.shipmentStatus?.toLowerCase();
  
  // Si está entregado, mostrar "Entregado"
  if (status === "entregado" || status === "delivered") {
    return "Entregado";
  }
  
  // Para otros casos, usar la ubicación original
  return pkg.shipmentData.ubication || "N/A";
}

// NUEVA FUNCIÓN: Obtener estado del envío con lógica especial
const getEstadoDelEnvio = (pkg: MonitoringInfo): string => {
  const status = pkg.shipmentData.shipmentStatus?.toLowerCase();
  
  // Si está en bodega y no tiene ruta asignada, mostrar "En Bodega"
  if ((status === "en_bodega" || status === "pending") && !pkg.packageDispatch) {
    return "En Bodega";
  }
  
  // Para otros casos, usar el formateador normal
  return formatShipmentStatus(pkg.shipmentData.shipmentStatus);
}

// FUNCIÓN: Calcular días en bodega usando createdDate
const calculateDaysInWarehouse = (pkg: MonitoringInfo): number => {
  // Solo calcular para paquetes que están en bodega o en ruta (no entregados ni devueltos)
  const status = pkg.shipmentData.shipmentStatus?.toLowerCase();
  const excludedStatuses = ["entregado", "delivered", "devuelto_a_fedex", "devuelto"];
  
  if (excludedStatuses.includes(status)) {
    return 0;
  }

  // Usar la nueva propiedad createdDate para el cálculo exacto
  if (!pkg.shipmentData.createdDate) {
    return 0;
  }

  try {
    const createdDate = new Date(pkg.shipmentData.createdDate);
    const today = new Date();
    
    // Calcular diferencia en días
    const diffTime = today.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  } catch (error) {
    console.error('Error calculando días en bodega:', error);
    return 0;
  }
}

// FUNCIÓN: Verificar si el commitDateTime es hoy
const hasCommitDateToday = (pkg: MonitoringInfo): boolean => {
  if (!pkg.shipmentData.commitDateTime) {
    return false;
  }

  try {
    const commitDate = new Date(pkg.shipmentData.commitDateTime);
    const today = new Date();
    
    // Comparar solo año, mes y día
    return commitDate.getFullYear() === today.getFullYear() &&
           commitDate.getMonth() === today.getMonth() &&
           commitDate.getDate() === today.getDate();
  } catch (error) {
    console.error('Error verificando commit date:', error);
    return false;
  }
}

// StatusMap con _ 
const formatShipmentStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'en_bodega': 'En Bodega',
    'en_ruta': 'En Ruta',
    'entregado': 'Entregado',
    'devuelto_a_fedex': 'Devuelto a FedEx',
    'devuelto': 'Devuelto',
    'pending': 'Pendiente',
    'delivered': 'Entregado',
    'no_entregado': 'No Entregado'
  }
  return statusMap[status?.toLowerCase()] || status || 'Desconocido'
}

const formatRouteStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'active': 'Activa',
    'completed': 'Completada',
    'pending': 'Pendiente',
    'cancelled': 'Cancelada',
    'in_progress': 'En Progreso'
  }
  return statusMap[status?.toLowerCase()] || status || 'Desconocido'
}

const formatExcelDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Fecha inválida';
  }
}

const formatDateForFilename = (date: Date): string => {
  return date.toISOString()
    .replace(/[:.]/g, '-')
    .split('T')[0]
}