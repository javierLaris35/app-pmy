"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import classNames from "classnames"
import { AlertCircle, Trash2, Send, Scan } from "lucide-react"
import { RepartidorSelector } from "../selectors/repartidor-selector"
import { RutaSelector } from "../selectors/ruta-selector"
import { UnidadSelector } from "../selectors/unidad-selector"
import type { DispatchFormData } from "@/lib/types"

interface PackageInfo {
  trackingNumber: string
  isValid: boolean
  destination?: string
  weight?: number
  priority?: "NORMAL" | "URGENT" | "EXPRESS"
}

type Props = {
  selectedSubsidiaryId: string | null
  subsidiaryName?: string
  onClose: () => void
  onSuccess: () => void
}

const VALIDATION_REGEX = /^\d{12}$/

// Mock validation function - replace with actual API call
const validatePackageForDispatch = async (trackingNumber: string): Promise<PackageInfo> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200))

  // Mock validation logic
  const isValid = Math.random() > 0.1 // 90% success rate

  return {
    trackingNumber,
    isValid,
    destination: isValid ? `Destino ${Math.floor(Math.random() * 100)}` : undefined,
    weight: isValid ? Math.floor(Math.random() * 10) + 1 : undefined,
    priority: isValid ? (["NORMAL", "URGENT", "EXPRESS"][Math.floor(Math.random() * 3)] as any) : undefined,
  }
}

// Mock dispatch function - replace with actual API call
const dispatchPackages = async (dispatchData: DispatchFormData): Promise<void> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Mock success/failure
  if (Math.random() > 0.05) {
    // 95% success rate
    console.log("Packages dispatched successfully:", dispatchData)
  } else {
    throw new Error("Error al procesar la salida de paquetes")
  }
}

const PackageDispatchForm: React.FC<Props> = ({
  selectedSubsidiaryId,
  subsidiaryName = "NAVOJOA",
  onClose,
  onSuccess,
}) => {
  // Form states
  const [selectedRepartidores, setSelectedRepartidores] = useState<string[]>([])
  const [selectedRutas, setSelectedRutas] = useState<string[]>([])
  const [selectedUnidad, setSelectedUnidad] = useState<string>("")

  // Package scanning states
  const [trackingNumbersRaw, setTrackingNumbersRaw] = useState("")
  const [packages, setPackages] = useState<PackageInfo[]>([])
  const [invalidNumbers, setInvalidNumbers] = useState<string[]>([])
  const [hasValidated, setHasValidated] = useState(false)

  // Loading and progress states
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const { toast } = useToast()

  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault()
    }
    const preventKeyZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) {
        e.preventDefault()
      }
    }
    window.addEventListener("wheel", preventZoom, { passive: false })
    window.addEventListener("keydown", preventKeyZoom)
    return () => {
      window.removeEventListener("wheel", preventZoom)
      window.removeEventListener("keydown", preventKeyZoom)
    }
  }, [])

  const handleValidatePackages = async () => {
    if (!selectedSubsidiaryId) {
      toast({
        title: "Error",
        description: "Selecciona una sucursal antes de validar.",
        variant: "destructive",
      })
      return
    }

    const lines = trackingNumbersRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

    const uniqueLines = Array.from(new Set(lines))
    const validNumbers = uniqueLines.filter((tn) => VALIDATION_REGEX.test(tn))
    const invalids = uniqueLines.filter((tn) => !VALIDATION_REGEX.test(tn))

    if (validNumbers.length === 0) {
      toast({
        title: "Error",
        description: "No se ingresaron números válidos.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setProgress(0)

    const results: PackageInfo[] = []
    for (let i = 0; i < validNumbers.length; i++) {
      const tn = validNumbers[i]
      const info = await validatePackageForDispatch(tn)
      results.push(info)
      setProgress(Math.round(((i + 1) / validNumbers.length) * 100))
    }

    const newPackages = results.filter((r) => !packages.some((p) => p.trackingNumber === r.trackingNumber))

    setPackages((prev) => [...prev, ...newPackages])
    setInvalidNumbers(invalids)
    setHasValidated(true)
    setTrackingNumbersRaw("")
    setProgress(0)
    setIsLoading(false)

    const validCount = newPackages.filter((p) => p.isValid).length
    const invalidCount = newPackages.filter((p) => !p.isValid).length

    toast({
      title: "Validación completada",
      description: `Se agregaron ${validCount} paquetes válidos. Paquetes inválidos: ${invalidCount + invalids.length}`,
    })
  }

  const handleRemovePackage = useCallback((trackingNumber: string) => {
    setPackages((prev) => prev.filter((p) => p.trackingNumber !== trackingNumber))
  }, [])

  const handleDispatch = async () => {
    if (!selectedSubsidiaryId) {
      toast({
        title: "Sucursal no seleccionada",
        description: "Por favor selecciona una sucursal antes de procesar.",
        variant: "destructive",
      })
      return
    }

    if (selectedRepartidores.length === 0) {
      toast({
        title: "Repartidores no seleccionados",
        description: "Por favor selecciona al menos un repartidor.",
        variant: "destructive",
      })
      return
    }

    if (selectedRutas.length === 0) {
      toast({
        title: "Rutas no seleccionadas",
        description: "Por favor selecciona al menos una ruta.",
        variant: "destructive",
      })
      return
    }

    if (!selectedUnidad) {
      toast({
        title: "Unidad no seleccionada",
        description: "Por favor selecciona una unidad de transporte.",
        variant: "destructive",
      })
      return
    }

    const validPackages = packages.filter((p) => p.isValid)
    if (validPackages.length === 0) {
      toast({
        title: "No hay paquetes válidos",
        description: "No hay paquetes válidos para procesar la salida.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const dispatchData: DispatchFormData = {
        repartidores: selectedRepartidores,
        rutas: selectedRutas,
        unidadId: selectedUnidad,
        trackingNumbers: validPackages.map((p) => p.trackingNumber),
      }

      await dispatchPackages(dispatchData)

      toast({
        title: "Salida procesada exitosamente",
        description: `Se procesaron ${validPackages.length} paquetes para salida.`,
      })

      // Reset form
      setSelectedRepartidores([])
      setSelectedRutas([])
      setSelectedUnidad("")
      setPackages([])
      setInvalidNumbers([])
      setHasValidated(false)

      onSuccess()
    } catch (error) {
      console.error(error)
      toast({
        title: "Error al procesar salida",
        description: "Hubo un problema al procesar la salida de paquetes.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const validPackages = packages.filter((p) => p.isValid)
  const invalidPackages = packages.filter((p) => !p.isValid)
  const canDispatch =
    selectedRepartidores.length > 0 && selectedRutas.length > 0 && selectedUnidad && validPackages.length > 0

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Salida de Paquetes
          {packages.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {validPackages.length} válidos / {packages.length} total
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selection Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Repartidores</Label>
            <RepartidorSelector
              selectedRepartidores={selectedRepartidores}
              onSelectionChange={setSelectedRepartidores}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Rutas</Label>
            <RutaSelector selectedRutas={selectedRutas} onSelectionChange={setSelectedRutas} disabled={isLoading} />
          </div>

          <div className="space-y-2">
            <Label>Unidad de Transporte</Label>
            <UnidadSelector
              selectedUnidad={selectedUnidad}
              onSelectionChange={setSelectedUnidad}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Package Scanning Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trackingNumbers">Números de seguimiento</Label>
            <Textarea
              id="trackingNumbers"
              value={trackingNumbersRaw}
              onChange={(e) => setTrackingNumbersRaw(e.target.value)}
              placeholder="Escanea los códigos de seguimiento aquí..."
              rows={6}
              disabled={isLoading}
              className={classNames("resize-none overflow-y-auto max-h-60", {
                "border-red-500": invalidNumbers.length > 0,
              })}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleValidatePackages} disabled={isLoading} className="w-full sm:w-auto">
              <Scan className="mr-2 h-4 w-4" />
              {isLoading ? "Procesando..." : "Validar paquetes"}
            </Button>

            <Button
              onClick={handleDispatch}
              disabled={isLoading || !canDispatch}
              variant="default"
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              <Send className="mr-2 h-4 w-4" />
              Procesar salida
            </Button>
          </div>

          {isLoading && (
            <div className="space-y-2">
              <Label>Progreso de validación</Label>
              <Progress value={progress} className="h-3" />
            </div>
          )}

          {invalidNumbers.length > 0 && (
            <div className="mt-4 text-red-600 font-semibold">
              <AlertCircle className="inline-block mr-2" />
              Números inválidos (no se agregaron):
              <ul className="list-disc ml-6 mt-1">
                {invalidNumbers.map((tn) => (
                  <li key={tn}>{tn}</li>
                ))}
              </ul>
            </div>
          )}

          {packages.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">Paquetes validados</h3>
              <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
                <ul className="divide-y divide-gray-300">
                  {packages.map((pkg) => (
                    <li
                      key={pkg.trackingNumber}
                      className="flex justify-between items-center px-4 py-2 hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium font-mono">{pkg.trackingNumber}</span>
                          <Badge variant={pkg.isValid ? "default" : "destructive"} className="text-xs">
                            {pkg.isValid ? "Válido" : "Inválido"}
                          </Badge>
                          {pkg.priority && (
                            <Badge
                              variant={
                                pkg.priority === "EXPRESS"
                                  ? "destructive"
                                  : pkg.priority === "URGENT"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="text-xs"
                            >
                              {pkg.priority}
                            </Badge>
                          )}
                        </div>
                        {pkg.isValid && (
                          <div className="text-sm text-gray-600 mt-1">
                            {pkg.destination && <span>Destino: {pkg.destination}</span>}
                            {pkg.weight && <span className="ml-4">Peso: {pkg.weight}kg</span>}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemovePackage(pkg.trackingNumber)}
                        title="Eliminar"
                        className="text-red-600 hover:text-red-800"
                        disabled={isLoading}
                      >
                        <Trash2 size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        {(selectedRepartidores.length > 0 || selectedRutas.length > 0 || selectedUnidad || packages.length > 0) && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Resumen de Salida</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Repartidores:</span>
                <span className="ml-2 font-medium">{selectedRepartidores.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Rutas:</span>
                <span className="ml-2 font-medium">{selectedRutas.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Paquetes válidos:</span>
                <span className="ml-2 font-medium">{validPackages.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Paquetes inválidos:</span>
                <span className="ml-2 font-medium text-red-600">{invalidPackages.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default PackageDispatchForm
