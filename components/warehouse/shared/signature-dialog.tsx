"use client"

import { useEffect, useState } from "react"
import type { ReactElement, ReactNode } from "react"
import { PDFDownloadLink } from "@react-pdf/renderer"
import type { DocumentProps } from "@react-pdf/renderer"
import { ArrowRightLeft, Download, Route } from "lucide-react"

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

/**
 * Variante del esqueleto de firmas:
 *  - "inbound": cierre de Entrada a Bodega.
 *  - "dispatch": cierre de Salida a Ruta (outbound/DISPATCH).
 *  - "transfer": cierre de Traspaso a Sucursal (outbound/TRANSFER).
 * Controla título, ícono y label del botón Confirmar. El contenido especial de
 * Traspaso (caja "Destino: X") NO vive aquí — se inyecta vía `extraTopSlot`.
 */
export type SignatureDialogVariant = "inbound" | "dispatch" | "transfer"

const VARIANT_CONFIG: Record<
  SignatureDialogVariant,
  { title: string; description: string; icon?: ReactNode; confirmLabel: string }
> = {
  inbound: {
    title: "Cerrar Recepción y Firmas",
    description:
      "Confirme quién recibe la mercancía para habilitar la descarga del PDF y guardar el registro de la sesión.",
    confirmLabel: "Confirmar",
  },
  dispatch: {
    title: "Cerrar Salida a Ruta",
    description:
      "Confirme quién entrega y quién recibe la mercancía para habilitar la descarga del PDF y guardar el registro de la sesión.",
    icon: <Route className="w-5 h-5 text-primary" />,
    confirmLabel: "Confirmar y Guardar",
  },
  transfer: {
    title: "Cerrar Traspaso a Sucursal",
    description:
      "Confirme quién entrega y quién recibe la mercancía para habilitar la descarga del PDF y guardar el registro de la sesión.",
    icon: <ArrowRightLeft className="w-5 h-5 text-blue-600" />,
    confirmLabel: "Confirmar y Guardar",
  },
}

export interface SignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: SignatureDialogVariant
  deliveredByLabel: string
  deliveredByValue: string
  receivedByLabel: string
  receivedByValue: string
  onReceivedByChange: (value: string) => void
  /** Slot opcional sobre los campos de firma (ej. caja "Destino: X" en Traspaso). */
  extraTopSlot?: ReactNode
  onConfirm: () => void
  isSubmitting: boolean
  canConfirm: boolean
  /** Elemento `@react-pdf/renderer` (ej. `<PackageEntryPDF .../>`) para `PDFDownloadLink`. */
  pdfDocument: ReactElement<DocumentProps>
  /** Slot opcional para el botón de Excel (solo Entrada a Bodega lo usa). */
  excelButton?: ReactNode
}

/**
 * Esqueleto común del modal de firmas (Entrada / Salida a Ruta / Traspaso).
 * Deshabilita "Confirmar" con `!canConfirm || isSubmitting` (guard anti doble-submit).
 */
export function SignatureDialog({
  open,
  onOpenChange,
  variant,
  deliveredByLabel,
  deliveredByValue,
  receivedByLabel,
  receivedByValue,
  onReceivedByChange,
  extraTopSlot,
  onConfirm,
  isSubmitting,
  canConfirm,
  pdfDocument,
  excelButton,
}: SignatureDialogProps) {
  // Evita el mismatch de hidratación de PDFDownloadLink (solo se monta en cliente).
  const [isClient, setIsClient] = useState(false)
  useEffect(() => {
    setIsClient(true)
  }, [])

  const config = VARIANT_CONFIG[variant]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {config.icon}
            {config.title}
          </DialogTitle>
          <DialogDescription className="text-slate-500">{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {extraTopSlot}

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{deliveredByLabel}</Label>
            <Input
              value={deliveredByValue}
              readOnly
              className="bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed font-medium h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{receivedByLabel}</Label>
            <Input
              value={receivedByValue}
              onChange={(e) => onReceivedByChange(e.target.value)}
              placeholder="Nombre completo..."
              autoFocus
              className="h-11 border-slate-300 focus-visible:ring-primary"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-2 border-t border-slate-100 pt-4">
          <Button
            variant="ghost"
            className="w-full sm:w-auto text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>

          {excelButton}

          {isClient && canConfirm ? (
            <PDFDownloadLink document={pdfDocument} fileName="recepcion.pdf" className="w-full sm:w-auto">
              {({ loading }) => (
                <Button
                  variant="outline"
                  className="w-full h-10 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                  disabled={loading}
                >
                  <Download className="mr-2 h-4 w-4" /> PDF
                </Button>
              )}
            </PDFDownloadLink>
          ) : (
            <Button variant="outline" className="w-full sm:w-auto h-10 border-slate-200 text-slate-400" disabled>
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
          )}

          <Button
            onClick={onConfirm}
            disabled={!canConfirm || isSubmitting}
            className="w-full sm:w-auto h-10 bg-green-600 hover:bg-green-700 text-white font-bold tracking-wide shadow-sm"
          >
            {config.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
