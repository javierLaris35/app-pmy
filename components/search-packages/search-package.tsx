"use client"

import { useEffect, useState } from "react"
import { 
  Search, 
  Package, 
  Loader2, 
  Truck, 
  Phone, 
  CreditCard, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  FileSpreadsheet,
  Box
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { getFedexTrackingInfo, searchPackageInfo } from "@/lib/services/shipments"
import { useUiStore } from "@/store/ui.store"

const formatMexicoPhone = (phone: string | number) => {
  const s = String(phone).replace(/\D/g, "")
  if (s.length !== 10) return s
  return `(${s.slice(0, 3)}) ${s.slice(3, 6)}-${s.slice(6)}`
}

export function CommandPalette() {
  // Abierto/cerrado controlado desde el header (antes era un botón flotante).
  const open = useUiStore((s) => s.searchOpen)
  const setOpen = useUiStore((s) => s.setSearchOpen)
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Estados para Rastreo Directo FedEx
  const [bulkInput, setBulkInput] = useState("")
  const [fedexResults, setFedexResults] = useState<any[]>([])
  const [isTrackingFedex, setIsTrackingFedex] = useState(false)

  // Buscador Principal (Shipments Locales)
  useEffect(() => {
    if (search.trim().length < 5) { setResults([]); return }
    const handler = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchPackageInfo(search.trim())
        const finalData = data ? (Array.isArray(data) ? data : [data]) : []
        setResults(finalData)
      } catch { setResults([]) } finally { setLoading(false) }
    }, 500)
    return () => clearTimeout(handler)
  }, [search])

  // Lógica de Rastreo Directo FedEx (API)
  const handleFedExCheck = async () => {
    const trackingNumbers = bulkInput
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 5)
    
    if (trackingNumbers.length === 0) return

    setIsTrackingFedex(true)
    try {
      const response = await getFedexTrackingInfo(trackingNumbers);
      setFedexResults(response)
    } catch (error) {
      console.error("Error API FedEx", error)
    } finally {
      setIsTrackingFedex(false)
    }
  }

  // Función para exportar resultados a CSV
  const handleExportToExcel = () => {
    if (fedexResults.length === 0) return

    const headers = ["Número de Guía", "Estado", "Descripción", "Ubicación", "Fecha de Consulta"]
    
    const rows = fedexResults.map(res => [
      res.trackingNumber,
      res.status || 'SIN ESTADO',
      res.description || '',
      res.location || 'N/A',
      new Date().toLocaleString('es-MX')
    ])

    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(row => row.map(str => `"${str}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `Reporte_FedEx_${new Date().getTime()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      {/* MODAL PRINCIPAL */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden border border-slate-200 shadow-2xl bg-white sm:rounded-2xl">
          <DialogHeader className="sr-only"><DialogTitle>Buscador de Envíos</DialogTitle></DialogHeader>

          <Tabs defaultValue="local" className="w-full flex flex-col h-[85vh] sm:h-[700px]">
            
            {/* PESTAÑAS SIMPLIFICADAS */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 shrink-0 flex items-center justify-between">
              <TabsList className="bg-slate-200/60">
                <TabsTrigger value="local" className="text-sm font-medium">Búsqueda Interna</TabsTrigger>
                <TabsTrigger value="fedex" className="text-sm font-medium">Consulta FedEx</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden bg-slate-50/30">
              
              {/* --- PESTAÑA LOCAL --- */}
              <TabsContent value="local" className="h-full flex flex-col m-0 data-[state=inactive]:hidden">
                <div className="p-4 border-b border-slate-100 bg-white shrink-0 relative">
                  <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                  <Input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Ingresa número de guía o carga..."
                    className="pl-12 h-12 text-base bg-slate-50 border-transparent focus-visible:bg-white focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary transition-all"
                  />
                  {loading && <Loader2 className="absolute right-7 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />}
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                  {results.length > 0 ? (
                    <div className="space-y-4">
                      {results.map((item) => (
                        <div key={item.trackingNumber} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                          
                          {/* Banner de Prioridad */}
                          {item.priority === "ALTA" && (
                            <div className="bg-red-500 px-4 py-1.5 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-white" />
                              <span className="text-xs font-bold text-white uppercase tracking-wider">Prioridad Alta</span>
                            </div>
                          )}

                          <div className="p-5 md:p-6">
                            {/* Cabecera de la Tarjeta Local */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                              <div>
                                <p className="text-sm text-slate-500 mb-1">Guía de rastreo</p>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">{item.trackingNumber}</h3>
                                  
                                  {/* TIPO DE PAQUETE / CARRIER (Destacado) */}
                                  {(item.shipmentType || item.carrier) && (
                                    <Badge className="bg-slate-800 text-white hover:bg-slate-700 uppercase tracking-widest text-[10px] px-3 py-1 flex items-center gap-1.5">
                                      <Box className="w-3.5 h-3.5" />
                                      {item.shipmentType || item.carrier}
                                    </Badge>
                                  )}

                                  {item.isCharge && <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-bold uppercase tracking-wider text-[10px] px-3 py-1">CARGA</Badge>}
                                </div>
                              </div>
                              <Badge className={cn(
                                "px-4 py-1.5 text-sm font-bold w-fit uppercase tracking-wide",
                                item.status.toLowerCase() === "entregado" ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-blue-100 text-blue-800 hover:bg-blue-100"
                              )}>
                                {item.status}
                              </Badge>
                            </div>

                            {/* Contenido Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Columna Destino */}
                              <div className="md:col-span-2 space-y-4">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide">
                                  <MapPin className="h-4 w-4 text-primary" /> Destino y Contacto
                                </h4>
                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                  <p className="font-semibold text-slate-900">{item.recipient?.name}</p>
                                  <p className="text-sm text-slate-600 mt-1">{item.recipient?.address}</p>
                                  <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-200/60">
                                    <span className="text-sm text-slate-600">CP: <span className="font-semibold text-slate-900">{item.recipient?.zipCode}</span></span>
                                    <div className="w-1 h-1 rounded-full bg-slate-300 hidden sm:block" />
                                    <a href={`tel:${item.recipient?.phoneNumber}`} className="text-sm flex items-center gap-1.5 text-primary hover:underline font-medium">
                                      <Phone className="h-3.5 w-3.5" /> {formatMexicoPhone(item.recipient?.phoneNumber || "")}
                                    </a>
                                  </div>
                                </div>
                              </div>

                              {/* Columna Finanzas y Logística */}
                              <div className="space-y-6">
                                <div className="space-y-3">
                                  <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide">
                                    <CreditCard className="h-4 w-4 text-primary" /> Cobro
                                  </h4>
                                  {item.payment?.amount > 0 ? (
                                    <div className={cn("p-3 rounded-lg border", item.isPaid ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200")}>
                                      <p className="text-xs text-slate-500 uppercase font-medium mb-1">{item.payment.type}</p>
                                      <div className="flex items-center justify-between">
                                        <span className={cn("font-bold text-lg", item.isPaid ? "text-green-700" : "text-amber-700")}>${item.payment.amount}</span>
                                        <Badge variant="outline" className={cn("font-bold text-[10px] uppercase tracking-wider", item.isPaid ? "border-green-300 text-green-700" : "border-amber-300 text-amber-700")}>
                                          {item.isPaid ? 'Pagado' : 'Por cobrar'}
                                        </Badge>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-slate-500 py-2 italic">Sin cargos pendientes</p>
                                  )}
                                </div>

                                <div className="space-y-3">
                                  <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide">
                                    <Truck className="h-4 w-4 text-primary" /> Logística
                                  </h4>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{item.route ? item.route.driver.name : "Operador Pendiente"}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Ruta: {item.route?.trackingNumber || "N/A"} • {item.subsidiary}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                      <div className="bg-slate-100 p-4 rounded-full">
                        <Search className="h-10 w-10 text-slate-300" />
                      </div>
                      <p className="text-sm font-medium">Ingresa un número de rastreo para comenzar</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* --- PESTAÑA FEDEX --- */}
              <TabsContent value="fedex" className="h-full flex flex-col m-0 data-[state=inactive]:hidden">
                <div className="p-4 md:p-6 h-full flex flex-col">
                  
                  {/* ESTADO INICIAL: Ingreso de guías */}
                  {fedexResults.length === 0 ? (
                    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full pt-2">
                      <div className="mb-4">
                        <p className="text-sm text-slate-600">
                          Pega hasta 50 números de guía separados por renglón para verificar su estatus actual mediante la API.
                        </p>
                      </div>
                      
                      <div className="relative group flex-1 min-h-[250px] mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-xl pointer-events-none transition-opacity opacity-0 group-hover:opacity-100" />
                        <Textarea 
                          value={bulkInput}
                          onChange={(e) => setBulkInput(e.target.value)}
                          placeholder="Ejemplo:&#10;771234567890&#10;779876543210"
                          className="w-full h-full resize-none font-mono text-sm leading-relaxed bg-white border-slate-200 focus-visible:ring-primary p-5 rounded-xl shadow-sm"
                        />
                      </div>

                      <button 
                        onClick={handleFedExCheck}
                        disabled={isTrackingFedex || !bulkInput.trim()}
                        className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:hover:bg-primary"
                      >
                        {isTrackingFedex ? (
                          <><Loader2 className="h-5 w-5 animate-spin" /> Consultando...</>
                        ) : (
                          "Consultar Guías"
                        )}
                      </button>
                    </div>
                  ) : (
                    
                    /* ESTADO DE RESULTADOS FEDEX */
                    <div className="flex-1 flex flex-col h-full">
                      {/* Cabecera de resultados */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-slate-600">{fedexResults.length} guías procesadas</p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <button 
                            onClick={handleExportToExcel}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                          >
                            <FileSpreadsheet className="h-4 w-4" /> Exportar a Excel
                          </button>
                          
                          <button 
                            onClick={() => {setFedexResults([]); setBulkInput("")}}
                            className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                          >
                            Nueva Consulta
                          </button>
                        </div>
                      </div>

                      {/* Lista de Resultados */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                        {fedexResults.map((res, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-primary/30 transition-all gap-4">
                            
                            <div className="flex items-start gap-4 flex-1">
                              <div className={cn(
                                "p-2 rounded-full shrink-0",
                                res.isError ? "bg-red-50 text-red-500" : res.status?.toLowerCase().includes("entregado") ? "bg-emerald-50 text-emerald-500" : "bg-blue-50 text-blue-500"
                              )}>
                                {res.isError ? <AlertCircle className="h-5 w-5" /> : res.status?.toLowerCase().includes("entregado") ? <CheckCircle2 className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <p className="font-mono text-base font-bold text-slate-900">{res.trackingNumber}</p>
                                  <Badge className={cn(
                                    "px-2 py-0.5 text-[10px] uppercase font-bold",
                                    res.isError ? "bg-red-100 text-red-700" : res.status?.toLowerCase().includes("entregado") ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                                  )}>
                                    {res.status || 'ERROR'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600">{res.description}</p>
                              </div>
                            </div>

                            <div className="flex flex-col sm:items-end gap-2 pl-14 sm:pl-0">
                              {!res.isError && res.location && (
                                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                  <MapPin className="h-3 w-3 text-slate-400" /> {res.location}
                                </span>
                              )}
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
            
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}