import type { DiagnosisRow, ManualCountReport, ManualCountSources, ManualLists, Mark } from "@/lib/types/manual-count";

export type BadgeTone = "info" | "warn" | "bad" | "muted";

/** Etiqueta de "Dónde está en el sistema": Doble · No VAN · Carga · No existe (paquete normal = sin etiqueta). */
export function sourceBadge(r: Pick<DiagnosisRow, "source" | "cause">): { label: string; tone: BadgeTone } | null {
  if (r.cause === "DOBLE_PAQUETE_CARGA") return { label: "Doble", tone: "bad" };
  if (r.source === "novan") return { label: "No VAN", tone: "info" };
  if (r.source === "charge") return { label: "Carga", tone: "warn" };
  if (r.source === null) return { label: "No existe", tone: "muted" };
  return null;
}

/** Los 4 números del resultado del conteo, en palabras del usuario. */
export function countKpis(rows: DiagnosisRow[]) {
  const diff = rows.filter((r) => r.verdict !== "CUADRA" && r.verdict !== "ERROR_CONTEO");
  const countedNotCharged = diff.filter((r) => r.manual && !r.charged.length);
  const chargedNotCounted = diff.filter((r) => !r.manual && r.charged.length);
  return {
    matched: rows.filter((r) => r.verdict === "CUADRA").length,
    countedNotCharged: countedNotCharged.length,
    countedNotChargedNoVan: countedNotCharged.filter((r) => r.source === "novan").length,
    chargedNotCounted: chargedNotCounted.length,
    chargedNotCountedDoubles: chargedNotCounted.filter((r) => r.cause === "DOBLE_PAQUETE_CARGA").length,
    countErrors: rows.filter((r) => r.verdict === "ERROR_CONTEO").length,
  };
}

/** Listas que se contaron en UNA sucursal, rearmadas desde su reporte (para volver a comparar solo esa). */
export function listsFromReport(report: ManualCountReport, sources: ManualCountSources): ManualLists {
  const of = (m: Mark) => [...new Set(report.rows.filter((r) => r.manual === m).map((r) => r.trackingNumber))];
  return {
    pod: of("POD"),
    dex07: of("07"),
    dex08: of("08"),
    recolecciones: [...new Set((report.collections?.rows ?? []).filter((c) => c.counted).map((c) => c.trackingNumber))],
    sources,
  };
}
