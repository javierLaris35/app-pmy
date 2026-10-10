import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  carrierKeyOf,
  type CarrierKey,
  type CarrierStats,
  type DhlIncidentPackage,
  type ExpiringPackage,
  PackageContactFields,
  PendingPackage,
  WithoutDEXPackage,
} from "@/components/welcome-dashboard/types";
import type { FedexVerifyResult } from "@/lib/services/dashboard";

interface ExportWelcomeInput {
  /** Conteos por paquetería (FedEx y DHL nunca se mezclan). */
  byCarrier: CarrierStats;
  expiringPackages: ExpiringPackage[];
  withoutDEXPackages: WithoutDEXPackage[];
  pendingPackages: PendingPackage[];
  dhlIncidentPackages: DhlIncidentPackage[];
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

/**
 * Exporta el resumen operativo a un .xlsx: hoja Resumen (por paquetería) + hojas de detalle
 * SEPARADAS por paquetería — FedEx (vencen hoy / sin escaneo 44-67 / pendientes) y DHL
 * (vencen hoy / incidencias NH-BA-RD-CM / pendientes). Nunca se mezclan en una hoja.
 */
export async function exportWelcomeToExcel({
  byCarrier,
  expiringPackages,
  withoutDEXPackages,
  pendingPackages,
  dhlIncidentPackages,
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

  // --- Hoja 1: Resumen (por paquetería) ---
  const resumen = wb.addWorksheet("Resumen");
  resumen.columns = [
    { header: "Indicador", key: "k", width: 34 },
    { header: "FedEx", key: "fedex", width: 14 },
    { header: "DHL", key: "dhl", width: 14 },
  ];
  styleHeader(resumen.getRow(1));
  resumen.addRow({ k: "Alcance", fedex: scopeLabel });
  resumen.addRow({ k: "Generado", fedex: new Date().toLocaleString("es-MX") });
  resumen.addRow({ k: "Vencen hoy", fedex: byCarrier.fedex.expiringToday, dhl: byCarrier.dhl.expiringToday });
  resumen.addRow({ k: "Sin escaneo local (44/67)", fedex: byCarrier.fedex.withoutScan, dhl: "No aplica" });
  resumen.addRow({ k: "Incidencias DHL", fedex: "No aplica", dhl: byCarrier.dhl.incidents });
  for (const [code, v] of Object.entries(byCarrier.dhl.incidentsByCode)) {
    resumen.addRow({ k: `   ${code} · ${v.label}`, fedex: "", dhl: v.count });
  }
  resumen.addRow({ k: "Pendientes (días anteriores)", fedex: byCarrier.fedex.pendingYesterday, dhl: byCarrier.dhl.pendingYesterday });

  const ofCarrier = <T extends { carrier?: string }>(rows: T[], c: CarrierKey) => rows.filter((r) => carrierKeyOf(r.carrier) === c);
  const label: Record<CarrierKey, string> = { fedex: "FedEx", dhl: "DHL" };

  for (const c of ["fedex", "dhl"] as CarrierKey[]) {
    // La comprobación contra FedEx solo aplica a guías FedEx.
    const cols = c === "fedex" ? fedexCols : [];
    const fxCells = (t: string) => (c === "fedex" ? fedexCells(t) : {});

    // --- Vencen hoy ---
    const wsExp = wb.addWorksheet(`${label[c]} · Vencen hoy`);
    wsExp.columns = [
      ...contactColumns,
      { header: "Estatus", key: "status", width: 22 },
      { header: "Horas restantes", key: "hoursRemaining", width: 16 },
      ...cols,
    ];
    styleHeader(wsExp.getRow(1));
    ofCarrier(expiringPackages, c).forEach((p) =>
      wsExp.addRow({ ...contactCells(p, p.expiryDate), status: p.status || "—", hoursRemaining: p.hoursRemaining, ...fxCells(p.trackingNumber) }),
    );

    // --- FedEx: sin escaneo 44/67 · DHL: incidencias con sus códigos ---
    if (c === "fedex") {
      const wsDex = wb.addWorksheet("FedEx · Sin escaneo");
      wsDex.columns = [
        ...contactColumns,
        { header: "Estatus", key: "status", width: 22 },
        { header: "Escaneo", key: "missingDocument", width: 32 },
        ...cols,
      ];
      styleHeader(wsDex.getRow(1));
      ofCarrier(withoutDEXPackages, "fedex").forEach((p) =>
        wsDex.addRow({ ...contactCells(p), status: p.status || "—", missingDocument: p.missingDocument, ...fxCells(p.trackingNumber) }),
      );
    } else {
      const wsInc = wb.addWorksheet("DHL · Incidencias");
      wsInc.columns = [
        ...contactColumns,
        { header: "Código DHL", key: "dhlCode", width: 12 },
        { header: "Incidencia", key: "incident", width: 32 },
      ];
      styleHeader(wsInc.getRow(1));
      dhlIncidentPackages.forEach((p) =>
        wsInc.addRow({ ...contactCells({ ...p, carrier: "DHL" }, p.createdAt), dhlCode: p.dhlCode, incident: p.incident }),
      );
    }

    // --- Pendientes ---
    const wsPen = wb.addWorksheet(`${label[c]} · Pendientes`);
    wsPen.columns = [...contactColumns, { header: "Estatus", key: "status", width: 22 }, ...cols];
    styleHeader(wsPen.getRow(1));
    ofCarrier(pendingPackages, c).forEach((p) =>
      wsPen.addRow({ ...contactCells(p, p.createdAt), status: p.status || "—", ...fxCells(p.trackingNumber) }),
    );
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const safeLabel = scopeLabel.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
  saveAs(blob, `Resumen_Operativo_${safeLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
