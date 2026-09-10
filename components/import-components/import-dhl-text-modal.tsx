import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DataTable } from "@/components/data-table/data-table" 
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ColumnDef } from "@tanstack/react-table"
import { Download, Check, X, ChevronRight, ChevronLeft, FileSpreadsheet, Info } from "lucide-react"
import { SucursalSelector } from "@/components/sucursal-selector"
import * as XLSX from "xlsx"
import { toast } from "@/lib/toast"

export interface ParsedDhlShipment {
  awb: string;
  pid?: string;
  origin: string;
  destination: string;
  shipmentTime: string;
  product: string;
  pieces: number;
  weight: number;
  description: string;
  /** yyyy-MM-dd: vencimiento (EDD) precargado cuando el origen es el Excel de DHL. */
  dueDate?: string;
  /** true = la pieza no cruzó con la hoja Shipment (sin dirección/CP reales). */
  incomplete?: boolean;
  receiver: {
    name: string;
    contactName?: string;
    address1?: string;
    address2?: string;
    city: string;
    state: string;
    zip?: string;
    phone?: string;
  };
}

export interface FinalDhlSubmission {
  file: File;
  subsidiaryId: string;
  consDate?: string;
  consNumber?: string;
}

// Stepper visual (a nivel módulo: no se recrea en cada render del modal).
function WizardStepper({ step }: { step: number }) {
  const stepsList = [
    { id: 1, label: "Extraer Datos" },
    { id: 2, label: "Exportar" },
    { id: 3, label: "Finalizar" },
  ]
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {stepsList.map((s, idx) => (
        <div key={s.id} className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                step > s.id
                  ? "bg-[#e5282d] text-white shadow-md shadow-red-200"
                  : step === s.id
                  ? "border-2 border-[#e5282d] text-[#e5282d] bg-red-50 ring-4 ring-red-50"
                  : "border-2 border-gray-200 text-gray-400 bg-white"
              }`}
            >
              {step > s.id ? <Check className="h-4 w-4" /> : s.id}
            </div>
            <span className={`text-sm font-medium whitespace-nowrap transition-colors duration-300 ${step >= s.id ? "text-gray-900" : "text-gray-400"}`}>
              {s.label}
            </span>
          </div>
          {idx < stepsList.length - 1 && (
            <div className="relative h-[2px] w-6 sm:w-10 bg-gray-200 mx-1 rounded-full overflow-hidden">
              <div className={`absolute top-0 left-0 h-full bg-[#e5282d] transition-all duration-500 ${step > s.id ? "w-full" : "w-0"}`} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

interface ImportDhlTextModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onProcessText: (text: string) => Promise<ParsedDhlShipment[]>;
  onFinalSave: (data: FinalDhlSubmission) => Promise<void>;
  /** TEMPORAL: parseo del Excel de DHL (combina 3 hojas) para armar el preview. */
  onParseFile?: (file: File) => Promise<ParsedDhlShipment[]>;
  defaultSubsidiaryId?: string;
}

export function ImportDhlTextModal({
  isOpen,
  onOpenChange,
  onProcessText,
  onFinalSave,
  onParseFile,
  defaultSubsidiaryId = ""
}: ImportDhlTextModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [text, setText] = useState("")
  const [parsedData, setParsedData] = useState<ParsedDhlShipment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  // Origen del preview: "paste" (texto) usa el Paso 3 (capturar cons/sucursal);
  // "file" (Excel de DHL) ya trae todo → del Paso 2 se guarda directo a la BD.
  const [origin, setOrigin] = useState<"paste" | "file">("paste")

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [subsidiaryId, setSubsidiaryId] = useState<string>(defaultSubsidiaryId)
  const [consDate, setConsDate] = useState<string>("")
  const [consNumber, setConsNumber] = useState<string>("")
  // Fechas de vencimiento editadas inline (clave = awb|pid). Evita el ida-y-vuelta del Excel.
  const [dueDates, setDueDates] = useState<Record<string, string>>({})
  const dueKey = (item: ParsedDhlShipment) => `${item.awb}|${item.pid || ""}`
  // DHL suele poner "N/A" en receiver.name (es la razón social genérica) y el
  // destinatario real va en "Ctc Nm" (contactName). Mismo criterio que el backend
  // al persistir (recipientName = contactName || name).
  const recipientName = (r: ParsedDhlShipment["receiver"]) =>
    (r.contactName?.trim() || r.name || "").trim()

  useEffect(() => {
    if (isOpen && defaultSubsidiaryId) {
      setSubsidiaryId(defaultSubsidiaryId)
    }
  }, [isOpen, defaultSubsidiaryId])

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setStep(1)
      setText("")
      setParsedData([])
      setUploadFile(null)
      setSubsidiaryId(defaultSubsidiaryId)
      setConsDate("")
      setConsNumber("")
      setDueDates({})
      setOrigin("paste")
    }, 300)
  }

  const handleProcessText = async () => {
    if (!text.trim()) return;

    try {
      setIsLoading(true)
      const data = await onProcessText(text)
      if (!data || data.length === 0) {
        toast.warning("No se detectaron guías en el texto. Verifica que pegaste el reporte completo de DHL.")
        return
      }
      setOrigin("paste")
      setParsedData(data)
      setDueDates({})
      setStep(2)
      toast.success(`${data.length} paquete(s) detectado(s).`)
    } catch (error: any) {
      console.error("Error al procesar el texto", error)
      toast.error(error?.response?.data?.message || "No se pudo procesar el texto de DHL.")
    } finally {
      setIsLoading(false)
    }
  }

  // TEMPORAL: leer el Excel de DHL (3 hojas) → arma el preview igual que el
  // pegado, pero con los vencimientos (EDD) ya precargados desde el archivo.
  const handleFileParse = async (file: File | null | undefined) => {
    if (!file || !onParseFile) return;
    try {
      setIsLoading(true)
      const data = await onParseFile(file)
      if (!data || data.length === 0) {
        toast.warning("El archivo no contiene piezas válidas. Verifica que sea el Excel de DHL con sus hojas.")
        return
      }
      setOrigin("file")
      setParsedData(data)
      // Prellenar los vencimientos desde el archivo (editable en la tabla).
      const seeded: Record<string, string> = {}
      data.forEach((item) => { if (item.dueDate) seeded[dueKey(item)] = item.dueDate })
      setDueDates(seeded)
      setStep(2)
      const incompletas = data.filter((d) => d.incomplete).length
      toast.success(
        `${data.length} pieza(s) leída(s) del Excel${incompletas ? ` · ${incompletas} sin dirección/CP` : ""}.`
      )
    } catch (error: any) {
      console.error("Error al leer el Excel de DHL", error)
      toast.error(error?.message || error?.response?.data?.message || "No se pudo leer el Excel de DHL.")
    } finally {
      setIsLoading(false)
    }
  }

  // Construye el workbook del layout (mismo formato que el descargable), tomando
  // las fechas de vencimiento editadas inline. Reutilizado por descarga y por el
  // archivo que se manda al guardar (así el backend sigue recibiendo el Excel).
  const buildWorkbook = () => {
    const headers = ["#", "AWB Maestro", "PID (Pieza)", "Nombre", "Dirección", "Ciudad", "CP", "Teléfono", "Piezas", "Vencimiento"];
    // Mantener el mismo orden de ingreso del texto (igual que la tabla del paso 2).
    const dataRows = parsedData.map((item, index) => {
      const direccionCompleta = [item.receiver.address1, item.receiver.address2].filter(Boolean).join(", ");
      return [
        index + 1, item.awb, item.pid || "", recipientName(item.receiver), direccionCompleta,
        item.receiver.city, item.receiver.zip || "", { v: item.receiver.phone || "", t: "s" },
        item.pieces, dueDates[dueKey(item)] || "",
      ];
    });
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    worksheet["!cols"] = [{ wch: 5 }, { wch: 15 }, { wch: 22 }, { wch: 30 }, { wch: 45 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 8 }, { wch: 15 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Envios_DHL");
    return workbook;
  }

  const handleExportExcel = () => {
    XLSX.writeFile(buildWorkbook(), `dhl_envios_${new Date().getTime()}.xlsx`);
  }

  /** Genera el archivo .xlsx en memoria (con las fechas inline) para mandarlo al backend. */
  const buildLayoutFile = (): File => {
    const out = XLSX.write(buildWorkbook(), { type: "array", bookType: "xlsx" });
    return new File([out], `dhl_envios_${new Date().getTime()}.xlsx`, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  // Paso 2 → 3: arma el layout desde las fechas inline (sin descargar/re-subir).
  const goToFinalStep = () => {
    setUploadFile(buildLayoutFile())
    setStep(3)
  }

  // Guardado DIRECTO (origen archivo): del Paso 2 se sube a la BD sin pasar por
  // el Paso 3. Arma el layout en memoria con lo validado (incluye los
  // vencimientos editados) — no hay descarga ni re-subida manual.
  const handleDirectSave = async () => {
    if (!subsidiaryId) { toast.error("Selecciona la sucursal de destino."); return; }
    try {
      setIsLoading(true)
      await onFinalSave({ file: buildLayoutFile(), subsidiaryId, consDate, consNumber })
      toast.success("Envíos DHL importados correctamente.")
      handleClose()
    } catch (error: any) {
      console.error("Error al guardar los envíos", error)
      toast.error(error?.response?.data?.message || "No se pudieron importar los envíos.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFinalSubmit = async () => {
    if (!subsidiaryId) { toast.error("Selecciona la sucursal de destino."); return; }
    const file = uploadFile ?? buildLayoutFile();

    try {
      setIsLoading(true)
      await onFinalSave({ file, subsidiaryId, consDate, consNumber })
      toast.success("Envíos DHL importados correctamente.")
      handleClose()
    } catch (error: any) {
      console.error("Error al guardar los envíos finales", error)
      toast.error(error?.response?.data?.message || "No se pudieron importar los envíos.")
    } finally {
      setIsLoading(false)
    }
  }

  const columns: ColumnDef<ParsedDhlShipment>[] = [
    {
      id: "index",
      header: "#",
      cell: ({ row }) => <span className="font-medium text-muted-foreground">{row.index + 1}</span>,
    },
    {
      // id = "trackingNumber" para que el buscador global del DataTable lo incluya.
      id: "trackingNumber",
      accessorFn: (r) => r.awb,
      header: "AWB Maestro",
      cell: ({ row }) => <span className="font-bold text-gray-900">{row.original.awb}</span>,
    },
    {
      // id "pid" → buscable por PID/dhlUniqueId.
      accessorKey: "pid",
      header: "Pieza (PID)",
      cell: ({ row }) => <span className="text-sm font-mono text-muted-foreground">{row.original.pid || "-"}</span>,
    },
    {
      id: "recipientName",
      accessorFn: (r) => recipientName(r.receiver),
      header: "Destinatario",
      cell: ({ row }) => {
        const name = recipientName(row.original.receiver)
        return <span className="truncate max-w-[150px] block font-medium" title={name}>{name}</span>
      },
    },
    {
      id: "recipientAddress",
      accessorFn: (r) => [r.receiver.address1, r.receiver.address2].filter(Boolean).join(", "),
      header: "Dirección",
      cell: ({ row }) => {
        const r = row.original.receiver
        const dir = [r.address1, r.address2].filter(Boolean).join(", ")
        if (!dir) {
          return <span className="text-xs font-medium text-amber-600">Sin dirección</span>
        }
        return <span className="truncate max-w-[220px] block text-sm" title={dir}>{dir}</span>
      },
    },
    {
      id: "recipientZip",
      accessorFn: (r) => r.receiver.zip || "",
      header: "CP",
      cell: ({ row }) => {
        const zip = row.original.receiver.zip
        return zip
          ? <span className="text-sm">{zip}</span>
          : <span className="text-xs font-medium text-amber-600">—</span>
      },
    },
    {
      accessorKey: "shipmentTime",
      header: "Fecha Envío",
    },
    {
      id: "vencimiento",
      header: "Vencimiento",
      cell: ({ row }) => {
        const key = dueKey(row.original)
        return (
          <Input
            type="date"
            value={dueDates[key] || ""}
            onChange={(e) => setDueDates((prev) => ({ ...prev, [key]: e.target.value }))}
            className="h-8 w-[150px] focus-visible:ring-[#e5282d]"
          />
        )
      },
    },
  ]

  // Layout listo si hay sucursal (el archivo se arma desde las fechas inline; el
  // upload manual es opcional/override).
  const isStep3Valid = subsidiaryId !== "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[1100px] bg-white max-h-[90vh] flex flex-col overflow-hidden p-0 border-0 shadow-2xl">
        
        {/* HEADER */}
        <DialogHeader className="flex flex-col sm:flex-row sm:items-center justify-between p-6 pb-5 border-b border-gray-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4 mb-5 sm:mb-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-red-100 text-[#e5282d] shadow-inner border border-red-200/50">
              <FileSpreadsheet className="h-7 w-7" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">
                Importar Excel de DHL
              </DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1.5 font-medium">
                <span className={parsedData.length > 0 ? "text-[#e5282d] font-semibold bg-red-50 px-2 py-0.5 rounded-full" : ""}>
                  {parsedData.length > 0 ? `${parsedData.length} paquetes detectados` : "Extracción de texto plano"}
                </span>
                {subsidiaryId && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="truncate max-w-[150px]">{subsidiaryId}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <WizardStepper step={step} />
        </DialogHeader>
        
        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          
          {/* --- PASO 1 --- */}
          {step === 1 && (
            <div className="grid gap-5 animate-in fade-in slide-in-from-right-4 duration-500 h-full flex-col flex">
              {/* TEMPORAL: subir el Excel nativo de DHL (3 hojas) — AL INICIO.
                  Combina Shipment+Piece y precarga los vencimientos (EDD). */}
              {onParseFile && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900">
                        Sube el Excel de DHL <span className="font-normal text-amber-700">(temporal)</span>
                      </p>
                      <p className="text-[12px] text-amber-700 mt-0.5 leading-relaxed">
                        Combina las hojas del archivo y arma la tabla con los <strong>vencimientos ya cargados</strong>. Solo revísala y continúa.
                      </p>
                      <div className="mt-3 grid gap-1.5">
                        <Label className="text-xs font-semibold text-amber-900">Sucursal de destino (*)</Label>
                        <SucursalSelector
                          value={subsidiaryId}
                          onValueChange={(val) => setSubsidiaryId(typeof val === "string" ? val : Array.isArray(val) ? (val[0] as any)?.id ?? "" : (val as any)?.id ?? "")}
                          insideAModal={true}
                        />
                      </div>
                      <Input
                        type="file"
                        accept=".xlsx, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        disabled={isLoading || !subsidiaryId}
                        onChange={(e) => { handleFileParse(e.target.files?.[0]); e.target.value = "" }}
                        className="mt-3 cursor-pointer bg-white file:text-amber-700 file:font-semibold file:bg-amber-100 file:border-0 file:rounded-md file:px-4 file:py-1 hover:file:bg-amber-200 transition-colors focus-visible:ring-amber-400 h-auto py-2 disabled:opacity-60"
                      />
                      {!subsidiaryId && (
                        <p className="text-[12px] text-amber-700 mt-1">Selecciona la sucursal antes de subir el archivo.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Separador: pegado como opción secundaria */}
              {onParseFile && (
                <div className="flex items-center gap-3 text-xs font-medium text-gray-400">
                  <div className="h-px flex-1 bg-gray-200" />
                  o pega el texto
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
              )}

              <div className="bg-gradient-to-r from-red-50 to-white p-4 rounded-xl border border-red-100/50 text-red-900 text-sm shadow-sm flex items-start gap-3">
                <Info className="h-5 w-5 text-[#e5282d] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Copia el contenido crudo (texto plano) directamente desde tu fuente de DHL y pégalo en el cuadro de abajo. El sistema extraerá las <strong>guías</strong> y los <strong>PIDs</strong> automáticamente para generar tu layout.
                </p>
              </div>
              <Textarea
                placeholder="AWB : 4465779301&#10;Orig  Dest  Shipment Time..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 min-h-[240px] font-mono text-xs whitespace-pre bg-white border-gray-200 shadow-sm focus-visible:ring-[#e5282d] focus-visible:border-[#e5282d] rounded-xl resize-none p-4"
              />
            </div>
          )}

          {/* --- PASO 2 --- */}
          {step === 2 && (
            <div className="grid gap-5 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-xl border border-gray-200 shadow-sm gap-4 relative overflow-hidden">
                {/* Acento lateral de marca */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#e5282d]"></div>
                <div className="pl-2">
                  <h4 className="font-bold text-gray-900 text-base">Validación de Datos</h4>
                  <p className="text-sm text-gray-500 mt-1.5">
                    {origin === "file" ? (
                      <>Revisa que todo esté correcto. Los <strong className="text-gray-700">vencimientos</strong> ya vienen del archivo (puedes ajustarlos en la columna <strong className="text-gray-700">Vencimiento</strong>). Al continuar se sube directo a la base de datos.</>
                    ) : (
                      <>Captura las <strong className="text-gray-700">fechas de vencimiento</strong> directamente en la columna <strong className="text-gray-700">Vencimiento</strong> de la tabla. (Opcional: descarga el layout en Excel si lo prefieres.)</>
                    )}
                  </p>
                </div>
                {/* La descarga del layout solo aplica al pegado (captura manual de
                    fechas). Si venimos del archivo, no se descarga nada. */}
                {origin === "paste" && (
                  <Button
                    onClick={handleExportExcel}
                    className="bg-[#e5282d] hover:bg-red-700 text-white shadow-md shadow-red-200 whitespace-nowrap shrink-0 transition-all rounded-lg"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Excel
                  </Button>
                )}
              </div>
              <div className="overflow-hidden">
                {/* Búsqueda global: AWB, PID, destinatario, dirección y CP
                    (ver globalFilterFn del DataTable). */}
                <DataTable
                  columns={columns}
                  data={parsedData}
                  searchKey="trackingNumber"
                />
              </div>
            </div>
          )}

          {/* --- PASO 3 --- */}
          {step === 3 && (
            <div className="grid gap-6 py-4 max-w-lg mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-2 text-center">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-bold text-gray-900 text-lg">Casi listo</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Tu layout ya está listo con las fechas que capturaste ({parsedData.length} envío(s)). Configura el consolidado y finaliza.
                </p>
              </div>

              <div className="grid gap-2.5">
                <Label htmlFor="file-upload" className="font-semibold text-gray-700">Reemplazar con tu Excel <span className="font-normal text-gray-400">(opcional)</span></Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || buildLayoutFile())}
                  className="cursor-pointer file:text-[#e5282d] file:font-semibold file:bg-red-50 file:border-0 file:rounded-md file:px-4 file:py-1 hover:file:bg-red-100 transition-colors focus-visible:ring-[#e5282d] h-auto py-2"
                />
                <p className="text-[12px] text-gray-400 font-medium">
                  Solo si capturaste las fechas en Excel en vez de en la tabla. Si no, deja esto vacío.
                </p>
              </div>

              <div className="grid gap-2.5">
                <Label className="font-semibold text-gray-700">Sucursal de Destino (*)</Label>
                <SucursalSelector
                  value={subsidiaryId}
                  onValueChange={(val) => setSubsidiaryId(typeof val === "string" ? val : Array.isArray(val) ? (val[0] as any)?.id ?? "" : (val as any)?.id ?? "")}
                  insideAModal={true}
                />
              </div>

              <div className="grid gap-2.5">
                <Label htmlFor="cons-date" className="font-semibold text-gray-700">Fecha del Consolidado <span className="font-normal text-gray-400">(Opcional)</span></Label>
                <Input 
                  id="cons-date" 
                  type="date" 
                  value={consDate}
                  onChange={(e) => setConsDate(e.target.value)}
                  className="focus-visible:ring-[#e5282d]"
                />
              </div>

              <div className="grid gap-2.5">
                <Label htmlFor="cons-number" className="font-semibold text-gray-700">Número de Consolidado <span className="font-normal text-gray-400">(Opcional)</span></Label>
                <Input 
                  id="cons-number" 
                  placeholder="Ej. DHL-20260429" 
                  value={consNumber}
                  onChange={(e) => setConsNumber(e.target.value)}
                  className="focus-visible:ring-[#e5282d]"
                />
                <p className="text-[12px] text-gray-400 font-medium">
                  Si se deja en blanco, se generará automáticamente con la fecha de hoy.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between items-center w-full p-6 border-t border-gray-100 bg-white gap-3 sm:gap-0">
          <Button 
            variant="ghost" 
            onClick={handleClose} 
            disabled={isLoading}
            className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 w-full sm:w-auto rounded-lg font-medium"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar Operación
          </Button>
          
          <div className="flex gap-3 w-full sm:w-auto">
            {step > 1 && (
              <Button 
                variant="outline" 
                onClick={() => setStep(step === 2 ? 1 : 2)} 
                disabled={isLoading}
                className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 w-full sm:w-auto rounded-lg"
              >
                <ChevronLeft className="h-4 w-4 mr-1.5" />
                Regresar
              </Button>
            )}

            {step === 1 && (
              <Button 
                onClick={handleProcessText} 
                disabled={!text.trim() || isLoading}
                className="bg-[#e5282d] hover:bg-red-700 text-white w-full sm:w-auto rounded-lg shadow-md shadow-red-200/50"
              >
                {isLoading ? "Procesando Datos..." : "Siguiente Paso"}
                {!isLoading && <ChevronRight className="h-4 w-4 ml-1.5" />}
              </Button>
            )}

            {step === 2 && origin === "file" && (
              <Button
                onClick={handleDirectSave}
                disabled={isLoading || !subsidiaryId}
                className="bg-[#e5282d] hover:bg-red-700 text-white w-full sm:w-auto rounded-lg shadow-md shadow-red-200/50"
              >
                {isLoading ? "Importando Envíos..." : "Subir a la base de datos"}
                {!isLoading && <Check className="h-4 w-4 ml-2" />}
              </Button>
            )}

            {step === 2 && origin === "paste" && (
              <Button
                onClick={goToFinalStep}
                className="bg-[#e5282d] hover:bg-red-700 text-white w-full sm:w-auto rounded-lg shadow-md shadow-red-200/50"
              >
                Siguiente Paso
                <ChevronRight className="h-4 w-4 ml-1.5" />
              </Button>
            )}

            {step === 3 && (
              <Button 
                onClick={handleFinalSubmit} 
                disabled={isLoading || !isStep3Valid}
                className="bg-[#e5282d] hover:bg-red-700 text-white shadow-md shadow-red-200/50 w-full sm:w-auto rounded-lg" 
              >
                {isLoading ? "Importando Envíos..." : "Finalizar Importación"}
                {!isLoading && <Check className="h-4 w-4 ml-2" />}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}