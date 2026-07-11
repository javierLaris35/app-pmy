"use client"

import { Keyboard } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export interface ShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Ej. "Finalizar Ingreso" / "Finalizar Salida". */
  finishActionLabel: string
}

/** Modal de atajos de teclado (ya neutral). Copiado tal cual, con `finishActionLabel` parametrizado. */
export function ShortcutsDialog({ open, onOpenChange, finishActionLabel }: ShortcutsDialogProps) {
  const shortcuts = [
    { key: "F1", action: "Enfocar campo de Escáner" },
    { key: "F2", action: `Abrir ventana de ${finishActionLabel}` },
    { key: "F3", action: "Buscar en listado (Guía o CP)" },
    { key: "ESC", action: "Cerrar modales o ventanas" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <Keyboard className="w-5 h-5" /> Atajos de Teclado
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-3">
          {shortcuts.map(({ key, action }) => (
            <div
              key={key}
              className="flex justify-between items-center text-sm border-b pb-2.5 pt-1 last:border-0 border-slate-100"
            >
              <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-slate-700 font-mono text-xs shadow-sm font-bold">
                {key}
              </kbd>
              <span className="text-slate-600 text-xs font-medium">{action}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
