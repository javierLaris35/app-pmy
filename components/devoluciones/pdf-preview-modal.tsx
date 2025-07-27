"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Eye } from "lucide-react"

interface Collection {
  trackingNumber: string
  status: string | null
  isPickUp: boolean
}

interface Devolution {
  trackingNumber: string
  status: string
  reason: string
}

interface PDFPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  collections: Collection[]
  devolutions: Devolution[]
  subsidiaryName: string
  onGeneratePDF: () => Promise<void>
}

export function PDFPreviewModal({
  isOpen,
  onClose,
  collections,
  devolutions,
  subsidiaryName,
  onGeneratePDF,
}: PDFPreviewModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGeneratePDF = async () => {
    setIsGenerating(true)
    try {
      await onGeneratePDF()
      onClose()
    } catch (error) {
      console.error("Error generating PDF:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const normalPackages = collections.filter((c) => c.status !== "PICK UP").length
  const pickupPackages = collections.filter((c) => c.status === "PICK UP").length
  const totalPackages = collections.length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Vista Previa del Documento PDF
          </DialogTitle>
          <DialogDescription>Revisa la información antes de generar el documento final</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Preview */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-purple-600 text-white px-3 py-1 rounded font-bold">Fed</div>
                <div className="bg-orange-500 text-white px-3 py-1 rounded font-bold">Ex</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">FECHA</div>
                <div className="border border-gray-300 px-2 py-1 bg-white">
                  {new Date().toLocaleDateString("es-ES")}
                </div>
              </div>
            </div>

            <div className="mb-2">
              <span className="font-semibold text-gray-600">LOCALIDAD: </span>
              <span className="text-xl font-bold">{subsidiaryName}</span>
            </div>
            <div className="text-sm text-gray-600">PAQUETES RECIBOS DE FedEx</div>
          </div>

          {/* Package Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded">
              <div className="text-xs font-semibold text-blue-700 mb-1">PAQUETES NORMALES:</div>
              <div className="text-2xl font-bold text-blue-900">{normalPackages}</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 p-3 rounded">
              <div className="text-xs font-semibold text-orange-700 mb-1">PAQUETES CON COBRO:</div>
              <div className="text-2xl font-bold text-orange-900">{pickupPackages}</div>
            </div>
            <div className="bg-green-50 border border-green-200 p-3 rounded">
              <div className="text-xs font-semibold text-green-700 mb-1">TOTAL DE PAQUETES:</div>
              <div className="text-2xl font-bold text-green-900">{totalPackages}</div>
            </div>
          </div>

          {/* Content Preview */}
          <div className="grid grid-cols-2 gap-6">
            {/* Devolutions */}
            <div>
              <div className="bg-purple-600 text-white p-2 rounded-t font-semibold text-center">
                DEVOLUCION (Envío no entregado)
              </div>
              <div className="border border-gray-300 rounded-b max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-1 w-8">No</th>
                      <th className="border p-1">GUIA</th>
                      <th className="border p-1 w-16">MOTIVO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.max(devolutions.length, 5) }, (_, i) => {
                      const dev = devolutions[i]
                      return (
                        <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                          <td className="border p-1 text-center">{i + 1}</td>
                          <td className="border p-1 font-mono text-xs">{dev?.trackingNumber || ""}</td>
                          <td className="border p-1 text-center">
                            {dev ? (
                              <Badge variant="destructive" className="text-xs">
                                {dev.status.includes("DEX") ? dev.status : `DEX${dev.status.padStart(2, "0")}`}
                              </Badge>
                            ) : (
                              ""
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Collections */}
            <div>
              <div className="bg-orange-500 text-white p-2 rounded-t font-semibold text-center">RECOLECCIONES</div>
              <div className="border border-gray-300 rounded-b max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-1">NO. GUIA</th>
                      <th className="border p-1 w-12"></th>
                      <th className="border p-1 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.max(collections.length, 5) }, (_, i) => {
                      const col = collections[i]
                      return (
                        <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                          <td className="border p-1 font-mono text-xs">{col?.trackingNumber || ""}</td>
                          <td className="border p-1 text-center text-xs">
                            {col ? subsidiaryName.substring(0, 3).toUpperCase() : ""}
                          </td>
                          <td className="border p-1 text-center text-xs">{i + 31}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
            <div>DEX 03: DATOS INCORRECTOS / DOM NO EXISTE</div>
            <div>DEX 07: RECHAZO DE PAQUETES POR EL CLIENTE</div>
            <div>DEX 08: VISITA / DOMICILIO CERRADO</div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleGeneratePDF} disabled={isGenerating}>
              <Download className="mr-2 h-4 w-4" />
              {isGenerating ? "Generando..." : "Generar PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
