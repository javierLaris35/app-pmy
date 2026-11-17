import type { CommitBucket, SuggestedPackage } from "./route-suggestions";

export const BUCKET_LABEL: Record<CommitBucket, string> = {
  vencido: "Vencido",
  hoy: "Hoy",
  manana: "Mañana",
  despues: "Después",
  sin_fecha: "Sin fecha",
};

/** Estatus en llano para el usuario (los de "en bodega" que traen las sugerencias). */
export const statusLabel = (status: string) =>
  (
    {
      en_bodega: "En bodega",
      pendiente: "Pendiente",
      recibido_en_bodega: "Recibido en bodega",
      llegado_despues: "Llegó después",
      cliente_no_disponible: "Cliente no disponible",
      cambio_fecha_solicitado: "Cambio de fecha solicitado",
    } as Record<string, string>
  )[status] ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");

export const formatCommitDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

/** Excel de los paquetes de una ruta sugerida (lo que se ve con filtros, o lo seleccionado). */
export async function exportSuggestedPackagesExcel(packages: SuggestedPackage[], meta: { title: string; subsidiaryName?: string }) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Paquetes en bodega");
  const headers = ["Guía", "Paquetería", "Tipo", "CP", "Destinatario", "Dirección", "Vencimiento", "Fecha de vencimiento", "Días en bodega", "Estatus"];

  const title = ws.addRow([`${meta.title}${meta.subsidiaryName ? " — " + meta.subsidiaryName : ""}`]);
  ws.mergeCells(`A${title.number}:J${title.number}`);
  title.font = { size: 14, bold: true };
  ws.addRow([`Generado: ${new Date().toLocaleString("es-MX")} · ${packages.length} paquetes`]);
  ws.addRow([]);

  const hr = ws.addRow(headers);
  hr.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E3A8A" } };
  });

  for (const p of packages) {
    ws.addRow([
      p.trackingNumber,
      p.carrier === "dhl" ? "DHL" : "FedEx",
      p.kind === "charge" ? "Carga" : "Paquete",
      p.zip ?? "",
      p.recipientName ?? "",
      p.recipientAddress ?? "",
      BUCKET_LABEL[p.bucket],
      formatCommitDate(p.commitDateTime),
      p.daysInWarehouse,
      statusLabel(p.status),
    ]);
  }
  [16, 11, 10, 9, 28, 40, 13, 18, 14, 24].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ws.autoFilter = { from: { row: hr.number, column: 1 }, to: { row: hr.number, column: headers.length } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${meta.title.replace(/[^\w\- áéíóúñÁÉÍÓÚÑ]/g, "").trim() || "paquetes"} ${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
