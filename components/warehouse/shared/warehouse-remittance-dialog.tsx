"use client"

import type { Dispatch, RefObject, SetStateAction } from "react"
import { AlertTriangle, HelpCircle, ScanBarcode } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { RemittanceDialogState } from "@/components/warehouse/shared/use-warehouse-session"

export interface WarehouseRemittanceDialogProps {
  state: RemittanceDialogState
  onStateChange: Dispatch<SetStateAction<RemittanceDialogState>>
  pieceInputRef: RefObject<HTMLInputElement | null>
  onPieceScan: () => void
  /** Se llama al cerrar el diálogo, para regresar el foco al escáner principal. */
  onFocusScanner: () => void
}

/** Modal de remesa DHL (confirmar guía maestra → escanear piezas). Acento unificado `primary`. */
export function WarehouseRemittanceDialog({
  state,
  onStateChange,
  pieceInputRef,
  onPieceScan,
  onFocusScanner,
}: WarehouseRemittanceDialogProps) {
  const handleOpenChange = (open: boolean) => {
    onStateChange((prev) => ({ ...prev, isOpen: open }))
    if (!open) setTimeout(() => onFocusScanner(), 100)
  }

  return (
    <Dialog open={state.isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <HelpCircle className="w-5 h-5 text-primary" />
            Guía Duplicada Detectada
          </DialogTitle>
        </DialogHeader>

        {state.step === "confirm" ? (
          <div className="space-y-4 py-3">
            <p className="text-sm text-slate-600">
              El número de guía{" "}
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                {state.masterTracking}
              </span>{" "}
              ya fue ingresado a la lista.
            </p>
            <p className="text-sm font-semibold text-slate-700">
              ¿Desea abrir esta guía para agregar piezas de remesa?
            </p>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => onStateChange((prev) => ({ ...prev, isOpen: false }))}>
                No, Cancelar
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => onStateChange((prev) => ({ ...prev, step: "scan" }))}
              >
                Sí, es una Remesa
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <DialogDescription>
              Escanee los códigos de barras de las piezas correspondientes a la guía{" "}
              <strong className="font-mono text-slate-800">{state.masterTracking}</strong>.
            </DialogDescription>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Código de Pieza</Label>
              <div className="relative">
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  ref={pieceInputRef}
                  placeholder="Ej. JJD014600012624033086"
                  value={state.pieceInput}
                  onChange={(e) => onStateChange((prev) => ({ ...prev, pieceInput: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      onPieceScan()
                    }
                  }}
                  className="pl-9 font-mono text-sm border-primary/20 focus-visible:ring-primary h-11"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Presione ENTER después de escanear cada pieza para agregarla a la lista.
              </p>
            </div>

            {state.error && (
              <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded-md flex items-center gap-2 border border-red-100 shadow-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">{state.error}</span>
              </div>
            )}

            <DialogFooter className="mt-6 border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => onStateChange((prev) => ({ ...prev, isOpen: false }))}>
                Terminar y Cerrar
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={onPieceScan}>
                Agregar Manualmente
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
