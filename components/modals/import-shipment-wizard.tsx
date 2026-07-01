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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/lib/toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SucursalSelector } from "../sucursal-selector"
import {
  uploadF2ChargeShipments,
  uploadShipmentFile,
  uploadShipmentPayments,
  uploadHighValueShipments,
  previewShipmentFile,
  type UploadPreview,
} from "@/lib/services/shipments"
import { useAuthStore } from "@/store/auth.store"
import { IconTruckLoading } from "@tabler/icons-react"
import { Switch } from "../ui/switch"

// Importación de Driver.js para el tutorial
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { Subsidiary } from "@/lib/types"

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
    label: "F2",
    description: "Sube el archivo para gestionar cargas F2 según la sucursal.",
    icon: IconTruckLoading,
  },
  {
    label: "Cobros",
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

  // Pre-validación (solo pasos que crean consolidado: 0 Cons Master, 1 Aéreos).
  const [preview, setPreview] = useState<UploadPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const PREVIEW_STEPS = [0, 1]

  // Pasos ya subidos OK → no se re-envían al re-visitarlos (evita duplicados).
  const [uploadedSteps, setUploadedSteps] = useState<Set<number>>(new Set())

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
          element: "#wizard-fields", // Selector de los inputs de arriba
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
          element: "#wizard-next-btn", // Botón Siguiente
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
  useEffect(() => { if (user?.subsidiary) setSucursalId(user.subsidiary.id ?? ""); }, [user]);
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
    setNotRemoveCharge(false); setFiles(Array(steps.length - 1).fill(null)); setError(""); setInputErrors({}); setPreview(null); setUploadedSteps(new Set());
    localStorage.removeItem("shipmentWizardFiles"); localStorage.removeItem("shipmentWizardSucursal");
    localStorage.removeItem("shipmentWizardDate"); localStorage.removeItem("shipmentWizardCons");
  }

  const close = () => { reset(); onOpenChange(false); }

  const handleFile = (index: number, file: File | null) => {
    setError("");
    setPreview(null);
    // Un archivo nuevo en este paso reactiva su subida (deja de estar "ya subido").
    setUploadedSteps((prev) => { const n = new Set(prev); n.delete(index); return n })
    const updated = [...files];
    updated[index] = file;
    setFiles(updated);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const runPreview = async (file: File) => {
    try {
      setPreviewing(true);
      const p = await previewShipmentFile(file, sucursalId, consNumber, "fedex");
      setPreview(p);
    } catch {
      setPreview(null); // el preview es informativo; si falla, no bloquea la subida
    } finally {
      setPreviewing(false);
    }
  }

  // Auto pre-validación al elegir archivo / cambiar paso o consNumber (con debounce).
  useEffect(() => {
    const f = files[step];
    if (!PREVIEW_STEPS.includes(step) || !(f instanceof File) || !sucursalId || !consNumber) { setPreview(null); return }
    const t = setTimeout(() => runPreview(f as File), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, consNumber, sucursalId, files])

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

    // Validación profunda ANTES de subir (pasos que crean consolidado).
    if (PREVIEW_STEPS.includes(step) && files[step] && preview) {
      if (preview.parseError) return setError(`Archivo inválido: ${preview.parseError}`);
      if (preview.withTracking === 0) return setError("El archivo no contiene guías válidas.");
      if (preview.consNumberExists) {
        return setError(`El consolidado "${preview.consNumberExists.consNumber}" YA existe en esta sucursal (${preview.consNumberExists.numberOfPackages} guías, ${preview.consNumberExists.date ? new Date(preview.consNumberExists.date).toLocaleDateString("es-MX") : "s/f"}). Usa otro Cons Number.`);
      }
      if (preview.newCount === 0) {
        return setError("Todas las guías de este archivo ya fueron importadas en esta sucursal. No hay nada nuevo que subir.");
      }
    }

    // Anti-duplicados: si este paso ya se subió OK (y no cambiaste el archivo),
    // NO se vuelve a enviar — solo avanza.
    if (uploadedSteps.has(step)) {
      if (step < steps.length - 1) { setStep(step + 1); return }
      onUploadSuccess(); close(); return
    }

    try {
      setLoading(true);
      let res: any = null
      let uploaded = false
      if (step === 0 && files[0]) { res = await uploadShipmentFile(files[0], sucursalId, consNumber, date || ""); uploaded = true }
      else if (step === 1 && files[1]) { res = await uploadShipmentFile(files[1], sucursalId, consNumber, date || "", true); uploaded = true }
      else if (step === 2 && files[2]) { res = await uploadHighValueShipments(files[2], sucursalId, consNumber, date || ""); uploaded = true }
      else if (step === 3 && files[3]) { res = await uploadF2ChargeShipments(files[3], sucursalId, consNumber, date || "", notRemoveCharge); uploaded = true }
      else if (step === 4 && files[4]) { res = await uploadShipmentPayments(files[4]); uploaded = true }

      if (res) toast.success(summarizeResult(step, res))
      if (uploaded) setUploadedSteps((prev) => new Set(prev).add(step))

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

  // Resumen legible del resultado del backend por paso (los shapes difieren).
  const summarizeResult = (st: number, res: any): string => {
    if (st === 0 || st === 1) {
      const s = res?.saved ?? 0, d = res?.duplicated ?? 0, f = res?.failed ?? 0
      return `${steps[st].label}: ${s} guardadas${d ? `, ${d} duplicadas` : ""}${f ? `, ${f} con error` : ""}.`
    }
    if (st === 3) {
      if (res?.summary) return `F2: ${res.summary.migrated ?? 0} migradas, ${res.summary.insertedNew ?? 0} nuevas${res.summary.failed ? `, ${res.summary.failed} con error` : ""}.`
      const n = res?.savedChargeShipments?.length ?? 0
      return `Cargos: ${n} guardados.`
    }
    return `${steps[st].label}: procesado correctamente.`
  }

  const completedCount = files.slice(0, steps.length - 1).filter(Boolean).length

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="flex max-h-[92vh] w-[96vw] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0"
      >
        {/* Header */}
        <DialogHeader className="space-y-0 border-b px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Upload className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold">Importar envíos FedEx</DialogTitle>
                <DialogDescription className="text-xs">Carga la documentación del consolidado, paso a paso.</DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={startTutorial} className="hidden shrink-0 gap-1.5 text-muted-foreground sm:flex">
              <HelpCircle className="h-4 w-4" /> Tutorial
            </Button>
          </div>
        </DialogHeader>

        {/* Stepper */}
        <div id="wizard-stepper-container" className="border-b bg-muted/30 px-5 py-4 sm:px-6">
          <div className="overflow-x-auto">
            <ol className="flex min-w-[560px] items-center">
              {steps.map(({ label, icon: Icon }, i) => {
                const isActive = i === step
                const isComplete = i < step
                return (
                  <li key={i} className={cn("flex items-center", i < steps.length - 1 ? "flex-1" : "")}>
                    <button
                      type="button"
                      onClick={() => !loading && !previewing && setStep(i)}
                      disabled={loading || previewing}
                      className="flex flex-col items-center gap-1.5 disabled:cursor-not-allowed"
                    >
                      <span className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                        isActive ? "border-primary bg-primary text-primary-foreground shadow-sm" :
                        isComplete ? "border-emerald-500 bg-emerald-500 text-white" :
                        "border-muted-foreground/25 bg-background text-muted-foreground",
                      )}>
                        {isComplete ? <CheckCheckIcon className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </span>
                      <span className={cn(
                        "max-w-[76px] text-center text-[10px] font-medium leading-tight",
                        isActive ? "text-foreground" : "text-muted-foreground",
                      )}>
                        {label}
                      </span>
                    </button>
                    {i < steps.length - 1 && (
                      <span className={cn("mx-1 mb-5 h-0.5 flex-1 rounded-full transition-colors", i < step ? "bg-emerald-500" : "bg-border")} />
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
          <p className="mt-3 rounded-lg border-l-[3px] border-primary bg-background px-3 py-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{steps[step].label}:</span> {steps[step].description}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          {/* Datos obligatorios */}
          <div id="wizard-fields" className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className={cn("text-xs", inputErrors.sucursalId && "text-destructive")}>Sucursal *</Label>
              <div className={cn("rounded-md", inputErrors.sucursalId && "ring-2 ring-destructive ring-offset-1")}>
                <SucursalSelector
                  value={sucursalId}
                  insideAModal={true}
                  onValueChange={(val) => {
                    const id = typeof val === "string" ? val : (val as Subsidiary).id;
                    setSucursalId(id ?? "")
                    setInputErrors(prev => ({ ...prev, sucursalId: false }))
                  }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha consolidado</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div id="cons-input-wrapper" className="space-y-1.5">
              <Label className={cn("text-xs", inputErrors.consNumber && "text-destructive")}>Cons Number *</Label>
              <Input
                value={consNumber}
                placeholder="Ej: 3057… o GDL-2005-150"
                onChange={(e) => {
                  setConsNumber(e.target.value)
                  setInputErrors(prev => ({ ...prev, consNumber: false }))
                }}
                className={cn(inputErrors.consNumber && "border-destructive focus-visible:ring-destructive")}
              />
            </div>
          </div>

          {/* Switch F2 (paso 3) */}
          {step === 3 && (
            <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-3">
              <Switch checked={notRemoveCharge} onCheckedChange={setNotRemoveCharge} className="mt-0.5" />
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Guardar F2 directo en cargos (no migrar)</Label>
                <p className="text-xs text-muted-foreground">
                  {notRemoveCharge
                    ? "ACTIVO: las guías se guardan DIRECTO en cargos. No se elimina nada de shipments."
                    : "INACTIVO (normal): las guías que ya estén en shipments se MIGRAN a cargos (se eliminan de shipments)."}
                </p>
              </div>
            </div>
          )}

          {step < steps.length - 1 ? (
            <>
              {/* Dropzone */}
              <div
                id="wizard-upload-zone"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                  files[step] ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
                )}
              >
                <Input
                  type="file"
                  accept={ALLOWED_EXTENSIONS.map((e) => "." + e).join(",")}
                  onChange={(e) => handleFile(step, e.target.files?.[0] || null)}
                  ref={fileInputRef}
                  className="hidden"
                />
                <span className={cn("grid h-12 w-12 place-items-center rounded-full", files[step] ? "bg-primary/15 text-primary" : "bg-background text-muted-foreground shadow-sm")}>
                  {files[step] ? <CheckCircle className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
                </span>
                {files[step] ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="max-w-[280px] truncate rounded-full border bg-background px-3 py-1 text-sm font-medium">📄 {files[step]?.name}</span>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleFile(step, null) }}
                        aria-label="Quitar archivo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {uploadedSteps.has(step) && (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle className="h-3.5 w-3.5" /> Ya subido — no se volverá a enviar
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Selecciona o arrastra tu archivo</p>
                    <p className="text-xs text-muted-foreground">Formatos: .xlsx, .xls, .csv</p>
                    {step === 4 && <p className="mt-1 text-[11px] font-medium text-primary">Opcional: puedes continuar sin archivo.</p>}
                  </div>
                )}
              </div>

              {/* Pre-validación (pasos que crean consolidado) */}
              {PREVIEW_STEPS.includes(step) && files[step] && (
                <div>
                  {previewing ? (
                    <div className="flex items-center gap-2 rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Validando archivo…
                    </div>
                  ) : preview ? (
                    <div className="space-y-2 rounded-xl border p-3 text-xs">
                      {preview.parseError ? (
                        <div className="flex items-center gap-2 font-medium text-destructive"><X className="h-4 w-4 shrink-0" /> {preview.parseError}</div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <div className="rounded-lg border bg-background p-2 text-center"><div className="text-base font-bold tabular-nums">{preview.withTracking}</div><div className="text-[10px] uppercase text-muted-foreground">Guías</div></div>
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-center"><div className="text-base font-bold tabular-nums text-emerald-700">{preview.newCount}</div><div className="text-[10px] uppercase text-emerald-700/70">Nuevas</div></div>
                            <div className={cn("rounded-lg border p-2 text-center", preview.alreadyImportedCount ? "border-amber-200 bg-amber-50" : "bg-background")}><div className={cn("text-base font-bold tabular-nums", preview.alreadyImportedCount && "text-amber-700")}>{preview.alreadyImportedCount}</div><div className="text-[10px] uppercase text-muted-foreground">Ya import.</div></div>
                            <div className={cn("rounded-lg border p-2 text-center", preview.duplicatesInFile ? "border-amber-200 bg-amber-50" : "bg-background")}><div className={cn("text-base font-bold tabular-nums", preview.duplicatesInFile && "text-amber-700")}>{preview.duplicatesInFile}</div><div className="text-[10px] uppercase text-muted-foreground">Dup. archivo</div></div>
                          </div>

                          {preview.consNumberExists ? (
                            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2.5 font-medium text-destructive">
                              <X className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>El Cons Number <b>{preview.consNumberExists.consNumber}</b> ya existe en esta sucursal ({preview.consNumberExists.numberOfPackages} guías, {preview.consNumberExists.date ? new Date(preview.consNumberExists.date).toLocaleDateString("es-MX") : "s/f"}). Usa otro número.</span>
                            </div>
                          ) : preview.newCount === 0 ? (
                            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2.5 font-medium text-destructive">
                              <X className="mt-0.5 h-4 w-4 shrink-0" /> Todas las guías ya fueron importadas en esta sucursal. No hay nada nuevo que subir.
                            </div>
                          ) : preview.alreadyImportedCount > 0 ? (
                            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-amber-800">
                              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" /> Se importarán <b>{preview.newCount}</b> guías nuevas; <b>{preview.alreadyImportedCount}</b> ya existen y se omitirán automáticamente.
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 font-medium text-emerald-700">
                              <CheckCircle className="h-4 w-4 shrink-0" /> {preview.newCount} guías listas para importar.
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (!consNumber || !sucursalId) ? (
                    <p className="text-[11px] text-muted-foreground">Ingresa <b>Sucursal</b> y <b>Cons Number</b> para validar el archivo antes de subir.</p>
                  ) : null}
                </div>
              )}
            </>
          ) : (
            /* Paso Confirmar: resumen */
            <div className="rounded-xl border bg-muted/30 p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <CheckSquare className="h-4 w-4 text-primary" /> Resumen de carga ({completedCount}/{steps.length - 1} con archivo)
              </h4>
              <ul className="grid gap-2 sm:grid-cols-2">
                {steps.slice(0, steps.length - 1).map((s, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border bg-background p-2 text-xs">
                    {files[i]
                      ? <CheckCheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                      : <X className="h-4 w-4 shrink-0 text-muted-foreground/50" />}
                    <span className="shrink-0 font-medium">{s.label}:</span>
                    <span className={cn("truncate", files[i] ? "text-foreground" : "text-muted-foreground")}>{files[i]?.name || "Omitido"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border-l-4 border-destructive bg-destructive/10 p-3">
              <X className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-destructive">Error en: {steps[step].label}</h3>
                <p className="mt-0.5 whitespace-pre-line text-xs text-destructive/90">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex-row items-center justify-between gap-2 border-t bg-background px-5 py-3 sm:px-6">
          <Button variant="ghost" onClick={close} disabled={loading} className="text-muted-foreground hover:text-destructive">
            Cancelar
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={handlePrev} disabled={loading || previewing}>Anterior</Button>
            )}
            <Button
              id="wizard-next-btn"
              onClick={handleNext}
              disabled={loading || previewing || (step < 4 && !files[step] && step !== 1 && step !== 0) || (PREVIEW_STEPS.includes(step) && !!preview?.consNumberExists)}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando…</>
              ) : previewing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validando…</>
              ) : step === steps.length - 1 ? (
                "Finalizar importación"
              ) : (
                "Siguiente paso"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}