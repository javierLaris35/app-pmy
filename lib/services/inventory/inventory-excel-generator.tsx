// lib/utils/excel/generateInventoryExcel.ts
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { inventoryFileBase } from "@/lib/inventory-files";
import { InventoryRejectedTracking, PackageInfo } from "@/lib/types";
import { format, toZonedTime } from "date-fns-tz";
import { mapToPackageInfo } from "@/lib/utils";
import { warehouseCarrierLabel, warehouseCityLabel } from "@/components/warehouse/shared/warehouse-scan";
import { commitUrgency, daysInWarehouse, deliveryOrDexDate, type CommitUrgency } from "@/lib/inventory-excel-rules";
import { getStatusBadge } from "@/utils/shipment-status.utils";

/** Colores por vencimiento (fila completa): rojo = vence hoy, naranja = vence mañana. */
const URGENCY_STYLE: Record<Exclude<CommitUrgency, null>, { fill: string; font: string }> = {
  today: { fill: "FFC7CE", font: "9C0006" },
  tomorrow: { fill: "FFD8A8", font: "8A4B00" },
};

function paintUrgency(row: ExcelJS.Row, cols: number, urgency: CommitUrgency) {
  if (!urgency) return;
  const st = URGENCY_STYLE[urgency];
  for (let col = 1; col <= cols; col++) {
    const cell = row.getCell(col);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: st.fill } };
    cell.font = { ...(cell.font ?? {}), color: { argb: st.font }, bold: urgency === "today" };
  }
}

/** Lo mínimo que necesitan el PDF y el Excel (sirve un inventario guardado o uno en captura). */
export interface InventoryDocReport {
  /** initial | dex | final (para el nombre del archivo). */
  type?: string | null;
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
  /** Hoja extra "Contra el anterior" (detalle): guías que ya no están, con su grupo. */
  compareSheet?: { title: string; rows: Record<string, string>[]; urgency?: CommitUrgency[] };
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
  const COLS = 15;
  const lastCol = "O";
  const now = new Date();

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
  const legend = sheet.addRow([
    "Rojo: vence hoy · Naranja: vence mañana · Días en bodega: desde que se registró en el sistema (si sigue en bodega, en ruta o con DEX) · Fecha entrega / DEX: cuándo se entregó o cuándo tuvo el DEX",
  ]);
  legend.font = { italic: true, size: 9, color: { argb: "666666" } };
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
    "Vence",
    "Hora vence",
    "Celular",
    "Estatus",
    "Registrado en sistema",
    "Días en bodega",
    "Fecha entrega / DEX",
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
      pkg.status ? getStatusBadge(String(pkg.status)).label : "",
      pkg.createdAt ? format(toZonedTime(new Date(pkg.createdAt), timeZone), "yyyy-MM-dd HH:mm") : "",
      daysInWarehouse({ status: pkg.status, createdAt: pkg.createdAt }, now) ?? "",
      (() => {
        const d = deliveryOrDexDate(pkg);
        return d ? format(toZonedTime(d, timeZone), "yyyy-MM-dd HH:mm") : "";
      })(),
    ]);

    const urgency = commitUrgency(pkg.commitDateTime, now, pkg.status);

    // Filas alternadas en gris (las que vencen hoy/mañana van en rojo/naranja)
    if (!urgency && index % 2 === 0) {
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
    paintUrgency(row, COLS, urgency);
  });

  // Filtro en los nombres de columna y encabezado fijo al bajar.
  const lastDataRow = headerRow.number + packages.length;
  if (packages.length > 0) {
    sheet.autoFilter = { from: { row: headerRow.number, column: 1 }, to: { row: lastDataRow, column: COLS } };
  }
  sheet.views = [{ state: "frozen", ySplit: headerRow.number }];

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
  sheet.getColumn(12).width = 18; // Estatus
  sheet.getColumn(13).width = 20; // Registrado en sistema
  sheet.getColumn(14).width = 14; // Días en bodega
  sheet.getColumn(15).width = 20; // Fecha entrega / DEX

  // === HOJA "CONTRA EL ANTERIOR" (opcional) ===
  if (options.compareSheet && options.compareSheet.rows.length > 0) {
    const cs = workbook.addWorksheet("Contra el anterior");
    cs.addRow([options.compareSheet.title]).font = { bold: true, size: 12 };
    cs.addRow([]);
    const headers = Object.keys(options.compareSheet.rows[0]);
    const head = cs.addRow(headers);
    head.font = { bold: true, color: { argb: "FFFFFF" } };
    head.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "ef883a" } };
    });
    options.compareSheet.rows.forEach((r, i) => {
      const row = cs.addRow(headers.map((h) => r[h] ?? ""));
      paintUrgency(row, headers.length, options.compareSheet!.urgency?.[i] ?? null);
    });
    cs.autoFilter = { from: { row: head.number, column: 1 }, to: { row: head.number + options.compareSheet.rows.length, column: headers.length } };
    cs.views = [{ state: "frozen", ySplit: head.number }];
    headers.forEach((h, i) => {
      cs.getColumn(i + 1).width = Math.min(48, Math.max(12, h.length + 4, ...options.compareSheet!.rows.map((r) => String(r[h] ?? "").length + 2)));
    });
  }

  // === EXPORTACIÓN ===
  const buffer = await workbook.xlsx.writeBuffer();
  if (forDownload) {
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${inventoryFileBase(report)}.xlsx`
    );
  }

  return buffer;
}
