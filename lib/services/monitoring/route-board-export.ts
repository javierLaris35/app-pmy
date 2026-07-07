import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { RouteBoardItem } from "./route-monitor";
import { severityOf, pillLabel, SEVERITY_HEX, type Severity } from "./route-board-severity";
import { fmtTime, fmtDateTimeShort } from "./route-board-format";
import { formatCurrency } from "@/lib/utils";

interface ExportMeta {
  subsidiaryName?: string;
  date: string;
}

interface ExportRow {
  estado: string; ruta: string; trackingNumber: string; chofer: string; vehiculo: string;
  creada: string; inicio: string; progreso: string; guias: number; f2: number; criticas: number; atencion: number;
  cobrosEnMano: number; cobrosPendientes: number;
  ultimaActividad: string; cierre: string; sev: Severity;
}

function rowsFor(items: RouteBoardItem[]): ExportRow[] {
  return items.map((it) => {
    const sev = severityOf(it);
    return {
      estado: pillLabel(it, sev),
      ruta: it.routeNames || it.trackingNumber,
      trackingNumber: it.trackingNumber,
      chofer: it.driverNames || "Sin chofer",
      vehiculo: it.vehiclePlate || "—",
      creada: fmtDateTimeShort(it.createdAt),
      inicio: it.startTime ? (fmtTime(it.startTime) as string) : "Sin salir",
      progreso: `${it.visitedStops}/${it.totalStops}`,
      guias: it.normalPackageCount,
      f2: it.chargePackageCount,
      criticas: it.criticalAlerts,
      atencion: it.warningAlerts,
      cobrosEnMano: it.paymentsCollectedTotal,
      cobrosPendientes: it.paymentsPendingTotal,
      ultimaActividad: it.lastActivityAt ? (fmtTime(it.lastActivityAt) as string) : "—",
      cierre: it.routeClosedAt ? (fmtTime(it.routeClosedAt) as string) : "—",
      sev,
    };
  });
}

/** Excel del tablero — una fila por ruta con su estado, chofer, progreso y alertas. */
export async function buildRouteBoardExcel(items: RouteBoardItem[], meta: ExportMeta): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Tablero de rutas");
  const headers = ["Estado", "Ruta", "Guía/Tracking", "Chofer", "Vehículo", "Creada", "Inicio", "Progreso", "Guías", "F2", "Críticas", "Atención", "Cobros en mano", "Cobros pendientes", "Última actividad", "Cierre"];

  const title = ws.addRow([`Monitoreo de rutas${meta.subsidiaryName ? " — " + meta.subsidiaryName : ""} — ${meta.date}`]);
  ws.mergeCells(`A${title.number}:P${title.number}`);
  title.font = { size: 14, bold: true, color: { argb: "FFFFFF" } };
  title.alignment = { vertical: "middle", horizontal: "center" };
  for (let c = 1; c <= headers.length; c++) ws.getCell(title.number, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4338CA" } };
  ws.addRow([`Generado: ${new Date().toLocaleString("es-MX")}`]);
  ws.addRow([]);

  const hr = ws.addRow(headers);
  hr.font = { bold: true, color: { argb: "FFFFFF" } };
  hr.alignment = { vertical: "middle", horizontal: "center" };
  for (let c = 1; c <= headers.length; c++) ws.getCell(hr.number, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "3730A3" } };

  const rows = rowsFor(items);
  for (const r of rows) {
    const row = ws.addRow([
      r.estado, r.ruta, r.trackingNumber, r.chofer, r.vehiculo, r.creada, r.inicio, r.progreso,
      r.guias, r.f2, r.criticas, r.atencion, r.cobrosEnMano, r.cobrosPendientes, r.ultimaActividad, r.cierre,
    ]);
    row.getCell(1).font = { bold: true, color: { argb: SEVERITY_HEX[r.sev].replace("#", "").toUpperCase() } };
    if (r.criticas > 0) row.getCell(11).font = { bold: true, color: { argb: "E11D48" } };
    if (r.atencion > 0) row.getCell(12).font = { bold: true, color: { argb: "D97706" } };
    row.getCell(13).numFmt = '"$"#,##0.00';
    row.getCell(14).numFmt = '"$"#,##0.00';
    if (r.cobrosEnMano > 0) row.getCell(13).font = { bold: true, color: { argb: "047857" } };
  }
  ws.columns.forEach((col, i) => { col.width = [11, 24, 16, 20, 12, 18, 10, 10, 7, 6, 9, 9, 14, 14, 16, 10][i] ?? 14; });
  if (rows.length > 0) ws.autoFilter = { from: `A${hr.number}`, to: `P${hr.number}` };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/** PDF del tablero — mismo contenido que el Excel, en una tabla lista para imprimir/compartir. */
export function buildRouteBoardPdf(items: RouteBoardItem[], meta: ExportMeta): Blob {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Monitoreo de rutas${meta.subsidiaryName ? " — " + meta.subsidiaryName : ""}`, 14, 15);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${meta.date}  ·  Generado: ${new Date().toLocaleString("es-MX")}`, 14, 21);

  const rows = rowsFor(items);
  autoTable(doc, {
    startY: 26,
    head: [["Estado", "Ruta", "Chofer", "Vehículo", "Creada", "Inicio", "Progreso", "Guías", "F2", "Críticas", "Atención", "En mano", "Pendiente", "Últ. actividad", "Cierre"]],
    body: rows.map((r) => [
      r.estado, r.ruta, r.chofer, r.vehiculo, r.creada, r.inicio, r.progreso,
      String(r.guias), String(r.f2), String(r.criticas), String(r.atencion),
      formatCurrency(r.cobrosEnMano), formatCurrency(r.cobrosPendientes), r.ultimaActividad, r.cierre,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [55, 48, 163], textColor: 255 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        const sev = rows[data.row.index]?.sev;
        if (sev) {
          const hex = SEVERITY_HEX[sev];
          data.cell.styles.textColor = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  return doc.output("blob");
}
