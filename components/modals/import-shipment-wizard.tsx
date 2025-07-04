"use client"

import { useState, useRef, useCallback } from "react"
import {
  Upload,
  FileText,
  CheckCircle,
  X,
  Loader2,
  Truck,
  MinusCircle,
  DollarSign,
  CheckSquare,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import clsx from "clsx"
import { SucursalSelector } from "../sucursal-selector"
import {
  uploadF2ChargeShipments,
  uploadShipmentFile,
  uploadShipmentPayments,
} from "@/lib/services/shipments"

const steps = [
  {
    label: "Archivo de envíos",
    description: "Sube el archivo maestro de todos los envíos.",
    icon: Truck,
  },
  {
    label: "Remover cargas",
    description: "Sube el archivo con cargas a excluir.",
    icon: MinusCircle,
  },
  {
    label: "Cobros y ajustes",
    description: "Sube el archivo con cargos y ajustes finales.",
    icon: DollarSign,
  },
  {
    label: "Confirmar",
    description: "Verifica que los archivos estén listos.",
    icon: CheckSquare,
  },
]

const MAX_FILE_SIZE_MB = 5
const ALLOWED_EXTENSIONS = ["csv", "xls", "xlsx"]

export function ShipmentWizardModal({
  open,
  onOpenChange,
  onUploadSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadSuccess: () => void
}) {
  const [step, setStep] = useState(0)
  const [sucursalId, setSucursalId] = useState("")
  const [date, setDate] = useState("")
  const [consNumber, setConsNumber] = useState("")
  const [files, setFiles] = useState<(File | null)[]>([null, null, null])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep(0)
    setSucursalId("")
    setDate("")
    setConsNumber("")
    setFiles([null, null, null])
    setError("")
  }

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const handleFile = (index: number, file: File | null) => {
    setError("")
    if (!file) {
      const updated = [...files]
      updated[index] = null
      setFiles(updated)
    } else {
      const ext = file.name.split(".").pop()?.toLowerCase()
      if (!ext || !ALLOWED_EXTENSIONS.includes(ext) || file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(
          `Archivo inválido (máx ${MAX_FILE_SIZE_MB}MB, tipos: ${ALLOWED_EXTENSIONS.join(", ")})`
        )
        return
      }
      const updated = [...files]
      updated[index] = file
      setFiles(updated)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const droppedFiles = e.dataTransfer.files
      if (droppedFiles.length) {
        handleFile(step, droppedFiles[0])
      }
    },
    [step, files]
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleNext = async () => {
    setError("")

    if (!sucursalId) return setError("Debes seleccionar una sucursal")
    if (step < 3 && !files[step]) return setError("Debes subir el archivo antes de continuar.")

    try {
      setLoading(true)

      if (step === 0) await uploadShipmentFile(files[0]!, sucursalId, consNumber, date || "")
      if (step === 1) await uploadF2ChargeShipments(files[1]!, sucursalId, consNumber, date || "")
      if (step === 2) await uploadShipmentPayments(files[2]!)
    } catch (e: any) {
      return setError(e.message || `Error al subir el archivo del paso ${step + 1}.`)
    } finally {
      setLoading(false)
    }

    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      onUploadSuccess()
      close()
    }
  }

  const handlePrev = () => setStep(step - 1)

  const CurrentIcon = steps[step].icon

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600 text-lg">
            <Upload className="h-5 w-5" />
            Importar Envíos (Paso {step + 1} / {steps.length})
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
          {/* Stepper izquierdo */}
          <div className="col-span-1 pr-6">
            <ul className="relative flex flex-col gap-10">
              {steps.map(({ label, description, icon: Icon }, i) => {
                const isActive = i === step
                const isComplete = i < step

                return (
                  <li key={i} className="flex items-start gap-4 relative group">
                    <div className="flex flex-col items-center relative">
                      {/* Línea vertical conectando los pasos */}
                      {i < steps.length - 1 && (
                        <span className="absolute top-[36px] left-1/2 -translate-x-1/2 h-[calc(100%-36px)] w-px bg-muted-foreground/30 group-hover:bg-muted-foreground" />
                      )}

                      {/* Círculo de ícono */}
                      <div
                        className={clsx(
                          "z-10 relative w-9 h-9 flex items-center justify-center rounded-full border-2",
                          isActive
                            ? "border-orange-600 bg-orange-100 text-orange-600 shadow"
                            : isComplete
                            ? "border-green-500 bg-green-100 text-green-600"
                            : "border-gray-300 bg-white text-gray-400"
                        )}
                      >
                        {isComplete ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                    </div>

                    {/* Texto de paso */}
                    <div
                      className={clsx(
                        "text-sm leading-snug",
                        isActive && "font-semibold text-orange-700"
                      )}
                    >
                      <p>{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Panel derecho */}
          <div className="col-span-3 space-y-6">
            {/* Campos comunes */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Sucursal</Label>
                <SucursalSelector value={sucursalId} onValueChange={setSucursalId} />
              </div>
              <div>
                <Label>Fecha (opcional)</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Cons Number (opcional)</Label>
                <Input value={consNumber} onChange={(e) => setConsNumber(e.target.value)} />
              </div>
            </div>

            {/* Dropzone o resumen */}
            {step < 3 ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="bg-orange-50 border-2 border-dashed rounded-md p-6 text-center cursor-pointer
                  hover:border-orange-400 transition-colors duration-300
                  flex flex-col items-center justify-center gap-4 min-h-[180px]"
                onClick={() => fileInputRef.current?.click()}
              >
                <Input
                  type="file"
                  accept={ALLOWED_EXTENSIONS.map((e) => "." + e).join(",")}
                  onChange={(e) => handleFile(step, e.target.files?.[0] || null)}
                  ref={fileInputRef}
                  className="hidden"
                  onClick={(e) => ((e.target as HTMLInputElement).value = "")}
                />
                <Upload className="h-12 w-12 text-orange-600 mx-auto" />
                {files[step] ? (
                  <p className="text-sm font-medium text-orange-800 truncate max-w-full">
                    📄 {files[step]?.name}
                  </p>
                ) : (
                  <p className="text-sm mt-2 text-orange-700">
                    Selecciona o arrastra tu archivo aquí
                  </p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Subir archivo
                </Button>
              </div>
            ) : (
              <div className="border p-4 rounded-md bg-gray-50">
                <p className="text-sm mb-2">Resumen de archivos cargados:</p>
                <ul className="space-y-2 text-sm">
                  {steps.slice(0, 3).map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                      {files[i] ? (
                        <CheckCircle className="text-green-500 h-4 w-4" />
                      ) : (
                        <X className="text-red-500 h-4 w-4" />
                      )}
                      {s.label}: {files[i]?.name || "No cargado"}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Error */}
            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Botones */}
            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={close} disabled={loading}>
                Cancelar
              </Button>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="outline" onClick={handlePrev} disabled={loading}>
                    Anterior
                  </Button>
                )}
                <Button onClick={handleNext} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Subiendo
                    </>
                  ) : step === steps.length - 1 ? (
                    "Finalizar"
                  ) : (
                    "Siguiente"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
