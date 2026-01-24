"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  Upload,
  CheckCircle,
  X,
  Loader2,
  Truck,
  DollarSign,
  CheckSquare,
  Plane,
  Gem,
  CheckCheckIcon,
  HelpCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SucursalSelector } from "../sucursal-selector"
import {
  uploadF2ChargeShipments,
  uploadShipmentFile,
  uploadShipmentPayments,
  uploadHighValueShipments
} from "@/lib/services/shipments"
import { useAuthStore } from "@/store/auth.store"
import { IconTruckLoading } from "@tabler/icons-react"
import { Switch } from "../ui/switch"

// Importación de Driver.js para el tutorial
import { driver } from "driver.js"
import "driver.js/dist/driver.css"

const steps = [
  {
    label: "Cons Master",
    description: "Sube el archivo maestro. Opcional si el consolidado es meramente aéreo.",
    icon: Truck,
  },
  {
    label: "Envíos Aéreos",
    description: "Sube el archivo de envíos aéreos. No siempre se ocupa subir el Cons Master antes.",
    icon: Plane,
  },
  {
    label: "High Value",
    description: "Sube el archivo con envíos de alto valor.",
    icon: Gem,
  },
  {
    label: "Carga / F2 / 31.5",
    description: "Sube el archivo para gestionar cargas F2 según la sucursal.",
    icon: IconTruckLoading,
  },
  {
    label: "Cobros y ajustes",
    description: "Aplica cobros finales. No se necesita subir otro archivo para aplicar cobros si ya cargaste los anteriores.",
    icon: DollarSign,
  },
  {
    label: "Confirmar",
    description: "Verifica que los archivos estén listos.",
    icon: CheckSquare,
  },
]

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
  const [notRemoveCharge, setNotRemoveCharge] = useState<boolean>(false)
  const [consNumber, setConsNumber] = useState("")
  const [files, setFiles] = useState<(File | null)[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("shipmentWizardFiles")
      return saved ? JSON.parse(saved) : Array(steps.length - 1).fill(null)
    }
    return Array(steps.length - 1).fill(null)
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [inputErrors, setInputErrors] = useState<{ sucursalId?: boolean; consNumber?: boolean }>({})

  const fileInputRef = useRef<HTMLInputElement>(null)
  const user = useAuthStore((s) => s.user);

  // --- CONFIGURACIÓN DEL TUTORIAL ACTUALIZADA ---
  const startTutorial = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      nextBtnText: 'Sig.',
      prevBtnText: 'Ant.',
      doneBtnText: 'Entendido',
      steps: [
        {
          element: "#wizard-stepper-container",
          popover: {
            title: "1. Flujo de Archivos",
            description: "Aquí puedes ver los diferentes tipos de archivos que puedes cargar. El sistema te guiará paso a paso por cada categoría.",
            side: "bottom",
          }
        },
        {
          element: ".grid.md\\:grid-cols-3", // Selector de los inputs de arriba
          popover: {
            title: "2. Datos Obligatorios",
            description: "Antes de subir cualquier archivo, es necesario que selecciones la **Sucursal**, la **Fecha** y el **Cons Number**. Sin estos datos no podrás avanzar.",
            side: "bottom",
          }
        },
        {
          element: "#wizard-upload-zone",
          popover: {
            title: "3. Selección de Archivo",
            description: "Haz clic aquí o arrastra tu archivo Excel/CSV. Una vez seleccionado, el nombre del archivo aparecerá en pantalla.",
            side: "top",
          }
        },
        {
          element: "button.bg-orange-600", // Botón Siguiente
          popover: {
            title: "4. Subir y Continuar",
            description: "Al darle a 'Siguiente Paso', el archivo se subirá al sistema y avanzarás a la siguiente categoría de envíos.",
            side: "left",
          }
        }
      ]
    });
    driverObj.drive();
  }, []);

  useEffect(() => {
    if (open && !localStorage.getItem("hasSeenWizardTutorial")) {
      setTimeout(() => {
        startTutorial();
        localStorage.setItem("hasSeenWizardTutorial", "true");
      }, 800);
    }
  }, [open, startTutorial]);

  // ... Resto del código (lógica de handlers y renderizado se mantiene igual)
  useEffect(() => { if (user?.subsidiary) setSucursalId(user.subsidiary.id); }, [user]);
  useEffect(() => { localStorage.setItem("shipmentWizardFiles", JSON.stringify(files)) }, [files])

  useEffect(() => {
    const savedSucursal = localStorage.getItem("shipmentWizardSucursal")
    const savedDate = localStorage.getItem("shipmentWizardDate")
    const savedCons = localStorage.getItem("shipmentWizardCons")
    if (savedSucursal) setSucursalId(savedSucursal)
    if (savedDate) setDate(savedDate)
    if (savedCons) setConsNumber(savedCons)
  }, [])

  useEffect(() => { localStorage.setItem("shipmentWizardSucursal", sucursalId) }, [sucursalId])
  useEffect(() => { localStorage.setItem("shipmentWizardDate", date) }, [date])
  useEffect(() => { localStorage.setItem("shipmentWizardCons", consNumber) }, [consNumber])

  const reset = () => {
    setStep(0); setSucursalId(user?.subsidiary?.id || ""); setDate(""); setConsNumber("");
    setNotRemoveCharge(false); setFiles(Array(steps.length - 1).fill(null)); setError(""); setInputErrors({});
    localStorage.removeItem("shipmentWizardFiles"); localStorage.removeItem("shipmentWizardSucursal");
    localStorage.removeItem("shipmentWizardDate"); localStorage.removeItem("shipmentWizardCons");
  }

  const close = () => { reset(); onOpenChange(false); }

  const handleFile = (index: number, file: File | null) => {
    setError("");
    const updated = [...files];
    updated[index] = file;
    setFiles(updated);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length) handleFile(step, droppedFiles[0]);
  }, [step]);

  const handleNext = async () => {
    setError(""); setInputErrors({});
    const newErrors: { sucursalId?: boolean; consNumber?: boolean } = {}
    if (!sucursalId) newErrors.sucursalId = true
    if (!consNumber) newErrors.consNumber = true

    if (Object.keys(newErrors).length > 0) {
      setInputErrors(newErrors);
      return setError("Por favor, completa los campos obligatorios resaltados.");
    }

    try {
      setLoading(true);
      if (step === 0 && files[0]) await uploadShipmentFile(files[0], sucursalId, consNumber, date || "")
      if (step === 1 && files[1]) await uploadShipmentFile(files[1], sucursalId, consNumber, date || "", true)
      if (step === 2 && files[2]) await uploadHighValueShipments(files[2], sucursalId, consNumber, date || "")
      if (step === 3 && files[3]) await uploadF2ChargeShipments(files[3], sucursalId, consNumber, date || "", notRemoveCharge)
      if (step === 4) await uploadShipmentPayments(files[4] || undefined)

      if (step < steps.length - 1) {
        setStep(step + 1)
      } else {
        onUploadSuccess(); close();
      }
    } catch (e: any) {
      setError(e.message || `Error al procesar: ${steps[step].label}`);
    } finally {
      setLoading(false);
    }
  }

  const handlePrev = () => setStep(step - 1)

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-4xl rounded-2xl shadow-xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-orange-600 text-lg font-bold">
              <Upload className="h-5 w-5" /> Importar Envíos
            </DialogTitle>
            <DialogDescription>
              Sigue los pasos para cargar la documentación del consolidado.
            </DialogDescription>
          </div>
          <Button variant="outline" size="sm" onClick={startTutorial} className="flex gap-2 text-orange-600 border-orange-200 hover:bg-orange-50">
            <HelpCircle className="h-4 w-4" /> Ver Tutorial
          </Button>
        </DialogHeader>

        <div id="wizard-stepper-container" className="w-full overflow-x-auto mb-4 p-1">
          <div className="flex items-center justify-between gap-4 min-w-[650px]">
            {steps.map(({ label, icon: Icon }, i) => {
              const isActive = i === step
              const isComplete = i < step
              return (
                <div key={i} className="flex-1 cursor-pointer" onClick={() => !loading && setStep(i)}>
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all duration-300",
                      isActive ? "border-orange-600 bg-orange-100 text-orange-600 shadow-md scale-110" :
                      isComplete ? "border-green-500 bg-green-100 text-green-600" :
                      "border-gray-300 bg-white text-gray-400"
                    )}>
                      {isComplete ? <CheckCheckIcon className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <p className={cn("text-[10px] mt-2 text-center uppercase tracking-tighter font-bold", isActive ? "text-orange-700" : "text-gray-500")}>
                      {label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full mt-4">
            <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
          <p className="text-gray-500 text-[11px] mt-3 bg-gray-50 p-2 rounded border-l-4 border-orange-400">
            <b className="text-orange-700">Instrucciones: </b> {steps[step].description}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-1.5">
            <Label className={cn(inputErrors.sucursalId && "text-red-600 font-bold")}>Sucursal *</Label>
            <div className={cn(inputErrors.sucursalId && "rounded-md ring-2 ring-red-500 ring-offset-1")}>
              <SucursalSelector 
                value={sucursalId} 
                onValueChange={(val) => {
                  setSucursalId(val)
                  setInputErrors(prev => ({ ...prev, sucursalId: false }))
                }} 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Fecha Consolidado</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div id="cons-input-wrapper" className="space-y-1.5">
            <Label className={cn(inputErrors.consNumber && "text-red-600 font-bold")}>Cons Number *</Label>
            <Input 
              value={consNumber} 
              placeholder="Ej: 3057... o GDL-2005-150"
              onChange={(e) => {
                setConsNumber(e.target.value)
                setInputErrors(prev => ({ ...prev, consNumber: false }))
              }}
              className={cn(inputErrors.consNumber && "border-red-500 focus-visible:ring-red-500")}
            />
          </div>
        </div>

        {step === 3 && (
          <div className="flex items-center space-x-3 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <Switch checked={notRemoveCharge} onCheckedChange={setNotRemoveCharge} />
            <Label className="text-sm font-medium text-blue-900">¿Solo subir cargos (no remover existentes)?</Label>
          </div>
        )}

        <div className="space-y-4">
          {step < steps.length - 1 ? (
            <div
              id="wizard-upload-zone"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="bg-orange-50 border-2 border-dashed border-orange-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-100/50 transition-all flex flex-col items-center justify-center gap-3 min-h-[200px]"
              onClick={() => fileInputRef.current?.click()}
            >
              <Input
                type="file"
                accept={ALLOWED_EXTENSIONS.map((e) => "." + e).join(",")}
                onChange={(e) => handleFile(step, e.target.files?.[0] || null)}
                ref={fileInputRef}
                className="hidden"
              />
              <div className="bg-white p-4 rounded-full shadow-sm text-orange-600">
                <Upload className="h-8 w-8" />
              </div>
              {files[step] ? (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-orange-900 bg-white px-4 py-1 rounded-full border border-orange-200 shadow-sm">
                    📄 {files[step]?.name}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-orange-800 tracking-tight">Selecciona o arrastra tu archivo Excel</p>
                  <p className="text-[11px] text-orange-600/70">Formatos permitidos: .xlsx, .xls, .csv</p>
                  {step === 4 && <p className="text-orange-700 font-bold text-[10px] uppercase mt-2">Opcional: puedes pulsar siguiente para procesar sin archivo</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="border border-green-200 p-5 rounded-xl bg-green-50 shadow-inner">
              <h4 className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Resumen de Carga
              </h4>
              <ul className="grid grid-cols-2 gap-3 text-[11px]">
                {steps.slice(0, steps.length - 1).map((s, i) => (
                  <li key={i} className={cn(
                    "flex items-center gap-2 p-2 rounded-md border",
                    files[i] ? "bg-white border-green-200 text-green-700" : "bg-red-50 border-red-100 text-red-600 opacity-60"
                  )}>
                    {files[i] ? <CheckCheckIcon className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    <span className="font-bold truncate">{s.label}:</span>
                    <span className="truncate">{files[i]?.name || "Omitido / No requerido"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-md animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <X className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-red-800 uppercase">Error en: {steps[step].label}</h3>
                  <p className="text-xs text-red-700 mt-1 font-medium leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-6 border-t mt-4">
            <Button variant="ghost" onClick={close} disabled={loading} className="rounded-full px-6 font-bold text-gray-500 hover:text-red-600">
              Cancelar proceso
            </Button>
            <div className="flex gap-3">
              {step > 0 && (
                <Button variant="outline" onClick={handlePrev} disabled={loading} className="rounded-full px-6 border-orange-200 text-orange-700 font-bold">
                  Anterior
                </Button>
              )}
              <Button 
                onClick={handleNext} 
                disabled={loading || (step < 4 && !files[step] && step !== 1 && step !== 0)} 
                className="rounded-full px-10 bg-orange-600 text-white hover:bg-orange-700 shadow-lg font-bold transition-all active:scale-95"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Procesando...</>
                ) : step === steps.length - 1 ? (
                  "Finalizar Importación"
                ) : (
                  "Siguiente Paso"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}