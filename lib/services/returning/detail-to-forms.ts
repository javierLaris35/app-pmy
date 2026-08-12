import { getReturningDetail } from "@/lib/services/returning"

/** Fecha local dd-mm-aaaa para nombrar los archivos, igual que en la creación. */
export function returningFileDate(): string {
  return new Date()
    .toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
    .replace(/\//g, "-")
}

/**
 * Reconstruye, a partir del detalle persistido de una SALIDA, las formas que consumen el
 * generador de PDF (`EnhancedFedExPDF`) y de Excel (`generateFedExExcel`), más el nombre base
 * del archivo. Fuente única para el reenvío de correo y para la descarga de PDF/Excel del
 * historial, de modo que ambos flujos produzcan documentos idénticos.
 */
export async function buildReturningForms(salidaId: string) {
  const detail = await getReturningDetail(salidaId)
  const subsidiaryName = detail.subsidiary?.name ?? ""

  const collections = (detail.collections ?? []).map((c) => ({
    trackingNumber: c.trackingNumber,
    subsidiary: { id: detail.subsidiary?.id ?? "" },
    status: c.status ?? null,
    date: "",
    isPickUp: c.isPickUp,
  }))

  const devolutions = (detail.devolutions ?? []).map((d) => ({
    id: "",
    trackingNumber: d.trackingNumber,
    subsidiaryName,
    date: "",
    hasIncome: false,
    status: d.reason ?? "",
    lastStatus: { type: d.reason ?? null, exceptionCode: d.reason ?? null },
    reason: d.reason ?? "",
  }))

  const driver = (detail.drivers?.[0]?.name ?? "CHOFER").toUpperCase()
  const baseName = `${driver}--${subsidiaryName}--Devoluciones--${returningFileDate()}`

  return { detail, subsidiaryName, collections, devolutions, baseName }
}
