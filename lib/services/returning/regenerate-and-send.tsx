import { pdf } from "@react-pdf/renderer"
import { EnhancedFedExPDF } from "@/lib/services/pdf-generator"
import { generateFedExExcel } from "@/lib/services/returning/returning-excel-generator"
import { uploadReturningFiles, type ReturningEmailResult } from "@/lib/services/returning"
import { buildReturningForms } from "./detail-to-forms"

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
  const { subsidiaryName, collections, devolutions, baseName } = await buildReturningForms(salidaId)

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
