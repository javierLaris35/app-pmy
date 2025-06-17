import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import classNames from "classnames"
import { AlertCircle, Trash2 } from "lucide-react"
import { saveCollections, validateCollection } from "@/lib/services/collections"

export type Collection = {
  trackingNumber: string
  subsidiaryId: string
  status: string | null
  isPickUp: boolean
}

type Props = {
  selectedSubsidiaryId: string
  onSuccess: () => void
}

const VALIDATION_REGEX = /^\d{12}$/

const CollectionForm: React.FC<Props> = ({ selectedSubsidiaryId, onSuccess }) => {
  const [trackingNumbersRaw, setTrackingNumbersRaw] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [invalidNumbers, setInvalidNumbers] = useState<string[]>([])
  const [hasValidated, setHasValidated] = useState(false)
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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTrackingNumbersRaw(e.target.value)
  }

  const checkTrackingInfo = async (
    trackingNumber: string
  ): Promise<{ isPickUp: boolean; status: string | null }> => {
    try {
      const res = await validateCollection(trackingNumber)
      return { isPickUp: res.isPickUp, status: res.status }
    } catch (err) {
      console.error(`Error consultando info del tracking ${trackingNumber}`, err)
      return { isPickUp: false, status: null }
    }
  }

  const handleValidate = async () => {
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
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    setProgress(0)

    const results: Collection[] = []
    for (let i = 0; i < validNumbers.length; i++) {
      const tn = validNumbers[i]
      const info = await checkTrackingInfo(tn)
      results.push({
        trackingNumber: tn,
        subsidiaryId: selectedSubsidiaryId,
        status: info.status,
        isPickUp: info.isPickUp
      })
      setProgress(Math.round(((i + 1) / validNumbers.length) * 100))
    }

    const newCollections = results.filter(
      (r) => !collections.some((c) => c.trackingNumber === r.trackingNumber)
    )

    setCollections((prev) => [...prev, ...newCollections])
    setInvalidNumbers(invalids)
    setHasValidated(true)
    setTrackingNumbersRaw("")
    setProgress(0)
    setIsLoading(false)

    toast({
      title: "Validación completada",
      description: `Se agregaron ${newCollections.length} recolecciones. Números inválidos: ${invalids.length}`
    })
  }

  const handleRemove = (trackingNumber: string) => {
    setCollections((prev) => prev.filter((c) => c.trackingNumber !== trackingNumber))
  }

  const handleSave = async () => {
    if (!selectedSubsidiaryId) {
      toast({
        title: "Sucursal no seleccionada",
        description: "Por favor selecciona una sucursal antes de guardar.",
        variant: "destructive"
      })
      return
    }

    if (collections.length === 0) {
      toast({
        title: "Nada para guardar",
        description: "No hay recolecciones validadas para guardar.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      await saveCollections(collections)

      toast({
        title: "Recolecciones guardadas",
        description: `${collections.length} recolecciones fueron registradas exitosamente.`
      })

      setCollections([])
      setInvalidNumbers([])
      setHasValidated(false)
      onSuccess()
    } catch (error) {
      console.error(error)
      toast({
        title: "Error al guardar",
        description: "Hubo un problema al enviar las recolecciones.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trackingNumbers">Números de recolección</Label>
            <Textarea
              id="trackingNumbers"
              value={trackingNumbersRaw}
              onChange={handleChange}
              placeholder="Escanea los códigos aquí..."
              rows={6}
              disabled={isLoading}
              className={classNames("resize-none overflow-y-auto max-h-60", {
                "border-red-500": invalidNumbers.length > 0
              })}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleValidate} disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? "Procesando..." : "Validar recolecciones"}
            </Button>

            <Button
              onClick={handleSave}
              disabled={isLoading || !hasValidated || collections.length === 0}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              Guardar recolecciones válidas
            </Button>
          </div>

          {isLoading && (
            <div className="space-y-2 mt-4">
              <Label>Progreso de validación</Label>
              <Progress value={progress} className="h-3" />
            </div>
          )}

          {invalidNumbers.length > 0 && (
            <div className="mt-4 text-red-600 font-semibold">
              <AlertCircle className="inline-block mr-2" /> Números inválidos (no se agregaron):
              <ul className="list-disc ml-6 mt-1">
                {invalidNumbers.map((tn) => (
                  <li key={tn}>{tn}</li>
                ))}
              </ul>
            </div>
          )}

          {collections.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">Recolecciones validadas</h3>
              <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
                <ul className="divide-y divide-gray-300">
                {collections.map(({ trackingNumber, status }) => (
                  <li
                    key={trackingNumber}
                    className="flex justify-between items-center px-4 py-2 hover:bg-gray-50"
                  >
                    <div>
                      <span className="font-medium">{trackingNumber}</span>{" "}
                      {status ? (
                        <span
                          className={classNames(
                            "ml-2 text-sm font-semibold px-2 py-0.5 rounded",
                            status.toLowerCase() === "pick up"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          )}
                        >
                          {status}
                        </span>
                      ) : (
                        <span className="ml-2 text-sm font-semibold px-2 py-0.5 rounded bg-red-100 text-red-800">
                          Sin estatus
                        </span>
                      )}
                      {!status && (
                        <p className="text-xs text-red-600 mt-1">
                          ⚠️ Esta recolección no tiene estatus y podría causar problemas para generar un cobro.
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(trackingNumber)}
                      title="Eliminar"
                      className="text-red-600 hover:text-red-800"
                      aria-label={`Eliminar ${trackingNumber}`}
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
      </CardContent>
    </Card>
  )
}

export default CollectionForm
