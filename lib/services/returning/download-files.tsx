import { pdf } from "@react-pdf/renderer"
import { EnhancedFedExPDF } from "@/lib/services/pdf-generator"
import { generateFedExExcel } from "@/lib/services/returning/returning-excel-generator"
import { buildReturningForms } from "./detail-to-forms"

/** Descarga un Blob con el nombre dado, revocando el object URL tras un tiempo prudente. */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Regenera y DESCARGA el PDF de una salida a partir de su detalle persistido, sin enviar correo.
 * Mismos componentes que la creación/reenvío, por lo que el documento es idéntico.
 */
export async function downloadReturningPdf(salidaId: string): Promise<void> {
  const { subsidiaryName, collections, devolutions, baseName } = await buildReturningForms(salidaId)
  const blob = await pdf(
    <EnhancedFedExPDF
      key={Date.now()}
      collections={collections as any}
      devolutions={devolutions as any}
      subsidiaryName={subsidiaryName}
    />,
  ).toBlob()
  triggerDownload(blob, `${baseName}.pdf`)
}

/**
 * Regenera y DESCARGA el Excel de una salida a partir de su detalle persistido, sin enviar correo.
 * Usa `forDownload=false` para obtener el buffer y descargarlo con el nombre canónico de la salida.
 */
export async function downloadReturningExcel(salidaId: string): Promise<void> {
  const { subsidiaryName, collections, devolutions, baseName } = await buildReturningForms(salidaId)
  const buffer = await generateFedExExcel(collections as any, devolutions as any, subsidiaryName, [], false)
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  triggerDownload(blob, `${baseName}.xlsx`)
}
