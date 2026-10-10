// lib/utils/excel/generateInventoryExcel.ts
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { InventoryRejectedTracking, PackageInfo } from "@/lib/types";
import { format, toZonedTime } from "date-fns-tz";
import { mapToPackageInfo } from "@/lib/utils";
import { warehouseCarrierLabel, warehouseCityLabel } from "@/components/warehouse/shared/warehouse-scan";

/** Lo mínimo que necesitan el PDF y el Excel (sirve un inventario guardado o uno en captura). */
export interface InventoryDocReport {
  subsidiary?: { id?: string; name: string } | null;
  inventoryDate?: string;
  shipments?: any[];
  chargeShipments?: any[];
  rejectedTrackings?: InventoryRejectedTracking[] | null;
  /** Inventarios viejos. */
  missingTrackings?: string[];
  unScannedTrackings?: string[];
}

export interface InventoryDocOptions {
  /** Paquetes ya filtrados y ordenados como en pantalla. Default: todos en el orden guardado. */
  packages?: PackageInfo[];
  /** Filtro activo (p. ej. "DHL · HERMOSILLO") para que se note en el archivo. */
  filterLabel?: string;
}

/** Guías no incluidas: las nuevas (con motivo) o las listas viejas. */
export function inventoryRejectedRows(report: InventoryDocReport): InventoryRejectedTracking[] {
  if (report.rejectedTrackings?.length) return report.rejectedTrackings;
  return [
    ...(report.missingTrackings ?? []).map((t) => ({ trackingNumber: t, reason: "Faltante", kind: "" })),
    ...(report.unScannedTrackings ?? []).map((t) => ({ trackingNumber: t, reason: "Sin escaneo", kind: "" })),
  ];
}

export async function generateInventoryExcel(
  report: InventoryDocReport,
  forDownload = true,
  options: InventoryDocOptions = {}
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Inventario");
  const timeZone = "America/Hermosillo";
  const packages = options.packages ?? mapToPackageInfo(report.shipments, report.chargeShipments);
  const rejected = inventoryRejectedRows(report);
  const COLS = 11;
  const lastCol = "K";

  // === ENCABEZADO GENERAL ===
  const titleRow = sheet.addRow([`📦 Inventario`]);
  sheet.mergeCells(`A${titleRow.number}:${lastCol}${titleRow.number}`);
  titleRow.font = { size: 16, bold: true, color: { argb: "FFFFFF" } };
  titleRow.alignment = { vertical: "middle", horizontal: "center" };

  for (let col = 1; col <= COLS; col++) {
    sheet.getCell(titleRow.number, col).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "ef883a" },
    };
  }

  sheet.addRow([]);
  sheet.addRow([`Sucursal: ${report.subsidiary?.name ?? ""}`]);

  const createdAt = format(
    toZonedTime(report.inventoryDate ? new Date(report.inventoryDate) : new Date(), timeZone),
    "yyyy-MM-dd HH:mm"
  );
  sheet.addRow([`Fecha: ${createdAt}`]);
  sheet.addRow([`Paquetes: ${packages.length}`]);
  if (options.filterLabel) sheet.addRow([`Filtro: ${options.filterLabel}`]);
  sheet.addRow([]);

  // === ENCABEZADO DE COLUMNAS ===
  const headerRow = sheet.addRow([
    "No.",
    "Guía",
    "Paquetería",
    "Ciudad",
    "Nombre",
    "Dirección",
    "CP",
    "Cobro",
    "Fecha",
    "Hora",
    "Celular",
  ]);
  headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  for (let col = 1; col <= COLS; col++) {
    sheet.getCell(headerRow.number, col).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "8c5e4e" },
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
    const zoned = pkg.commitDateTime ? toZonedTime(new Date(pkg.commitDateTime), timeZone) : null;
    const commitDate = zoned ? format(zoned, "yyyy-MM-dd") : "";
    const commitTime = zoned ? format(zoned, "HH:mm:ss") : "";

    const row = sheet.addRow([
      index + 1,
      (pkg as any).dhlUniqueId || pkg.trackingNumber,
      warehouseCarrierLabel(pkg),
      warehouseCityLabel(pkg),
      pkg.recipientName,
      pkg.recipientAddress,
      pkg.recipientZip ?? "",
      pkg.payment ? `${pkg.payment.type} $${pkg.payment.amount}` : "",
      commitDate,
      commitTime,
      pkg.recipientPhone || "",
    ]);

    // Filas alternadas en gris
    if (index % 2 === 0) {
      for (let col = 1; col <= COLS; col++) {
        sheet.getCell(row.number, col).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F2F2F2" },
        };
      }
    }

    // Bordes y centrado
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
    });
  });

  // === Guías no incluidas (no existen, otra sucursal, formato) ===
  if (rejected.length > 0) {
    sheet.addRow([]);
    const title = sheet.addRow([`Guías no incluidas (${rejected.length})`]);
    sheet.mergeCells(`A${title.number}:${lastCol}${title.number}`);
    title.font = { bold: true, color: { argb: "FFFFFF" } };
    title.alignment = { vertical: "middle", horizontal: "left" };

    for (let col = 1; col <= COLS; col++) {
      sheet.getCell(title.number, col).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "ef883a" },
      };
    }

    rejected.forEach((r, i) => {
      const row = sheet.addRow([i + 1, r.trackingNumber, r.reason]);
      sheet.mergeCells(`C${row.number}:${lastCol}${row.number}`);
      row.alignment = { vertical: "middle", horizontal: "left" };
    });
  }

  // === AJUSTE DE COLUMNAS ===
  sheet.getColumn(1).width = 5;   // No.
  sheet.getColumn(2).width = 22;  // Guía
  sheet.getColumn(3).width = 12;  // Paquetería
  sheet.getColumn(4).width = 20;  // Ciudad
  sheet.getColumn(5).width = 40;  // Nombre
  sheet.getColumn(6).width = 45;  // Dirección
  sheet.getColumn(7).width = 12;  // CP
  sheet.getColumn(8).width = 20;  // Cobro
  sheet.getColumn(9).width = 12;  // Fecha
  sheet.getColumn(10).width = 12; // Hora
  sheet.getColumn(11).width = 18; // Celular

  // === EXPORTACIÓN ===
  const buffer = await workbook.xlsx.writeBuffer();
  if (forDownload) {
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${report.subsidiary?.name ?? "Sucursal"}--Inventario--${createdAt}.xlsx`
    );
  }

  return buffer;
}
