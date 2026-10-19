"use client"

import { PmySpinner } from "@/components/ui/pmy-loader"
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Undo2 } from "lucide-react"
import { toast } from "@/lib/toast"
import { ApprovalImpact, getApprovalImpact, requestApproval } from "@/lib/services/approvals"

const MIN_REASON = 10

const STATUS_TEXT: Record<string, string> = {
  devuelto_a_fedex: "devuelto a FedEx",
  en_ruta: "en ruta",
  en_bodega: "en bodega",
  pendiente: "pendiente",
  entregado: "entregado",
  cambio_fecha_solicitado: "cambio de fecha (DEX17)",
  cliente_no_disponible: "cliente no disponible (DEX08)",
  direccion_incorrecta: "dirección incorrecta (DEX03)",
  rechazado: "rechazado (DEX07)",
  no_entregado: "no entregado",
}
const statusText = (s: string) => STATUS_TEXT[s] ?? s.replace(/_/g, " ")
const money = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" })

/**
 * Pide autorización para deshacer una devolución (registro equivocado, paquete que no regresó…).
 * Muestra qué se va a regresar y a quién se le pide; el encargado la aprueba desde su bandeja.
 */
export function UndoDevolutionDialog({
  open,
  onOpenChange,
  devolutionId,
  trackingNumber,
  onRequested,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  devolutionId: string
  trackingNumber: string
  onRequested?: () => void
}) {
  const [impact, setImpact] = useState<ApprovalImpact | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !devolutionId) return
    setImpact(null)
    setReason("")
    setReasonError(null)
    setLoadError(null)
    setLoading(true)
    getApprovalImpact("undo_devolution", devolutionId)
      .then(setImpact)
      .catch((e: any) => setLoadError(e?.response?.data?.message || "No se pudo revisar la devolución. Intenta de nuevo."))
      .finally(() => setLoading(false))
  }, [open, devolutionId])

  const submit = async () => {
    if (reason.trim().length < MIN_REASON) {
      setReasonError(`Escribe por qué (mínimo ${MIN_REASON} letras).`)
      return
    }
    setSending(true)
    try {
      await requestApproval("undo_devolution", devolutionId, { justification: reason.trim() })
      toast.success(`Solicitud enviada${impact?.approver?.name ? ` a ${impact.approver.name}` : ""}`)
      onRequested?.()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo enviar la solicitud. Intenta de nuevo.")
    } finally {
      setSending(false)
    }
  }

  const records = impact?.records ?? []
  const incomes = impact?.incomes ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" /> Deshacer devolución
          </DialogTitle>
          <DialogDescription>
            Guía <span className="font-mono font-medium text-foreground">{trackingNumber}</span>. Se necesita la autorización del encargado de la sucursal.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <PmySpinner className="h-4 w-4" /> Revisando qué se regresa…
          </div>
        )}

        {loadError && <p className="rounded bg-rose-50 px-2 py-1.5 text-sm text-rose-700">{loadError}</p>}

        {impact && !loading && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Al autorizarse:</p>
              <ul className="divide-y rounded-md bg-muted/40 text-[13px]">
                {records.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-3 py-1.5">
                    <span className="min-w-0 break-all">{r.consNumber ? `Consolidado ${r.consNumber}` : "Registro sin consolidado"}</span>
                    {r.willRevert ? (
                      <span className="font-medium">
                        {statusText(r.currentStatus)} → {statusText(r.toStatus)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">ya está {statusText(r.currentStatus)}; no se toca</span>
                    )}
                  </li>
                ))}
                {incomes.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-3 py-1.5">
                    <span>Ingreso anulado</span>
                    <span className="font-medium">se reactiva {money(i.cost)}</span>
                  </li>
                ))}
                {records.length === 0 && incomes.length === 0 && (
                  <li className="px-3 py-1.5 text-muted-foreground">No hay estatus que regresar; solo se marca como deshecha.</li>
                )}
              </ul>
            </div>

            <div className="space-y-1">
              <Label htmlFor="undo-reason">¿Por qué se deshace?</Label>
              <Textarea
                id="undo-reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  if (reasonError) setReasonError(null)
                }}
                placeholder="Ej. Se aplicó al registro del 16 y era del 15; el paquete no regresó"
                className="min-h-[80px] w-full resize-y"
                aria-invalid={!!reasonError}
              />
              {reasonError && <p className="text-xs text-rose-600">{reasonError}</p>}
            </div>

            <p className="text-muted-foreground">
              Se pedirá autorización a: <span className="font-medium text-foreground">{impact.approver?.name ?? "Admin Principal"}</span>
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={sending || loading || !impact}>
            {sending && <PmySpinner className="mr-2 h-4 w-4" />} Pedir autorización
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
