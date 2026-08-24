import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type {
  DashboardStats,
  ExpiringPackage,
  PackageContactFields,
  PendingPackage,
  WithoutDEXPackage,
} from "@/components/welcome-dashboard/types";
import type { FedexVerifyResult } from "@/lib/services/dashboard";

interface ExportWelcomeInput {
  stats: DashboardStats;
  expiringPackages: ExpiringPackage[];
  withoutDEXPackages: WithoutDEXPackage[];
  pendingPackages: PendingPackage[];
  /** Etiqueta del alcance (nombre de sucursal o "Todas las sucursales"). */
  scopeLabel: string;
  /** Resultados de la comprobación FedEx, si se ejecutó (para añadir columnas). */
  fedexResults?: Map<string, FedexVerifyResult>;
}

const HEADER_FILL = "3d2b1f"; // café de marca (consistente con el resto de exportables)

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("es-MX") : "—");

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${HEADER_FILL}` } };
}

/** Columnas comunes de contacto/logística (mismo orden en las tres hojas de detalle). */
const contactColumns: Partial<ExcelJS.Column>[] = [
  { header: "Guía", key: "trackingNumber", width: 22 },
  { header: "Paquetería", key: "carrier", width: 12 },
  { header: "Destinatario", key: "recipientName", width: 28 },
  { header: "Teléfono", key: "recipientPhone", width: 16 },
  { header: "Dirección", key: "recipientAddress", width: 40 },
  { header: "Ciudad", key: "recipientCity", width: 20 },
  { header: "CP", key: "recipientZip", width: 10 },
  { header: "Fecha compromiso", key: "commitDateTime", width: 22 },
  { header: "Consolidado", key: "consNumber", width: 16 },
  { header: "Sucursal", key: "subsidiaryName", width: 20 },
];

type ContactRow = PackageContactFields & {
  trackingNumber: string;
  recipientName: string;
  subsidiaryName: string;
};

/** Celdas comunes a partir de un paquete (usa `commitDateTime`, cae a `fallbackDate`). */
function contactCells(p: ContactRow, fallbackDate?: string | null) {
  return {
    trackingNumber: p.trackingNumber,
    carrier: p.carrier || "—",
    recipientName: p.recipientName,
    recipientPhone: p.recipientPhone || "—",
    recipientAddress: p.recipientAddress || "—",
    recipientCity: p.recipientCity || "—",
    recipientZip: p.recipientZip || "—",
    commitDateTime: fmtDate(p.commitDateTime ?? fallbackDate),
    consNumber: p.consNumber || "—",
    subsidiaryName: p.subsidiaryName,
  };
}

/** Exporta el resumen operativo a un .xlsx: hoja Resumen + 3 hojas de detalle. */
export async function exportWelcomeToExcel({
  stats,
  expiringPackages,
  withoutDEXPackages,
  pendingPackages,
  scopeLabel,
  fedexResults,
}: ExportWelcomeInput) {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  const fx = fedexResults && fedexResults.size ? fedexResults : undefined;
  const fedexCols: Partial<ExcelJS.Column>[] = fx
    ? [
        { header: "FedEx: Estatus", key: "fxStatus", width: 22 },
        { header: "FedEx: Último evento", key: "fxEvent", width: 34 },
      ]
    : [];
  const fedexCells = (tracking: string) => {
    if (!fx) return {};
    const r = fx.get(tracking);
    if (!r) return { fxStatus: "— (no verificado)", fxEvent: "" };
    if (!r.found) return { fxStatus: r.error ? `Error: ${r.error}` : "No encontrado", fxEvent: "" };
    return { fxStatus: r.status || "—", fxEvent: r.lastEvent?.description || "" };
  };

  // --- Hoja 1: Resumen ---
  const resumen = wb.addWorksheet("Resumen");
  resumen.columns = [
    { header: "Indicador", key: "k", width: 30 },
    { header: "Valor", key: "v", width: 24 },
  ];
  styleHeader(resumen.getRow(1));
  resumen.addRow({ k: "Alcance", v: scopeLabel });
  resumen.addRow({ k: "Generado", v: new Date().toLocaleString("es-MX") });
  resumen.addRow({ k: "Vencen hoy", v: stats.expiringToday });
  resumen.addRow({ k: "Sin escaneo local", v: stats.withoutDEX });
  resumen.addRow({ k: "Pendientes (días anteriores)", v: stats.pendingYesterday });

  // --- Hoja 2: Vencen hoy ---
  const wsExp = wb.addWorksheet("Vencen hoy");
  wsExp.columns = [
    ...contactColumns,
    { header: "Estatus", key: "status", width: 22 },
    { header: "Horas restantes", key: "hoursRemaining", width: 16 },
    ...fedexCols,
  ];
  styleHeader(wsExp.getRow(1));
  expiringPackages.forEach((p) =>
    wsExp.addRow({
      ...contactCells(p, p.expiryDate),
      status: p.status || "—",
      hoursRemaining: p.hoursRemaining,
      ...fedexCells(p.trackingNumber),
    }),
  );

  // --- Hoja 3: Sin escaneo ---
  const wsDex = wb.addWorksheet("Sin escaneo");
  wsDex.columns = [
    ...contactColumns,
    { header: "Estatus", key: "status", width: 22 },
    { header: "Falta", key: "missingDocument", width: 16 },
    ...fedexCols,
  ];
  styleHeader(wsDex.getRow(1));
  withoutDEXPackages.forEach((p) =>
    wsDex.addRow({
      ...contactCells(p),
      status: p.status || "—",
      missingDocument: p.missingDocument,
      ...fedexCells(p.trackingNumber),
    }),
  );

  // --- Hoja 4: Pendientes ---
  const wsPen = wb.addWorksheet("Pendientes");
  wsPen.columns = [
    ...contactColumns,
    { header: "Estatus", key: "status", width: 22 },
    ...fedexCols,
  ];
  styleHeader(wsPen.getRow(1));
  pendingPackages.forEach((p) =>
    wsPen.addRow({
      ...contactCells(p, p.createdAt),
      status: p.status || "—",
      ...fedexCells(p.trackingNumber),
    }),
  );

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const safeLabel = scopeLabel.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
  saveAs(blob, `Resumen_Operativo_${safeLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
