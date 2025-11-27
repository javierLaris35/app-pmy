import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { MonitoringInfo } from "./shipment-tracking";
import { getHistoryById } from "@/lib/services/shipments";

// ===============================================================
// FUNCION PRINCIPAL
// ===============================================================
export async function exportToExcel(packages: MonitoringInfo[]) {
  if (packages.length === 0) {
    alert("No hay datos para exportar");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Seguimiento de Paquetes");
  const currentDate = new Date();

  // ===============================================================
  // ENCABEZADO GENERAL
  // ===============================================================
  const titleRow = sheet.addRow(["📦 Seguimiento de Paquetes"]);
  sheet.mergeCells(`A${titleRow.number}:R${titleRow.number}`);
  titleRow.font = { size: 16, bold: true, color: { argb: "FFFFFF" } };
  titleRow.alignment = { vertical: "middle", horizontal: "center" };

  for (let col = 1; col <= 18; col++) {
    sheet.getCell(titleRow.number, col).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "EF883A" },
    };
  }

  sheet.addRow([]);
  sheet.addRow([`Fecha de generación: ${currentDate.toLocaleDateString("es-ES")}`]);
  sheet.addRow([`Hora de generación: ${currentDate.toLocaleTimeString("es-ES")}`]);
  sheet.addRow([`Total de paquetes: ${packages.length}`]);
  sheet.addRow([]);

  // ===============================================================
  // ENCABEZADO DE COLUMNAS
  // ===============================================================
  const headerRow = sheet.addRow([
    "No.",
    "Número de Tracking",
    "Destino",
    "Ubicación Actual",
    "Fecha Compromiso",
    "Estado del Envío",
    "Última Fecha",
    "DEX Code",
    "Consolidado",
    "Desembarque",
    "Chofer Asignado",
    "Días en Bodega",
  ]);

  headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  for (let col = 1; col <= headerRow.cellCount; col++) {
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

  // ===============================================================
  // FILAS DE DATA
  // ===============================================================
  for (let index = 0; index < packages.length; index++) {
    const pkg = packages[index];

    const diasEnBodega = calculateDaysInWarehouse(pkg);
    const debeResaltarFilaRoja = !pkg.packageDispatch && diasEnBodega > 3;

    const tieneCommitHoy = hasCommitDateToday(pkg);
    const estado = pkg.shipmentData.shipmentStatus?.toLowerCase();
    const debeResaltarFilaNaranja =
      tieneCommitHoy && estado !== "en_ruta" && estado !== "entregado";

    // Ubicación actual corregida
    const ubicacionActual = getUbicacionActual(pkg);

    // Estado del envío corregido
    const estadoDelEnvio = getEstadoDelEnvio(pkg);

    // ⬅⬅⬅ CORREGIDO: ahora es await
    const history = await getHistoryOfPackage(pkg.shipmentData.id, pkg.shipmentData.shipmentStatus);

    const row = sheet.addRow([
      index + 1,
      pkg.shipmentData.trackingNumber || "N/A",
      pkg.shipmentData.destination || "N/A",
      ubicacionActual,
      pkg.shipmentData.commitDateTime
        ? formatExcelDate(pkg.shipmentData.commitDateTime)
        : "N/A",
      estadoDelEnvio,
      history.lastStatusDate || "",
      history.exceptionCode || "",
      pkg.shipmentData.consolidated?.consNumber || "N/A",
      pkg.shipmentData.unloading?.trackingNumber || "N/A",
      pkg.packageDispatch?.driver || "No asignado",
      diasEnBodega > 0 ? diasEnBodega.toString() : "N/A",
    ]);

    // Colores, bordes y estilos
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      cell.alignment = {
        vertical: "middle",
        horizontal: colNumber === 1 ? "center" : "left",
        wrapText: true,
      };

      // PRIORIDAD 1 → NARANJA
      if (debeResaltarFilaNaranja) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF9900" },
        };
        cell.font = { bold: true, color: { argb: "FFFFFF" } };
      }

      // PRIORIDAD 2 → ROJA
      else if (debeResaltarFilaRoja) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0000" },
        };
        cell.font = { bold: true, color: { argb: "FFFFFF" } };
      }

      // COLORES ESPECIALES SEGÚN ESTADO
      else if (colNumber === 6) {
        const val = cell.value?.toString().toLowerCase();

        if (val === "en ruta") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF2CC" },
          };
          cell.font = { bold: true, color: { argb: "7F6000" } };
        }

        if (val === "entregado") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "E2F0D9" },
          };
          cell.font = { bold: true, color: { argb: "385723" } };
        }

        if (val === "en bodega") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "DEEBF7" },
          };
          cell.font = { bold: true, color: { argb: "2F5597" } };
        }
      }
    });
  }

  // ===============================================================
  // EXPORTACIÓN
  // ===============================================================
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

// ===============================================================
// FUNCIONES AUXILIARES
// ===============================================================
const getUbicacionActual = (pkg: MonitoringInfo) => {
  const status = pkg.shipmentData.shipmentStatus?.toLowerCase();
  if (status === "entregado") return "Entregado";
  return pkg.shipmentData.ubication || "N/A";
};

const getEstadoDelEnvio = (pkg: MonitoringInfo) => {
  const status = pkg.shipmentData.shipmentStatus?.toLowerCase();

  if ((status === "en_bodega" || status === "pending") && !pkg.packageDispatch) {
    return "En Bodega";
  }

  return formatShipmentStatus(pkg.shipmentData.shipmentStatus);
};

const getHistoryOfPackage = async (id: string, status: string) => {
  let lastStatusDate = "";
  let exceptionCode = "";

  if (status.trim() === "entregado" || status.trim() === "no_entregado") {
    const history = await getHistoryById(id);
    lastStatusDate = history.history[0]?.date || "";
    exceptionCode = history.history[0]?.exceptionCode || "";
  }

  return { lastStatusDate, exceptionCode };
};

const calculateDaysInWarehouse = (pkg: MonitoringInfo): number => {
  const created = new Date(pkg.shipmentData.createdAt);
  const today = new Date();
  return Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
};

const hasCommitDateToday = (pkg: MonitoringInfo): boolean => {
  if (!pkg.shipmentData.commitDateTime) return false;
  const commitDate = new Date(pkg.shipmentData.commitDateTime);
  const hoy = new Date();
  return (
    commitDate.getFullYear() === hoy.getFullYear() &&
    commitDate.getMonth() === hoy.getMonth() &&
    commitDate.getDate() === hoy.getDate()
  );
};

const formatExcelDate = (date: string | Date) =>
  new Date(date).toLocaleDateString("es-ES");

const formatShipmentStatus = (status: string) => {
  if (!status) return "N/A";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatDateForFilename = (date: Date) =>
  `${date.getFullYear()}_${date.getMonth() + 1}_${date.getDate()}`;
