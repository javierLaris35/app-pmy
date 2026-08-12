import { pdf } from "@react-pdf/renderer"
import { mapToPackageInfo } from "@/lib/utils"
import { getShipmensByDispatchId, uploadPDFile, type ResendEmailResult } from "@/lib/services/package-dispatchs"
import { FedExPackageDispatchPDF } from "./package-dispatch-pdf-generator"
import { generateDispatchExcelClient } from "./package-dispatch-excel-generator"

/** Fecha local dd-mm-aaaa para nombrar los archivos, igual que en la creación. */
function fileDate(): string {
  return new Date()
    .toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
    .replace(/\//g, "-")
}

/**
 * Regenera el PDF y el Excel de una salida a ruta EN EL CLIENTE (con los mismos
 * componentes que la creación) y los sube al backend, que los guarda, registra
 * en la bitácora y (re)envía el correo. Es la vía confiable para el reenvío,
 * porque el PDF real solo lo produce el cliente (`@react-pdf/renderer`); el
 * backend no puede regenerarlo.
 */
export async function regenerateAndSendDispatchEmail(
  dispatchId: string,
  opts?: { isResend?: boolean },
): Promise<ResendEmailResult> {
  const dispatch = await getShipmensByDispatchId(dispatchId)

  const subsidiaryName = dispatch.subsidiary?.name ?? ""
  const sortByCp = dispatch.subsidiary?.sortDispatchByPostalCode ?? true
  const packages = mapToPackageInfo(dispatch.shipments ?? [], dispatch.chargeShipments ?? [])

  const driver = (dispatch.drivers?.[0]?.name ?? "CHOFER").toUpperCase()
  const baseName = `${driver}--${subsidiaryName}--Salida a Ruta--${fileDate()}`

  // PDF (mismo componente que la creación).
  const pdfBlob = await pdf(
    <FedExPackageDispatchPDF
      key={Date.now()}
      drivers={dispatch.drivers ?? []}
      routes={dispatch.routes ?? []}
      vehicle={dispatch.vehicle as any}
      packages={packages}
      invalidTrackings={[]}
      subsidiaryName={subsidiaryName}
      trackingNumber={dispatch.trackingNumber}
      packageDispatch={dispatch}
      sortByPostalCode={sortByCp}
    />,
  ).toBlob()
  const pdfFile = new File([pdfBlob], `${baseName}.pdf`, { type: "application/pdf" })

  // Excel (mismo generador que la creación).
  const excelBuffer = await generateDispatchExcelClient(dispatch, [], false, sortByCp)
  const excelFile = new File(
    [new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })],
    `${baseName}.xlsx`,
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  )

  return uploadPDFile(pdfFile, excelFile, subsidiaryName, dispatchId, undefined, { isResend: opts?.isResend })
}
