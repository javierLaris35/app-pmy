"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { 
  Truck, XCircle, Download, RefreshCw, ScanBarcode, 
  Plus, Loader2, CheckCircle, Package, RotateCcw
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { DataTable } from "@/components/data-table/data-table" 
import { getUndeliveredShipments, validateDevolution, saveDevolutions, uploadFiles } from "@/lib/services/devolutions"
import { validateCollection, saveCollections } from "@/lib/services/collections"
import { BarcodeScannerInput } from "../barcode-input/barcode-scanner-input"
import { RepartidorSelector } from "../selectors/repartidor-selector"
import { UnidadSelector } from "../selectors/unidad-selector"
import { getUnifiedColumns } from "./columns"

// PDF & Excel
import { EnhancedFedExPDF } from "@/lib/services/pdf-generator"
import { pdf } from "@react-pdf/renderer"
import { generateFedExExcel } from "@/lib/services/returning/returning-excel-generator"

const VALIDATION_REGEX = /^\d{12}$/

export default function UnifiedCollectionReturnForm({ selectedSubsidiaryId, subsidiaryName, onClose, onSuccess }: any) {
  const [activeTab, setActiveTab] = useState("devolutions")
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [enableCollections, setEnableCollections] = useState(false)
  const [lastScannedCode, setLastScannedCode] = useState("")
  
  const [devolutions, setDevolutions] = useState<any[]>([])
  const [collections, setCollections] = useState<any[]>([])
  const [selectedDrivers, setSelectedDrivers] = useState<any[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)

  // Color Café Institucional
  const brandCoffee = "bg-[#3d2b1f]"; // Ajusta este HEX a tu café exacto

  // 1. CARGA INICIAL
  const loadInitialData = useCallback(async () => {
    if (!selectedSubsidiaryId) return
    try {
      setLoading(true)
      const now = new Date().toISOString().split('T')[0]
      const data = await getUndeliveredShipments(selectedSubsidiaryId, now)
      setDevolutions(data || [])
    } catch (error) {
      toast.error("Error al sincronizar datos")
    } finally {
      setLoading(false)
    }
  }, [selectedSubsidiaryId])

  useEffect(() => { loadInitialData() }, [loadInitialData])

  // 2. PROCESAMIENTO ROBUSTO
  const processTrackingCode = useCallback(async (code: string) => {
    // Extraer solo los números y asegurar que sean 12
    const cleanCode = code.replace(/\D/g, "").trim();
    
    if (cleanCode.length !== 12) return;

    // Evitar que se valide si ya se está validando la misma guía
    if (validating && lastScannedCode === cleanCode) return;

    setValidating(true);
    try {
      if (activeTab === "devolutions") {
        if (devolutions.some(d => d.trackingNumber === cleanCode)) {
          toast.warning(`Guía ${cleanCode} ya está en lista`);
          return;
        }
        const res = await validateDevolution(cleanCode);
        if (res) {
          setDevolutions(prev => {
            // Verificamos el duplicado justo antes de insertar usando 'prev' (el estado más actual)
            if (prev.some(d => d.trackingNumber === cleanCode)) return prev;
            return [{ ...res, id: res.id || cleanCode }, ...prev];
          });
          toast.success(`Guía ${cleanCode} agregada`);
        }
      } else {
        if (collections.some(c => c.trackingNumber === cleanCode)) {
          toast.warning(`Recolección ${cleanCode} ya escaneada`);
          return;
        }
        const res = await validateCollection(cleanCode);
        setCollections(prev => {
          if (prev.some(c => c.trackingNumber === cleanCode)) return prev;
          return [{ 
            trackingNumber: cleanCode, 
            status: res.status || "PICK UP", 
            isPickUp: true,
            subsidiary: { id: selectedSubsidiaryId } 
          }, ...prev];
        });
        toast.success(`Recolección ${cleanCode} lista`);
      }
    } catch (error) {
      toast.error(`Error con guía ${cleanCode}`);
    } finally {
      setValidating(false);
    }
  }, [activeTab, devolutions, collections, validating, lastScannedCode, selectedSubsidiaryId]);

  const habndlePdfDownload = async () => {
    setLoading(true)  
    try {
      if (!selectedDrivers.length || !selectedVehicle) {
        toast.error("Selecciona Chofer y Unidad antes de finalizar")
        return
      }
      
      const currentDate = new Date().toLocaleDateString("es-ES").replace(/\//g, "-")
      const blob = await pdf(<EnhancedFedExPDF collections={collections} devolutions={devolutions} subsidiaryName={subsidiaryName} />).toBlob()
      const pdfFile = new File([blob], `${selectedDrivers[0]?.name.toUpperCase()}--${subsidiaryName}--Devoluciones--${currentDate.replace(/\//g, "-")}.pdf`, { type: 'application/pdf' })
      const excelBuffer = await generateFedExExcel(collections, devolutions, subsidiaryName)
      const excelFile = new File([excelBuffer], `${selectedDrivers[0]?.name.toUpperCase()}--${subsidiaryName}--Devoluciones--${currentDate.replace(/\//g, "-")}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      window.open(URL.createObjectURL(blob), '_blank')
    } catch (error) {
      toast.error("Error al generar PDF")
    } finally {
      setLoading(false)
    }   
  }

  // 4. GUARDADO Y PDF (Lógica Original)
  const handleFinalSave = async () => {
    if (!selectedDrivers.length || !selectedVehicle) {
      toast.error("Selecciona Chofer y Unidad antes de finalizar")
      return
    }

    setLoading(true)
    try {
      const promises = []
      if (collections.length > 0) promises.push(saveCollections(collections))
      if (devolutions.length > 0) {
        const toSave = devolutions.map(d => ({
          trackingNumber: d.trackingNumber,
          subsidiary: { id: selectedSubsidiaryId },
          status: d.status,
          reason: d.lastStatus?.exceptionCode
        }))
        promises.push(saveDevolutions(toSave))
      }

      await Promise.all(promises)
      
      // Generar PDF y Excel
      const blob = await pdf(<EnhancedFedExPDF collections={collections} devolutions={devolutions} subsidiaryName={subsidiaryName} />).toBlob()
      const excelBuffer = await generateFedExExcel(collections, devolutions, subsidiaryName, false)
      
      const currentDate = new Date().toLocaleDateString("es-ES").replace(/\//g, "-")
      const pdfFile = new File([blob], `${selectedDrivers[0]?.name.toUpperCase()}--${subsidiaryName}--Devoluciones--${currentDate.replace(/\//g, "-")}.pdf`, { type: 'application/pdf' })
      const excelFile = new File([excelBuffer], `${selectedDrivers[0]?.name.toUpperCase()}--${subsidiaryName}--Devoluciones--${currentDate.replace(/\//g, "-")}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      await uploadFiles(pdfFile, excelFile, subsidiaryName)
      window.open(URL.createObjectURL(blob), '_blank')
      
      toast.success("Operación finalizada con éxito")
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error("Error al procesar el guardado")
    } finally {
      setLoading(false)
    }
  }

  const columns = useMemo(() => getUnifiedColumns((id) => {
    if (activeTab === "devolutions") setDevolutions(p => p.filter(d => (d.id || d.trackingNumber) !== id))
    else setCollections(p => p.filter(c => c.trackingNumber !== id))
  }), [activeTab])

  return (
    <div className="flex flex-col h-[90vh] w-full rounded-xl overflow-hidden">
      
      {/* HEADER CAFÉ */}
      <header className={cn(brandCoffee, "text-white px-6 py-4 flex justify-between items-center shrink-0")}>
        <div className="flex items-center gap-4">
          <div className="bg-primary p-2 rounded-lg"><Truck size={20} /></div>
          <div>
            <h2 className="font-black text-sm uppercase tracking-tighter">Devoluciones / Recolecciones</h2>
            <p className="text-[10px] text-white/50 font-bold uppercase">{subsidiaryName} • {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-3 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
            <Label className="text-[9px] font-black uppercase text-slate-300">Modo Recolección</Label>
            <Switch checked={enableCollections} onCheckedChange={(v) => { setEnableCollections(v); if(v) setActiveTab("collections")}} className="data-[state=checked]:bg-secondary" />
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/40 hover:text-white hover:bg-white/10">
            <XCircle size={22} />
          </Button>
        </div>
      </header>

      {/* TOOLBAR */}
      <div className="px-6 py-4 bg-white border-b flex gap-4 items-center shrink-0">
        <div className="flex-1 max-w-xs"><RepartidorSelector selectedRepartidores={selectedDrivers} onSelectionChange={setSelectedDrivers} subsidiaryId={selectedSubsidiaryId} /></div>
        <div className="flex-1 max-w-xs"><UnidadSelector selectedUnidad={selectedVehicle} onSelectionChange={setSelectedVehicle} /></div>
        
        <div className="h-10 w-px bg-slate-100 mx-2" />

        <Sheet onOpenChange={() => setLastScannedCode("")}>
          <SheetTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase tracking-widest gap-2 h-10 px-6">
              <ScanBarcode size={18} /> Escanear Guía
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className={cn(brandCoffee, "w-[400px] sm:w-[540px] border-l-white/10 p-0 text-white")}>
            <div className="p-8 h-full flex flex-col">
              <SheetHeader className="mb-8">
                <SheetTitle className="text-2xl font-black text-white uppercase flex items-center gap-3">
                  <div className="p-3 bg-primary rounded-xl"><ScanBarcode /></div>
                  Captura de Guías
                </SheetTitle>
              </SheetHeader>
              
              <div className="space-y-6">
                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 backdrop-blur-md">
                  <Label className="text-xs font-black uppercase text-primary mb-4 block">Esperando lectura de código...</Label>
                  <div className="[&_input]:text-black [&_textarea]:text-black">
                    <BarcodeScannerInput 
                      onTrackingNumbersChange={async (val) => {
                        const rawValue = Array.isArray(val) ? val[val.length - 1] : val;
                        const foundCodes = rawValue.match(/\d{12}/g);
                        
                        if (foundCodes) {
                          for (const code of foundCodes) {
                            setLastScannedCode(code);
                            await processTrackingCode(code);
                          }
                        } else {
                          setLastScannedCode(rawValue.trim());
                        }
                      }} 
                    />
                  </div>
                  <p className="mt-4 text-[10px] text-white/40 italic">El sistema procesará automáticamente al detectar 12 dígitos.</p>
                </div>

                <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem]">
                  <p className="text-[10px] font-black text-white/40 uppercase mb-2">Última lectura:</p>
                  <p className="text-4xl font-mono font-black text-secondary tracking-tighter">
                    {lastScannedCode || "--- --- ---"}
                  </p>
                  {validating && <div className="mt-4 flex items-center gap-2 text-primary font-bold animate-pulse"><Loader2 className="animate-spin" /> VALIDANDO...</div>}
                </div>
              </div>

              <div className="mt-auto p-6 bg-primary/10 rounded-2xl border border-primary/20">
                <p className="text-xs font-bold text-primary uppercase">Sesión actual</p>
                <p className="text-4xl font-black">{activeTab === 'devolutions' ? devolutions.length : collections.length} Paquetes</p>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Button variant="outline" onClick={loadInitialData} disabled={loading} className="ml-auto text-[10px] font-black uppercase h-10">
          <RefreshCw className={cn("mr-2 h-3 w-3 text-primary", loading && "animate-spin")} /> Sincronizar
        </Button>
      </div>

      {/* ÁREA DE TABLA */}
      <main className="flex-1 min-h-0 bg-white flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b shrink-0 bg-slate-50/50">
            <TabsList className="h-14 bg-transparent gap-8 p-0">
              <TabsTrigger value="devolutions" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-xs font-black uppercase">
                Retornos <Badge className="ml-2 bg-primary text-white">{devolutions.length}</Badge>
              </TabsTrigger>
              {enableCollections && (
                <TabsTrigger value="collections" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-secondary data-[state=active]:text-secondary text-xs font-black uppercase">
                  Recolecciones <Badge className="ml-2 bg-secondary text-white">{collections.length}</Badge>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="devolutions" className="flex-1 min-h-0 p-4 overflow-auto">
            <DataTable columns={columns} data={devolutions} />
          </TabsContent>

          <TabsContent value="collections" className="flex-1 min-h-0 p-4 overflow-auto">
            <DataTable columns={columns} data={collections} />
          </TabsContent>
        </Tabs>
      </main>

      {/* FOOTER CAFÉ */}
      <footer className={cn(brandCoffee, "px-6 py-4 border-t border-white/10 flex justify-between items-center shrink-0")}>
        <div className="text-[10px] font-black text-white/30 uppercase tracking-widest italic"></div>
        <div className="flex gap-4">
          <Button variant="ghost" onClick={onClose} className="text-white/60">Cancelar</Button>
          <Button onClick={habndlePdfDownload} > PDF & Excel </Button>
          <Button 
            onClick={handleFinalSave}
            disabled={loading || (devolutions.length === 0 && collections.length === 0)}
            className="bg-primary hover:bg-primary/90 text-white text-[10px] font-black uppercase px-8 h-10"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Finalizar Operación
          </Button>
        </div>
      </footer>
    </div>
  )
}