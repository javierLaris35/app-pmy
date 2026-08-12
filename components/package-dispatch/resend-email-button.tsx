"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { MailCheck, MailWarning, MailX, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { EMAIL_TYPE_LABELS, EmailStatus, type EmailLog, type PackageDispatchResponse } from "@/lib/types"
import { getDispatchEmailHistory } from "@/lib/services/package-dispatchs"
import { regenerateAndSendDispatchEmail } from "@/lib/services/package-dispatch/regenerate-and-send"

interface Props {
  dispatch: PackageDispatchResponse
  /** Se llama tras un reenvío para refrescar el listado. */
  onResent?: () => void
}

/** Presentación (color/ícono/tooltip) según el estado de correo del despacho. */
function statusPresentation(status?: EmailStatus) {
  switch (status) {
    case EmailStatus.SENT:
      return { className: "bg-green-700 hover:bg-green-800", Icon: MailCheck }
    case EmailStatus.ERROR:
      return { className: "bg-red-700 hover:bg-red-800", Icon: MailWarning }
    default:
      return { className: "bg-gray-400 hover:bg-gray-500", Icon: MailX }
  }
}

function formatDate(value?: string | null) {
  if (!value) return ""
  return new Date(value).toLocaleString("es-MX")
}

/** Texto del tooltip según el estado. */
function tooltipText(dispatch: PackageDispatchResponse) {
  switch (dispatch.emailStatus) {
    case EmailStatus.SENT:
      return `Correo enviado el ${formatDate(dispatch.emailLastSentAt)}`
    case EmailStatus.ERROR:
      return `Error al enviar: ${dispatch.emailLastError || "desconocido"}`
    default:
      return "Aún no se ha enviado el correo. Clic para enviar."
  }
}

export default function ResendEmailButton({ dispatch, onResent }: Props) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<EmailLog[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [resending, setResending] = useState(false)

  const { className, Icon } = statusPresentation(dispatch.emailStatus)

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      setHistory(await getDispatchEmailHistory(dispatch.id))
    } catch {
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const openDialog = () => {
    setOpen(true)
    loadHistory()
  }

  const handleResend = async () => {
    setResending(true)
    try {
      const result = await regenerateAndSendDispatchEmail(dispatch.id, { isResend: true })
      if (result.status === "sent") {
        toast({ title: "Correo reenviado", description: result.to ? `Enviado a ${result.to}` : undefined })
      } else {
        toast({
          title: "No se pudo enviar",
          description: result.error || "Error desconocido",
          variant: "destructive",
        })
      }
      await loadHistory()
      onResent?.()
    } catch (e: any) {
      toast({
        title: "Error al reenviar",
        description: e?.response?.data?.message || e?.message || "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setResending(false)
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            className={`h-8 w-8 p-0 text-white ${className}`}
            onClick={openDialog}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltipText(dispatch)}</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Envíos de correo — {dispatch.trackingNumber}</DialogTitle>
            <DialogDescription>
              Historial de intentos de envío del correo de esta salida a ruta.
            </DialogDescription>
          </DialogHeader>

          {loadingHistory ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Cargando historial…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Todavía no hay envíos registrados para esta salida.
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((log) => (
                <div key={log.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={log.status === EmailStatus.SENT ? "success" : "destructive"}>
                        {log.status === EmailStatus.SENT ? "Enviado" : "Error"}
                      </Badge>
                      <Badge variant="secondary">{EMAIL_TYPE_LABELS[log.emailType] ?? log.emailType}</Badge>
                      {log.isResend && <Badge variant="outline">Reenvío</Badge>}
                    </div>
                    <span className="text-muted-foreground">{formatDate(log.createdAt)}</span>
                  </div>
                  <div className="mt-2 space-y-0.5 text-muted-foreground">
                    <p><span className="font-medium text-foreground">Para:</span> {log.to}</p>
                    {log.cc && <p><span className="font-medium text-foreground">CC:</span> {log.cc}</p>}
                    {log.subsidiaryName && <p><span className="font-medium text-foreground">Sucursal:</span> {log.subsidiaryName}</p>}
                    <p><span className="font-medium text-foreground">Realizado por:</span> {log.triggeredByName || "Sistema"}</p>
                    {log.error && (
                      <p className="text-red-600"><span className="font-medium">Error:</span> {log.error}</p>
                    )}
                    {log.attachmentsMeta?.length ? (
                      <p><span className="font-medium text-foreground">Adjuntos:</span> {log.attachmentsMeta.map((a) => a.filename).join(", ")}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleResend} disabled={resending} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
              {resending ? "Reenviando…" : "Reenviar correo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
