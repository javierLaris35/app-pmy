"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  Upload,
  CheckCircle,
  X,
  Loader2,
  Truck,
  MinusCircle,
  DollarSign,
  CheckSquare,
  Plane,
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
    label: "Envíos Aéreos",
    description: "Archivo específico para envíos por avión.",
    icon: Plane,
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
  const [files, setFiles] = useState<(File | null)[]>(() => {
    const saved = localStorage.getItem("shipmentWizardFiles")
    return saved ? JSON.parse(saved) : [null, null, null, null]
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem("shipmentWizardFiles", JSON.stringify(files))
  }, [files])

  useEffect(() => {
    const savedSucursal = localStorage.getItem("shipmentWizardSucursal")
    const savedDate = localStorage.getItem("shipmentWizardDate")
    const savedCons = localStorage.getItem("shipmentWizardCons")
    if (savedSucursal) setSucursalId(savedSucursal)
    if (savedDate) setDate(savedDate)
    if (savedCons) setConsNumber(savedCons)
  }, [])

  useEffect(() => {
    localStorage.setItem("shipmentWizardSucursal", sucursalId)
  }, [sucursalId])

  useEffect(() => {
    localStorage.setItem("shipmentWizardDate", date)
  }, [date])

  useEffect(() => {
    localStorage.setItem("shipmentWizardCons", consNumber)
  }, [consNumber])

  const reset = () => {
    setStep(0)
    setSucursalId("")
    setDate("")
    setConsNumber("")
    setFiles([null, null, null, null])
    setError("")
    localStorage.removeItem("shipmentWizardFiles")
    localStorage.removeItem("shipmentWizardSucursal")
    localStorage.removeItem("shipmentWizardDate")
    localStorage.removeItem("shipmentWizardCons")
  }

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const handleFile = (index: number, file: File | null) => {
    setError("")
    const updated = [...files]
    updated[index] = file
    setFiles(updated)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const droppedFiles = e.dataTransfer.files
      if (droppedFiles.length) handleFile(step, droppedFiles[0])
    },
    [step, files]
  )

  const handleNext = async () => {
    setError("")
    if (!sucursalId) return setError("Debes seleccionar una sucursal")

    try {
      setLoading(true)
      if (step === 0 && files[0]) await uploadShipmentFile(files[0], sucursalId, consNumber, date || "")
      if (step === 1 && files[1]) await uploadShipmentFile(files[1], sucursalId, consNumber, date || "", true)
      if (step === 2 && files[2]) await uploadF2ChargeShipments(files[2], sucursalId, consNumber, date || "")
      if (step === 3 && files[3]) await uploadShipmentPayments(files[3])
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

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-4xl rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600 text-lg">
            <Upload className="h-5 w-5" /> Importar Envíos
          </DialogTitle>
        </DialogHeader>

        <div className="w-full overflow-x-auto mb-6">
          <div className="flex items-center justify-between gap-4 min-w-[650px]">
            {steps.map(({ label, icon: Icon }, i) => {
              const isActive = i === step
              const isComplete = i < step
              return (
                <div
                  key={i}
                  className="flex-1 cursor-pointer transition-transform duration-300 hover:scale-105"
                  onClick={() => setStep(i)}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={clsx(
                        "w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all",
                        isActive
                          ? "border-orange-600 bg-orange-100 text-orange-600 shadow"
                          : isComplete
                          ? "border-green-500 bg-green-100 text-green-600"
                          : "border-gray-300 bg-white text-gray-400"
                      )}
                    >
                      {isComplete ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <p
                      className={clsx(
                        "text-xs mt-2 text-center transition-all",
                        isActive && "font-semibold text-orange-700"
                      )}
                    >
                      {label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full mt-4">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-6 transition-all duration-300">
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

          {step < steps.length - 1 ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="bg-orange-50 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-orange-400 transition-all duration-300 flex flex-col items-center justify-center gap-4 min-h-[180px] shadow-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Input
                type="file"
                accept={ALLOWED_EXTENSIONS.map((e) => "." + e).join(",")}
                onChange={(e) => handleFile(step, e.target.files?.[0] || null)}
                ref={fileInputRef}
                className="hidden"
              />
              <Upload className="h-12 w-12 text-orange-600 mx-auto" />
              {files[step] ? (
                <>
                  <p className="text-sm font-medium text-orange-800 truncate max-w-full">
                    📄 {files[step]?.name}
                  </p>
                  <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                    Cambiar archivo
                  </Button>
                </>
              ) : (
                <p className="text-sm mt-2 text-orange-700">
                  Selecciona o arrastra tu archivo aquí
                </p>
              )}
            </div>
          ) : (
            <div className="border p-4 rounded-xl bg-gray-50 shadow-sm">
              <p className="text-sm mb-2">Resumen de archivos cargados:</p>
              <ul className="space-y-2 text-sm">
                {steps.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {files[i] ? <CheckCircle className="text-green-500 h-4 w-4" /> : <X className="text-red-500 h-4 w-4" />}
                    {s.label}: {files[i]?.name || "No cargado"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={close} disabled={loading} className="rounded-full px-6">
              Cancelar
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="outline" onClick={handlePrev} disabled={loading} className="rounded-full px-6">
                  Anterior
                </Button>
              )}
              <Button onClick={handleNext} disabled={loading} className="rounded-full px-6 bg-orange-600 text-white hover:bg-orange-700">
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
      </DialogContent>
    </Dialog>
  )
}
