import ExcelJS from "exceljs";
import { daysWithPackage } from "@/lib/days-with-package";

const prettyStatus = (s?: string) => (!s ? "—" : s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()));
const catLabel = (c?: string) => (c === "hoy" ? "Al día" : c === "nunca" ? "Nunca" : "Con días sin código");

/** Fecha/hora SIEMPRE en hora de Hermosillo (no la de la computadora que exporta). */
const herFmt = (value?: string | Date | null, withTime = true): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Hermosillo", day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(d).map((x) => [x.type, x.value]),
  );
  const date = `${p.day}/${p.month}/${p.year}`;
  return withTime ? `${date} ${p.hour}:${p.minute}` : date;
};

// Gravedad por días sin código: verde = al día, ámbar = 1 día, rojo = 2+ días o nunca.
type Tone = "ok" | "warn" | "bad";
const TONES: Record<Tone, { bg: string; fg: string }> = {
  ok: { bg: "FFDCFCE7", fg: "FF166534" },
  warn: { bg: "FFFEF3C7", fg: "FF92400E" },
  bad: { bg: "FFFEE2E2", fg: "FF991B1B" },
};
const toneOf = (r: any): Tone => (r.daysSinceLastCode == null ? "bad" : r.daysSinceLastCode === 0 ? "ok" : r.daysSinceLastCode === 1 ? "warn" : "bad");
// Nunca primero, luego más días sin código, y a igualdad, el paquete más viejo.
const severity = (r: any) => (r.daysSinceLastCode == null ? Number.MAX_SAFE_INTEGER : Number(r.daysSinceLastCode));

const HEADER_BG = "FF1E293B";
const BORDER = { style: "thin" as const, color: { argb: "FFE2E8F0" } };

function paintTone(cell: ExcelJS.Cell, tone: Tone) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TONES[tone].bg } };
  cell.font = { bold: true, color: { argb: TONES[tone].fg } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

function styleHeader(row: ExcelJS.Row, count: number) {
  row.height = 22;
  for (let c = 1; c <= count; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }
}

/** Título + subtítulo + renglón de totales con color. Devuelve el siguiente renglón libre. */
function writeTop(ws: ExcelJS.Worksheet, width: number, subtitle: string, rows: any[]) {
  const last = String.fromCharCode(64 + Math.min(width, 26));
  const t = ws.addRow(["Reporte sin código 44 / 67"]);
  ws.mergeCells(`A${t.number}:${last}${t.number}`);
  t.font = { size: 15, bold: true, color: { argb: "FF0F172A" } };
  t.height = 24;
  const s = ws.addRow([subtitle]);
  ws.mergeCells(`A${s.number}:${last}${s.number}`);
  s.font = { size: 10, color: { argb: "FF64748B" } };

  const count = (cat: string) => rows.filter((r) => r.category === cat).length;
  const totals = ws.addRow([
    `Paquetes: ${rows.length}`, "",
    `Al día: ${count("hoy")}`, "",
    `Con días sin código: ${count("sinCodigo")}`, "",
    `Nunca: ${count("nunca")}`,
  ]);
  totals.height = 20;
  ws.mergeCells(`A${totals.number}:B${totals.number}`);
  ws.mergeCells(`C${totals.number}:D${totals.number}`);
  ws.mergeCells(`E${totals.number}:F${totals.number}`);
  totals.getCell(1).font = { bold: true };
  paintTone(totals.getCell(3), "ok");
  paintTone(totals.getCell(5), "warn");
  paintTone(totals.getCell(7), "bad");
  ws.addRow([]);
}

/**
 * Excel del reporte "Sin código 44" generado en el CLIENTE a partir de las filas en pantalla
 * (incluye la confirmación de FedEx cuando ya se consultó). Dos hojas, ambas con el filtro de
 * Excel ya activado y el encabezado fijo:
 *  1) "Detalle" — una guía por renglón, de la más atrasada a la menos, con color por gravedad.
 *  2) "Por sucursal" — conteos Al día / Con días sin código / Nunca.
 * `meta.scope` (opcional) describe la selección (sucursales o zona) para el subtítulo.
 */
export async function buildVisibility44Excel(rows: any[], meta?: { scope?: string; period?: string }): Promise<Blob> {
  const consulted = rows.some((r) => r.__diasSin44 != null || r.__fedexStatus);
  const sorted = [...rows].sort(
    (a, b) => severity(b) - severity(a) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const subtitle = [
    meta?.scope,
    meta?.period ?? "Paquetes FedEx activos (pendiente / en bodega)",
    `Generado: ${herFmt(new Date())} (hora de Hermosillo)`,
    consulted ? "Confirmado con FedEx" : "Estimado con datos del sistema",
  ].filter(Boolean).join("  ·  ");

  const wb = new ExcelJS.Workbook();

  // ---- Hoja 1: Detalle ----
  const ws = wb.addWorksheet("Detalle");
  const headers = [
    "Guía", "Sucursal", "Código", "Estatus", "Días sin código", "Último escaneo", "Visibilidad",
    "Días con el paquete", "Alta en sistema", "Destinatario", "CP",
  ];
  const widths = [18, 20, 9, 14, 11, 18, 20, 11, 13, 30, 9];
  if (consulted) {
    headers.push("Estatus FedEx", "Días faltantes (FedEx)", "Fechas faltantes", "Último movimiento", "Movimientos");
    widths.push(18, 12, 30, 40, 70);
  }
  writeTop(ws, headers.length, subtitle, rows);
  const hr = ws.addRow(headers);
  styleHeader(hr, headers.length);
  const col = (name: string) => headers.indexOf(name) + 1;

  for (const r of sorted) {
    const values: any[] = [
      String(r.trackingNumber || ""),
      r.subsidiaryName || "—",
      String(r.scanCode ?? "—"),
      prettyStatus(r.status),
      r.daysSinceLastCode == null ? "Nunca" : Number(r.daysSinceLastCode),
      herFmt(r.lastCodeDate),
      catLabel(r.category),
      daysWithPackage(r.createdAt) ?? "—",
      herFmt(r.createdAt, false),
      r.recipientName || "",
      r.recipientZip || "",
    ];
    if (consulted) {
      const missing: string[] = r.__missing44 || [];
      const movs: { date: string; description: string }[] = r.__events || [];
      values.push(
        r.__fedexStatus === "SIN_DATOS" ? "Sin datos" : prettyStatus(r.__fedexStatus),
        r.__diasSin44 == null ? "—" : Number(r.__diasSin44),
        missing.length ? missing.join(", ") : r.__diasSin44 === 0 ? "Al día" : "—",
        r.__lastMovement ? `${herFmt(r.__lastMovement.date)} — ${r.__lastMovement.description}` : "—",
        movs.length ? movs.map((m) => `${herFmt(m.date, false)}: ${m.description}`).join(" | ") : "—",
      );
    }
    const row = ws.addRow(values);
    row.eachCell({ includeEmpty: true }, (cell) => { cell.border = { bottom: BORDER }; cell.alignment = { vertical: "middle" }; });
    row.getCell(col("Guía")).font = { name: "Consolas" };
    for (const name of ["Código", "Días con el paquete", "CP"]) row.getCell(col(name)).alignment = { horizontal: "center", vertical: "middle" };
    const tone = toneOf(r);
    paintTone(row.getCell(col("Días sin código")), tone);
    paintTone(row.getCell(col("Visibilidad")), tone);
  }

  ws.columns.forEach((c, i) => { c.width = widths[i] ?? 14; });
  ws.autoFilter = { from: { row: hr.number, column: 1 }, to: { row: hr.number, column: headers.length } };
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: hr.number }];

  // ---- Hoja 2: Por sucursal ----
  const ps = wb.addWorksheet("Por sucursal");
  const bySub = new Map<string, { total: number; hoy: number; sinCodigo: number; nunca: number }>();
  for (const r of rows) {
    const k = r.subsidiaryName || "—";
    const g = bySub.get(k) ?? { total: 0, hoy: 0, sinCodigo: 0, nunca: 0 };
    g.total++;
    if (r.category === "hoy") g.hoy++;
    else if (r.category === "nunca") g.nunca++;
    else g.sinCodigo++;
    bySub.set(k, g);
  }
  const ph = ps.addRow(["Sucursal", "Paquetes", "Al día", "Con días sin código", "Nunca"]);
  styleHeader(ph, 5);
  const groups = [...bySub.entries()].sort((a, b) => (b[1].sinCodigo + b[1].nunca) - (a[1].sinCodigo + a[1].nunca) || a[0].localeCompare(b[0]));
  for (const [name, g] of groups) {
    const row = ps.addRow([name, g.total, g.hoy, g.sinCodigo, g.nunca]);
    row.eachCell((cell) => { cell.border = { bottom: BORDER }; });
    if (g.sinCodigo) paintTone(row.getCell(4), "warn");
    if (g.nunca) paintTone(row.getCell(5), "bad");
  }
  const tot = ps.addRow([
    "Total", rows.length,
    groups.reduce((s, [, g]) => s + g.hoy, 0),
    groups.reduce((s, [, g]) => s + g.sinCodigo, 0),
    groups.reduce((s, [, g]) => s + g.nunca, 0),
  ]);
  tot.font = { bold: true };
  tot.eachCell((cell) => { cell.border = { top: { style: "thin", color: { argb: "FF94A3B8" } } }; });
  ps.columns.forEach((c, i) => { c.width = [24, 11, 10, 20, 10][i]; });
  ps.autoFilter = { from: { row: ph.number, column: 1 }, to: { row: ph.number, column: 5 } };
  ps.views = [{ state: "frozen", ySplit: ph.number }];

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
