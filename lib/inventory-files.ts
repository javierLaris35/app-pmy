/**
 * Nombres y descarga de los archivos de inventario (PDF/Excel), iguales en captura, historial y
 * detalle: llevan la FECHA DEL INVENTARIO (no la de hoy), en hora de Hermosillo.
 *   INVENTARIO-FINAL--Cabo San Lucas--17-11-2026
 */
const TYPE_LABEL: Record<string, string> = { initial: "INICIAL", dex: "DEX", final: "FINAL" };

export function inventoryFileBase(report: {
  type?: string | null;
  subsidiary?: { name?: string | null } | null;
  inventoryDate?: string | Date | null;
}): string {
  const date = report.inventoryDate ? new Date(report.inventoryDate) : new Date();
  const day = new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Hermosillo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(Number.isNaN(date.getTime()) ? new Date() : date)
    .replace(/\//g, "-");
  const type = TYPE_LABEL[String(report.type ?? "")] ?? "INICIAL";
  const sub = (report.subsidiary?.name ?? "Sucursal").replace(/[\\/:*?"<>|]/g, " ").trim();
  return `INVENTARIO-${type}--${sub}--${day}`;
}

/**
 * Descarga un archivo generado. La URL se libera DESPUÉS (antes se liberaba al instante y en
 * algunos navegadores el PDF no alcanzaba a bajarse).
 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
