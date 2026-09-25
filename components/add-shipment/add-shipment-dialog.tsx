"use client"

import { useEffect, useState } from "react"
import { AlertCircle } from "lucide-react"
import { useUiStore } from "@/store/ui.store"
import { useAuthStore } from "@/store/auth.store"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ManualShipmentForm } from "@/components/shipments/manual-shipment-form"
import { toast } from "@/lib/toast"

/**
 * "+" del header (Agregar envío). Antes era una maqueta que hacía fetch a
 * /api/shipments (no existe) y no guardaba nada. Ahora usa el mismo formulario
 * y endpoint que el alta manual del desembarque (shipment o carga, FedEx/DHL).
 */
export function AddShipmentDialog() {
  // Abierto/cerrado controlado desde el header (antes era un botón flotante).
  const open = useUiStore((s) => s.addShipmentOpen)
  const setOpen = useUiStore((s) => s.setAddShipmentOpen)
  const user = useAuthStore((s) => s.user)
  // Se remonta el formulario en cada apertura para empezar limpio.
  const [formKey, setFormKey] = useState(0)

  // Atajo para abrir/cerrar (Ctrl/Cmd + Shift + N)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "n" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        setOpen(!useUiStore.getState().addShipmentOpen)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [setOpen])

  useEffect(() => {
    if (open) setFormKey((k) => k + 1)
  }, [open])

  // Sucursal del usuario como sugerencia; se puede cambiar en el selector.
  const userSubsidiary = (user as { subsidiary?: { id?: string; name?: string } } | null)?.subsidiary

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar paquete</DialogTitle>
          <DialogDescription>Registra un paquete o una carga que no llegó en el archivo. FedEx por defecto; puedes cambiar a DHL.</DialogDescription>
        </DialogHeader>

        <ManualShipmentForm
          key={formKey}
          initialValues={{ recipientCity: userSubsidiary?.name ?? "" }}
          onCancel={() => setOpen(false)}
          onCreated={(created) => {
            toast.success(created.isCharge ? "Carga registrada" : "Paquete registrado", {
              description: `${created.dhlUniqueId || created.trackingNumber} quedó dado de alta.`,
            })
            setOpen(false)
          }}
        />

        <div className="flex items-center justify-between border-t pt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Los campos con * son obligatorios
          </span>
          <kbd className="rounded border bg-muted px-2 py-1 text-xs">
            {typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl"}+Shift+N
          </kbd>
        </div>
      </DialogContent>
    </Dialog>
  )
}
