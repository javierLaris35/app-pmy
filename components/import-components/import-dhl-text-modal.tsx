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

interface ImportDhlTextModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onProcessText: (text: string) => Promise<ParsedDhlShipment[]>;
  onFinalSave: (data: FinalDhlSubmission) => Promise<void>;
  defaultSubsidiaryId?: string;
}

export function ImportDhlTextModal({ 
  isOpen, 
  onOpenChange, 
  onProcessText,
  onFinalSave,
  defaultSubsidiaryId = ""
}: ImportDhlTextModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [text, setText] = useState("")
  const [parsedData, setParsedData] = useState<ParsedDhlShipment[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [subsidiaryId, setSubsidiaryId] = useState<string>(defaultSubsidiaryId)
  const [consDate, setConsDate] = useState<string>("")
  const [consNumber, setConsNumber] = useState<string>("")

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
    }, 300) 
  }

  const handleProcessText = async () => {
    if (!text.trim()) return;
    
    try {
      setIsLoading(true)
      const data = await onProcessText(text)
      setParsedData(data || [])
      setStep(2) 
    } catch (error) {
      console.error("Error al procesar el texto", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportExcel = () => {
    const headers = [
      "#", 
      "AWB Maestro", 
      "PID (Pieza)", 
      "Nombre", 
      "Dirección",
      "Ciudad", 
      "CP",
      "Teléfono",
      "Piezas", 
      "Vencimiento" 
    ];

    // 1. Ordenamos los datos por PID alfabéticamente
    // Hacemos una copia [...parsedData] para no mutar el estado original
    const sortedData = [...parsedData].sort((a, b) => {
      const pidA = a.pid || "";
      const pidB = b.pid || "";
      return pidA.localeCompare(pidB);
    });

    // 2. Mapeamos usando los datos ya ordenados (sortedData en lugar de parsedData)
    const dataRows = sortedData.map((item, index) => {
      const direccionCompleta = [item.receiver.address1, item.receiver.address2]
        .filter(Boolean)
        .join(", ");

      return [
        index + 1, 
        item.awb,
        item.pid || "",
        item.receiver.name,
        direccionCompleta,
        item.receiver.city,
        item.receiver.zip || "",
        { v: item.receiver.phone || "", t: 's' }, 
        item.pieces,
        "" 
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    worksheet['!cols'] = [
      { wch: 5 },  
      { wch: 15 }, 
      { wch: 22 }, 
      { wch: 30 }, 
      { wch: 45 }, 
      { wch: 15 }, 
      { wch: 10 }, 
      { wch: 15 }, 
      { wch: 8 },  
      { wch: 15 }, 
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Envios_DHL");
    XLSX.writeFile(workbook, `dhl_envios_${new Date().getTime()}.xlsx`);
  }

  const handleFinalSubmit = async () => {
    if (!uploadFile || !subsidiaryId) return;
    
    try {
      setIsLoading(true)
      await onFinalSave({
        file: uploadFile,
        subsidiaryId, 
        consDate,
        consNumber
      })
      handleClose()
    } catch (error) {
      console.error("Error al guardar los envíos finales", error)
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
      accessorKey: "awb",
      header: "AWB Maestro",
      cell: ({ row }) => <span className="font-bold text-gray-900">{row.original.awb}</span>,
    },
    {
      accessorKey: "pid",
      header: "Pieza (PID)",
      cell: ({ row }) => <span className="text-sm font-mono text-muted-foreground">{row.original.pid || "-"}</span>,
    },
    {
      accessorKey: "receiver.name",
      header: "Destinatario",
      cell: ({ row }) => <span className="truncate max-w-[150px] block font-medium" title={row.original.receiver.name}>{row.original.receiver.name}</span>,
    },
    {
      accessorKey: "receiver.city",
      header: "Ciudad",
    },
    {
      accessorKey: "shipmentTime",
      header: "Fecha Envío",
    }
  ]

  const isStep3Valid = uploadFile !== null && subsidiaryId !== "";

  // Stepper Visual Mejorado con estilos de marca
  const WizardStepper = () => {
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
              <span 
                className={`text-sm font-medium whitespace-nowrap transition-colors duration-300 ${
                  step >= s.id ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            
            {/* Línea conectora animada */}
            {idx < stepsList.length - 1 && (
              <div className="relative h-[2px] w-6 sm:w-10 bg-gray-200 mx-1 rounded-full overflow-hidden">
                <div 
                  className={`absolute top-0 left-0 h-full bg-[#e5282d] transition-all duration-500 ${
                    step > s.id ? "w-full" : "w-0"
                  }`} 
                />
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

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
          
          <WizardStepper />
        </DialogHeader>
        
        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          
          {/* --- PASO 1 --- */}
          {step === 1 && (
            <div className="grid gap-5 animate-in fade-in slide-in-from-right-4 duration-500 h-full flex-col flex">
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
                className="flex-1 min-h-[350px] font-mono text-xs whitespace-pre bg-white border-gray-200 shadow-sm focus-visible:ring-[#e5282d] focus-visible:border-[#e5282d] rounded-xl resize-none p-4"
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
                    Descarga el layout, agrega las <strong className="text-gray-700">fechas de vencimiento</strong> en la última columna de Excel y guárdalo para el siguiente paso.
                  </p>
                </div>
                <Button 
                  onClick={handleExportExcel} 
                  className="bg-[#e5282d] hover:bg-red-700 text-white shadow-md shadow-red-200 whitespace-nowrap shrink-0 transition-all rounded-lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Excel
                </Button>
              </div>
              <div className="overflow-hidden">
                <DataTable 
                  columns={columns} 
                  data={parsedData} 
                  searchKey="awb" 
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
                  Sube el archivo Excel corregido y configura los datos del consolidado para finalizar.
                </p>
              </div>

              <div className="grid gap-2.5">
                <Label htmlFor="file-upload" className="font-semibold text-gray-700">Archivo Excel Corregido (*)</Label>
                <Input 
                  id="file-upload" 
                  type="file" 
                  accept=".xlsx, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="cursor-pointer file:text-[#e5282d] file:font-semibold file:bg-red-50 file:border-0 file:rounded-md file:px-4 file:py-1 hover:file:bg-red-100 transition-colors focus-visible:ring-[#e5282d] h-auto py-2"
                />
              </div>

              <div className="grid gap-2.5">
                <Label className="font-semibold text-gray-700">Sucursal de Destino (*)</Label>
                <SucursalSelector 
                  value={subsidiaryId}
                  onValueChange={setSubsidiaryId}
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

            {step === 2 && (
              <Button 
                onClick={() => setStep(3)}
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