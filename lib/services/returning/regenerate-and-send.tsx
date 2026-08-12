import { pdf } from "@react-pdf/renderer"
import { EnhancedFedExPDF } from "@/lib/services/pdf-generator"
import { generateFedExExcel } from "@/lib/services/returning/returning-excel-generator"
import {
  getReturningDetail,
  uploadReturningFiles,
  type ReturningEmailResult,
} from "@/lib/services/returning"

/** Fecha local dd-mm-aaaa para nombrar los archivos, igual que en la creación. */
function fileDate(): string {
  return new Date()
    .toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
    .replace(/\//g, "-")
}

/**
 * Regenera el PDF y el Excel de una SALIDA en el CLIENTE (con los mismos componentes que la
 * creación) a partir de su detalle persistido, y los sube al backend, que los guarda, registra
 * en la bitácora y (re)envía el correo. Vía confiable para el reenvío: el PDF real solo lo
 * produce el cliente (`@react-pdf/renderer`).
 */
export async function regenerateAndSendReturningEmail(
  salidaId: string,
  opts?: { isResend?: boolean },
): Promise<ReturningEmailResult> {
  const detail = await getReturningDetail(salidaId)
  const subsidiaryName = detail.subsidiary?.name ?? ""

  // Reconstruye las formas que consumen el PDF/Excel a partir del detalle del lote.
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
  const baseName = `${driver}--${subsidiaryName}--Devoluciones--${fileDate()}`

  const pdfBlob = await pdf(
    <EnhancedFedExPDF
      key={Date.now()}
      collections={collections as any}
      devolutions={devolutions as any}
      subsidiaryName={subsidiaryName}
    />,
  ).toBlob()
  const pdfFile = new File([pdfBlob], `${baseName}.pdf`, { type: "application/pdf" })

  const excelBuffer = await generateFedExExcel(collections as any, devolutions as any, subsidiaryName, [], false)
  const excelFile = new File(
    [new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })],
    `${baseName}.xlsx`,
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  )

  return uploadReturningFiles(pdfFile, excelFile, subsidiaryName, salidaId, { isResend: opts?.isResend })
}
