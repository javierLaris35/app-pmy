"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Eye, FileText, FileSpreadsheet, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { EmailStatus } from "@/lib/types"
import type { ReturningBatch } from "@/lib/services/returning"
import { downloadReturningPdf, downloadReturningExcel } from "@/lib/services/returning/download-files"
import ResendEmailButton from "./resend-email-button"

interface Props {
  batch: ReturningBatch
  /** Abre el detalle de la salida (estado del contenedor). */
  onView: (id: string) => void
  /** Se llama tras un reenvío para refrescar el listado. */
  onResent?: () => void
}

/**
 * Acciones por fila del historial de salidas: todas como ICONOS con tooltip.
 * PDF y Excel (regeneración/descarga sin envío) solo se muestran para salidas cuyo correo
 * YA se envió (`emailStatus === SENT`).
 */
export default function ReturningRowActions({ batch, onView, onResent }: Props) {
  const { toast } = useToast()
  const [pdfLoading, setPdfLoading] = useState(false)
  const [excelLoading, setExcelLoading] = useState(false)

  const alreadySent = batch.emailStatus === EmailStatus.SENT

  const handlePdf = async () => {
    setPdfLoading(true)
    try {
      await downloadReturningPdf(batch.id)
    } catch (e: any) {
      toast({
        title: "No se pudo generar el PDF",
        description: e?.message || "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setPdfLoading(false)
    }
  }

  const handleExcel = async () => {
    setExcelLoading(true)
    try {
      await downloadReturningExcel(batch.id)
    } catch (e: any) {
      toast({
        title: "No se pudo generar el Excel",
        description: e?.message || "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setExcelLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => onView(batch.id)}>
            <Eye className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ver detalle</TooltipContent>
      </Tooltip>

      {alreadySent && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" onClick={handlePdf} disabled={pdfLoading}>
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Descargar PDF</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" onClick={handleExcel} disabled={excelLoading}>
                {excelLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Descargar Excel</TooltipContent>
          </Tooltip>
        </>
      )}

      <ResendEmailButton batch={batch} onResent={onResent} />
    </div>
  )
}
