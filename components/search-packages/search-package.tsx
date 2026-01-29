"use client"

import { useEffect, useState } from "react"
import { Search, Package, ArrowRight, Loader2, Truck, Phone, CreditCard, MapPin, ExternalLink, ListChecks, XCircle } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { getFedexTrackingInfo, searchPackageInfo } from "@/lib/services/shipments"

const formatMexicoPhone = (phone: string | number) => {
  const s = String(phone).replace(/\D/g, "")
  if (s.length !== 10) return s
  return `(${s.slice(0, 3)}) ${s.slice(3, 6)}-${s.slice(6)}`
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  
  // Estados para Rastreo Directo FedEx
  const [bulkInput, setBulkInput] = useState("")
  const [showBulk, setShowBulk] = useState(false)
  const [fedexResults, setFedexResults] = useState<any[]>([])
  const [isTrackingFedex, setIsTrackingFedex] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("yaqui_search_history")
    if (saved) setHistory(JSON.parse(saved))
  }, [])

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
      // Reemplaza con tu endpoint real de backend
      const response = await getFedexTrackingInfo(trackingNumbers);
      setFedexResults(response)
    } catch (error) {
      console.error("Error API FedEx", error)
    } finally {
      setIsTrackingFedex(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
      >
        <Search className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[95vw] md:w-full p-0 overflow-hidden border-none shadow-2xl bg-[#F8F9FA] rounded-2xl">
          <DialogHeader className="sr-only"><DialogTitle>Terminal Del Yaqui</DialogTitle></DialogHeader>

          {/* INPUT PRINCIPAL */}
          <div className="flex items-center border-b-2 border-slate-100 px-6 py-2 bg-white">
            <Search className="h-6 w-6 text-primary mr-3" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="RASTREAR GUÍA O CARGA..."
              className="border-0 focus-visible:ring-0 h-16 text-xl font-black bg-transparent placeholder:text-slate-300 tracking-tight"
            />
            <button 
              onClick={() => {
                setShowBulk(!showBulk);
                setFedexResults([]);
              }}
              className={cn(
                "ml-2 p-2 rounded-xl transition-colors",
                showBulk ? "bg-primary text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
              )}
            >
              <ListChecks className="h-5 w-5" />
            </button>
            {loading && <Loader2 className="h-6 w-6 animate-spin text-primary ml-2" />}
          </div>

          <div className="max-h-[70vh] md:max-h-[600px] overflow-y-auto p-4 space-y-5">
            
            {/* SECCIÓN DE RASTREO DIRECTO (FEDEX API) */}
            {showBulk && (
              <div className="bg-slate-900 rounded-2xl p-5 shadow-xl border-2 border-white animate-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-white/10 p-2 rounded-lg">
                      <ExternalLink className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Consulta Directa</p>
                      <p className="text-sm font-black text-white uppercase italic">Status FedEx Real-Time</p>
                    </div>
                  </div>
                  <Badge className="bg-[#4D148C] text-white border-none text-[9px] font-black italic px-2">API LIVE</Badge>
                </div>

                {fedexResults.length === 0 ? (
                  <>
                    <Textarea 
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      placeholder="Pega las guías aquí (una por línea)..."
                      className="bg-white/5 border-white/10 text-white font-mono text-xs h-32 focus-visible:ring-primary focus-visible:ring-offset-0 placeholder:text-white/20 mb-4"
                    />
                    <button 
                      onClick={handleFedExCheck}
                      disabled={isTrackingFedex || !bulkInput.trim()}
                      className="w-full bg-white text-slate-900 h-12 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all disabled:opacity-30"
                    >
                      {isTrackingFedex ? <Loader2 className="h-4 w-4 animate-spin" /> : "Consultar en FedEx"}
                    </button>
                  </>
                ) : (
                  <div className="space-y-2">
                    {fedexResults.map((res, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-white/30 tracking-widest">{res.trackingNumber}</span>
                          <span className={cn("text-xs font-black uppercase", res.isError ? "text-red-400" : "text-white")}>
                            {res.status || 'ERROR'}
                          </span>
                          <span className="text-[10px] text-white/50 italic leading-none mt-1">{res.description}</span>
                        </div>
                        {!res.isError && <Badge className="bg-white/10 text-white text-[9px] border-none">{res.location}</Badge>}
                      </div>
                    ))}
                    <button 
                      onClick={() => {setFedexResults([]); setBulkInput("")}}
                      className="w-full py-3 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] hover:text-white transition-colors"
                    >
                      Nueva Consulta
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* RESULTADOS LOCALES */}
            {results.length > 0 ? (
              results.map((item) => (
                <div key={item.trackingNumber} className="relative flex flex-col rounded-2xl border-2 border-white shadow-sm bg-white overflow-hidden">
                  <div className={cn("h-1.5 w-full", item.priority === "ALTA" ? "bg-red-600" : "bg-blue-600")} />
                  <div className="p-5">
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] leading-none">Número de Rastreo</p>
                        <div className="flex items-center gap-3">
                          <h2 className="text-3xl font-black tracking-tighter text-slate-900">{item.trackingNumber}</h2>
                          {item.isCharge && <Badge className="bg-amber-500 text-white border-none font-black text-[10px] px-2">CARGA</Badge>}
                        </div>
                      </div>
                      <Badge className="bg-slate-900 text-white font-black text-[10px] px-3 py-1">{item.status.toUpperCase()}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                          <MapPin className="h-3 w-3 text-primary" /> Destinatario
                        </div>
                        <p className="text-base font-black text-slate-800 uppercase leading-tight">{item.recipient?.name}</p>
                        <p className="text-xs text-slate-500 font-bold leading-relaxed">{item.recipient?.address}</p>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <span className="text-[11px] font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border-2 border-white">
                            CP: {item.recipient?.zipCode}
                          </span>
                          <a href={`tel:${item.recipient?.phoneNumber}`} className="flex items-center gap-1 text-[11px] font-black text-white bg-primary px-3 py-1.5 rounded-lg">
                            <Phone className="h-3.5 w-3.5" /> {formatMexicoPhone(item.recipient?.phoneNumber || "")}
                          </a>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                          <CreditCard className="h-3 w-3 text-primary" /> Pago
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 border-2 border-white shadow-inner">
                          {item.payment?.amount > 0 ? (
                            <div className={cn("flex justify-between items-center p-3 rounded-xl border-2", item.isPaid ? "bg-emerald-100/50 border-emerald-200 text-emerald-800" : "bg-red-100/50 border-red-200 text-red-700")}>
                              <p className="text-xl font-black tabular-nums tracking-tighter">{item.payment.type} ${item.payment.amount}</p>
                              <span className="text-[10px] font-black bg-white/50 px-2 py-0.5 rounded border border-current">{item.isPaid ? 'PAGADO' : 'COBRAR'}</span>
                            </div>
                          ) : <p className="text-xs font-black text-slate-400 uppercase italic py-2 text-center">Sin cobro</p>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-4 border-t-2 border-slate-50 flex justify-between items-center">
                      <div className="flex items-center gap-4 group/route">
                        <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-lg group-hover/route:bg-primary transition-colors">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Operador / Ruta</p>
                          <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                            {item.route ? item.route.driver.name : "PENDIENTE"}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-300 uppercase italic">{item.subsidiary}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              !showBulk && (
                <div className="py-24 flex flex-col items-center justify-center opacity-20">
                  <Package className="h-20 w-20 mb-4 text-slate-900" />
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 text-center">Esperando identificación</p>
                </div>
              )
            )}
          </div>

          <div className="bg-slate-900 p-4 flex justify-between items-center">
             <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">PMY App - v2.0</span>
             <span className="text-[9px] font-bold text-white/50 italic flex items-center gap-1">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> SISTEMA ACTIVO
             </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}