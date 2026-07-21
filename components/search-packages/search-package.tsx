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
  Box,
  ShieldAlert,
  PackageCheck,
  HelpCircle,
  History,
  CalendarClock,
  User,
  Clock,
  ChevronDown
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { getFedexTrackingInfo, searchPackageInfo, checkLdStatus, type LdCheckResult } from "@/lib/services/shipments"
import { useUiStore } from "@/store/ui.store"

const formatMexicoPhone = (phone: string | number) => {
  const s = String(phone).replace(/\D/g, "")
  if (s.length !== 10) return s
  return `(${s.slice(0, 3)}) ${s.slice(3, 6)}-${s.slice(6)}`
}

// Fecha corta y consistente para todo el modal (tarjetas locales, FedEx y LD)
const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return null
  const parsed = new Date(dateStr)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

// Un solo mapeo de color/ícono por estatus, reutilizado por las 3 pestañas y por
// el timeline, para que "entregado", "en ruta", etc. se vean igual en todo el modal.
const getStatusStyle = (status?: string) => {
  const key = (status || "").toLowerCase()
  if (key.includes("no entregado") || key.includes("no_entregado") || key.includes("error") || key.includes("rechazado")) {
    return { badge: "bg-red-100 text-red-800 hover:bg-red-100", dot: "bg-red-50 text-red-500", ring: "bg-red-500", icon: AlertCircle }
  }
  if (key.includes("entregado")) {
    return { badge: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100", dot: "bg-emerald-50 text-emerald-500", ring: "bg-emerald-500", icon: CheckCircle2 }
  }
  if (key.includes("ruta")) {
    return { badge: "bg-blue-100 text-blue-800 hover:bg-blue-100", dot: "bg-blue-50 text-blue-500", ring: "bg-blue-500", icon: Truck }
  }
  if (key.includes("bodega")) {
    return { badge: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100", dot: "bg-indigo-50 text-indigo-500", ring: "bg-indigo-500", icon: Box }
  }
  if (key.includes("recol")) {
    return { badge: "bg-purple-100 text-purple-800 hover:bg-purple-100", dot: "bg-purple-50 text-purple-500", ring: "bg-purple-500", icon: Package }
  }
  if (key.includes("pendiente")) {
    return { badge: "bg-amber-100 text-amber-800 hover:bg-amber-100", dot: "bg-amber-50 text-amber-500", ring: "bg-amber-500", icon: Clock }
  }
  return { badge: "bg-slate-100 text-slate-700 hover:bg-slate-100", dot: "bg-slate-50 text-slate-500", ring: "bg-slate-400", icon: Package }
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

  // Estados para Validar LD
  const [ldInput, setLdInput] = useState("")
  const [ldResults, setLdResults] = useState<LdCheckResult[]>([])
  const [isCheckingLd, setIsCheckingLd] = useState(false)

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

  // Lógica de Validar LD (lote, contra la BD local)
  const handleLdCheck = async () => {
    const trackingNumbers = ldInput
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 5)

    if (trackingNumbers.length === 0) return

    setIsCheckingLd(true)
    try {
      const response = await checkLdStatus(trackingNumbers)
      setLdResults(response)
    } catch (error) {
      console.error("Error validando LD", error)
    } finally {
      setIsCheckingLd(false)
    }
  }

  const LD_STATE_LABEL: Record<string, string> = {
    active: "Activo",
    ld: "Ya causa LD",
    delivered: "Entregado",
    closed: "Cerrado",
  }

  const handleExportLdToExcel = () => {
    if (ldResults.length === 0) return

    const headers = ["Número de Guía", "Tipo", "Estatus local", "Vencimiento", "Resultado"]

    const rows = ldResults.map(res => [
      res.trackingNumber,
      res.shipmentType || "N/A",
      res.status || "SIN ESTADO",
      res.commitDateTime ? new Date(res.commitDateTime).toLocaleString('es-MX') : "N/A",
      res.found ? (LD_STATE_LABEL[res.ldState || ""] || "Sin estado") : "No encontrado",
    ])

    const csvContent = "﻿" + [
      headers.join(","),
      ...rows.map(row => row.map(str => `"${str}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `Validacion_LD_${new Date().getTime()}.csv`)
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
                <TabsTrigger value="ld" className="text-sm font-medium">Validar LD</TabsTrigger>
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
                    className="pl-12 h-12 text-base bg-slate-50 border-transparent focus-visible:bg-white transition-all"
                  />
                  {loading && <Loader2 className="absolute right-7 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />}
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
                  {results.length > 0 ? (
                    <div className="space-y-4">
                      {results.map((item) => (
                        <div key={item.trackingNumber} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                          
                          {/* Banner de Prioridad */}
                          {item.priority === "ALTA" && (
                            <div className="bg-red-500 px-4 py-1.5 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-white" />
                              <span className="text-xs font-bold text-white uppercase tracking-wider">Prioridad Alta</span>
                            </div>
                          )}

                          <div className="p-4 md:p-5">
                            {/* Cabecera de la Tarjeta Local */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                              <div>
                                <p className="text-sm text-slate-700 mb-1">Guía de rastreo</p>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">{item.trackingNumber}</h3>
                                  
                                  {/* TIPO DE PAQUETE / CARRIER (Destacado) */}
                                  {(item.shipmentType || item.carrier) && (
                                    <Badge className="bg-slate-800 text-white hover:bg-slate-700 uppercase tracking-widest text-[10px] px-3 py-1 flex items-center gap-1.5">
                                      <Box className="w-3.5 h-3.5" />
                                      {item.shipmentType || item.carrier}
                                    </Badge>
                                  )}

                                  {item.isCharge && <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 font-bold uppercase tracking-wider text-[10px] px-3 py-1">CARGA</Badge>}
                                </div>
                              </div>
                              <Badge className={cn("px-4 py-1.5 text-sm font-bold w-fit uppercase tracking-wide", getStatusStyle(item.status).badge)}>
                                {(item.status).replace(/_/g, " ").toUpperCase()}
                              </Badge>
                            </div>

                            {/* CONTENIDO PRINCIPAL: Grid de 2 columnas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                              
                              {/* Columna Izquierda: Destino */}
                              <div className="space-y-3">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide">
                                  <MapPin className="h-4 w-4 text-primary" /> Destino y Contacto
                                </h4>
                                
                                {/* Tarjeta de Destino Mejorada */}
                                <div className="bg-slate-50/70 rounded-xl p-5 border border-slate-200 h-[calc(100%-2rem)] flex flex-col justify-between">
                                  <div className="space-y-4">
                                    {/* Recibe */}
                                    <div className="flex items-start gap-3">
                                      <div className="mt-0.5 p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                                        <User className="h-4 w-4 text-slate-500" />
                                      </div>
                                      <div>
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Recibe</p>
                                        <p className="text-base font-bold text-slate-900">{item.recipient?.name}</p>
                                      </div>
                                    </div>
                                    
                                    {/* Dirección */}
                                    <div className="flex items-start gap-3">
                                      <div className="mt-0.5 p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                                        <MapPin className="h-4 w-4 text-slate-500" />
                                      </div>
                                      <div>
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Dirección de entrega</p>
                                        <p className="text-sm font-medium text-slate-700 leading-relaxed">{item.recipient?.address}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Footer de Destino (CP y Teléfono) */}
                                  <div className="mt-5 pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/60">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-500 font-medium">CP:</span>
                                      <span className="bg-slate-200/60 text-slate-700 font-bold px-2 py-1 rounded-md text-sm tracking-wide">
                                        {item.recipient?.zipCode}
                                      </span>
                                    </div>
                                    
                                    <a 
                                      href={`tel:${item.recipient?.phoneNumber}`} 
                                      className="flex items-center gap-2 bg-white border border-slate-200 hover:border-primary/50 hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors group shadow-sm"
                                    >
                                      <Phone className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary transition-colors" /> 
                                      <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">
                                        {formatMexicoPhone(item.recipient?.phoneNumber || "")}
                                      </span>
                                    </a>
                                  </div>
                                </div>
                              </div>

                              {/* Columna Derecha: Finanzas y Logística */}
                              <div className="space-y-6">
                                
                                {/* Cobro Mejorado */}
                                <div className="space-y-3">
                                  <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide">
                                    <CreditCard className="h-4 w-4 text-primary" /> Cobro
                                  </h4>
                                  {item.payment?.amount > 0 ? (
                                    <div className={cn("p-4 rounded-xl border flex flex-col justify-center", item.isPaid ? "bg-green-50/50 border-green-200" : "bg-amber-50/50 border-amber-200")}>
                                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wide mb-2">{item.payment.type}</p>
                                      <div className="flex items-center justify-between">
                                        <span className={cn("font-black text-2xl tracking-tight", item.isPaid ? "text-green-700" : "text-amber-700")}>
                                          ${item.payment.amount}
                                        </span>
                                        <Badge variant="outline" className={cn("font-bold text-[11px] uppercase tracking-wider px-3 py-1", item.isPaid ? "border-green-300 text-green-700 bg-green-100/50" : "border-amber-300 text-amber-700 bg-amber-100/50")}>
                                          {item.isPaid ? 'Pagado' : 'Por cobrar'}
                                        </Badge>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                      <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                                        <CreditCard className="h-4 w-4 text-slate-400" /> Sin cargos pendientes
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Logística (Con los estilos Premium que ya teníamos) */}
                                <div className="space-y-3">
                                  <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide">
                                    <Truck className="h-4 w-4 text-primary" /> Logística
                                  </h4>
                                  
                                  {item.route ? (
                                    <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-100">
                                      {/* Cabecera de la ruta */}
                                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-blue-200/60">
                                        <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wide">
                                          <div className="p-1.5 bg-blue-100 rounded-md">
                                            <Truck className="h-3.5 w-3.5" />
                                          </div>
                                          Ruta activa
                                        </div>
                                        {item.route.date && (
                                          <span className="text-xs font-medium text-blue-600 flex items-center gap-1.5 bg-blue-100/50 px-2 py-1 rounded-md">
                                            <CalendarClock className="h-3.5 w-3.5" /> {formatDate(item.route.date)}
                                          </span>
                                        )}
                                      </div>

                                      {/* Detalles del Operador y Unidad */}
                                      <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                          <div className="mt-0.5 bg-white p-1.5 rounded-full shadow-sm border border-blue-50">
                                            <User className="h-4 w-4 text-blue-500" />
                                          </div>
                                          <div>
                                            <p className="text-base font-bold text-slate-900 leading-none">
                                              {item.route.driver?.name || "Operador Pendiente"}
                                            </p>
                                            <p className="text-sm text-slate-500 mt-1">Operador asignado</p>
                                          </div>
                                        </div>

                                        {item.route.vehicle && (
                                          <div className="flex items-start gap-3">
                                            <div className="mt-0.5 bg-white p-1.5 rounded-full shadow-sm border border-blue-50">
                                              <Truck className="h-4 w-4 text-blue-500" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700 mt-1">
                                              Unidad {item.route.vehicle}
                                            </p>
                                          </div>
                                        )}
                                      </div>

                                      {/* Pie de la tarjeta (Folio y Sucursal) */}
                                      <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-2 text-sm border-t border-blue-200/60">
                                        <span className="text-slate-600">
                                          Folio: <span className="font-mono font-semibold text-slate-900">{item.route.trackingNumber || "N/A"}</span>
                                        </span>
                                        <span className="text-slate-600 font-medium bg-white px-2.5 py-0.5 rounded-full border border-slate-200 text-xs shadow-sm">
                                          {item.subsidiary}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center gap-3">
                                      <div className="p-2 bg-slate-200/50 rounded-full">
                                        <Truck className="h-4 w-4 text-slate-400" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-slate-600">Sin ruta activa</p>
                                        <p className="text-xs text-slate-500">{item.subsidiary}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* FILA INFERIOR: Historial (Ancho completo) */}
                            {item.statusTimeline?.length > 0 && (
                              <div className="pt-4 border-t border-slate-100">
                                <Collapsible>
                                  <CollapsibleTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-10 -ml-2 px-3 gap-2 text-sm font-bold text-primary hover:bg-primary/10 hover:text-primary [&[data-state=open]>svg]:rotate-180 transition-all"
                                    >
                                      <History className="h-4 w-4" />
                                      Ver historial de movimientos ({item.statusTimeline.length})
                                      <ChevronDown className="h-4 w-4 transition-transform ml-1" />
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="mt-4 max-h-80 overflow-y-auto pr-3 bg-slate-50/80 p-5 rounded-xl border border-slate-200">
                                      {[...item.statusTimeline].reverse().map((entry: any, i: number, arr: any[]) => {
                                        const style = getStatusStyle(entry.status)
                                        const isLast = i === arr.length - 1
                                        return (
                                          <div key={i} className="relative pl-8 pb-6 last:pb-0">
                                            {/* Línea conectora */}
                                            {!isLast && <span className="absolute left-[11px] top-5 bottom-0 w-0.5 bg-slate-200" />}
                                            
                                            {/* Punto de la línea de tiempo */}
                                            <span className={cn("absolute left-0 top-1.5 h-6 w-6 rounded-full border-4 border-slate-50 flex items-center justify-center bg-white shadow-sm", style.ring)}>
                                              <span className={cn("h-2 w-2 rounded-full", style.bg)} />
                                            </span>

                                            <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
                                              <span className="text-sm font-bold text-slate-800">{entry.statusLabel}</span>
                                              {/* Fecha en formato etiqueta */}
                                              <span className="text-xs font-medium text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                                                {formatDate(entry.date) || "Sin fecha"}
                                              </span>
                                            </div>

                                            {/* Tarjeta de Ruta (Dispatch) - Estilo Limpio pero con Folio resaltado */}
                                            {entry.dispatch && (
                                              <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 shadow-sm rounded-lg p-3.5 sm:p-4 w-full sm:w-[90%]">
                                                
                                                {/* Izquierda: Operador y Unidad */}
                                                <div className="space-y-2">
                                                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                                    <User className="h-4 w-4 text-slate-400 shrink-0" /> 
                                                    {entry.dispatch.driverName}
                                                  </p>
                                                  {entry.dispatch.vehicle && (
                                                    <p className="text-sm text-slate-600 flex items-center gap-2">
                                                      <Truck className="h-4 w-4 text-slate-400 shrink-0" /> 
                                                      Unidad <b>{entry.dispatch.vehicle}</b>
                                                    </p>
                                                  )}
                                                </div>

                                                {/* Derecha: Folio Resaltado */}
                                                <div className="pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 sm:border-l sm:pl-5 flex flex-col gap-1.5">
                                                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                                    No. Seguimiento
                                                  </span>
                                                  <span className="inline-flex items-center justify-center bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold px-3 py-1.5 rounded-md text-sm shadow-sm w-fit">
                                                    {entry.dispatch.folio || entry.dispatch.id}
                                                  </span>
                                                </div>

                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                      <div className="bg-white p-4 rounded-full shadow-sm border border-slate-100">
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

                      <Button
                        onClick={handleFedExCheck}
                        disabled={isTrackingFedex || !bulkInput.trim()}
                        className="w-full h-12 rounded-xl font-bold"
                      >
                        {isTrackingFedex ? (
                          <><Loader2 className="h-5 w-5 animate-spin" /> Consultando...</>
                        ) : (
                          "Consultar Guías"
                        )}
                      </Button>
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
                          <Button
                            variant="secondary"
                            onClick={handleExportToExcel}
                            className="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold"
                          >
                            <FileSpreadsheet className="h-4 w-4" /> Exportar a Excel
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => {setFedexResults([]); setBulkInput("")}}
                            className="flex-1 sm:flex-none font-bold"
                          >
                            Nueva Consulta
                          </Button>
                        </div>
                      </div>

                      {/* Lista de Resultados */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                        {fedexResults.map((res, idx) => {
                          const statusStyle = getStatusStyle(res.isError ? "error" : res.status)
                          const StatusIcon = res.isError ? AlertCircle : statusStyle.icon
                          return (
                            <Card key={idx} className="rounded-xl border-slate-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all p-0">
                              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">

                                <div className="flex items-start gap-4 flex-1">
                                  <div className={cn("p-2 rounded-full shrink-0", statusStyle.dot)}>
                                    <StatusIcon className="h-5 w-5" />
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                      <p className="font-mono text-base font-bold text-slate-900">{res.trackingNumber}</p>
                                      <Badge className={cn("px-2 py-0.5 text-[10px] uppercase font-bold", statusStyle.badge)}>
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

                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* --- PESTAÑA VALIDAR LD --- */}
              <TabsContent value="ld" className="h-full flex flex-col m-0 data-[state=inactive]:hidden">
                <div className="p-4 md:p-6 h-full flex flex-col">

                  {/* ESTADO INICIAL: Ingreso de guías */}
                  {ldResults.length === 0 ? (
                    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full pt-2">
                      <div className="mb-4">
                        <p className="text-sm text-slate-600">
                          Pega hasta 300 números de guía separados por renglón para saber cuáles siguen activas y cuáles ya causan Local Delay (LD).
                        </p>
                      </div>

                      <div className="relative group flex-1 min-h-[250px] mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-xl pointer-events-none transition-opacity opacity-0 group-hover:opacity-100" />
                        <Textarea
                          value={ldInput}
                          onChange={(e) => setLdInput(e.target.value)}
                          placeholder="Ejemplo:&#10;771234567890&#10;779876543210"
                          className="w-full h-full resize-none font-mono text-sm leading-relaxed bg-white border-slate-200 focus-visible:ring-primary p-5 rounded-xl shadow-sm"
                        />
                      </div>

                      <Button
                        onClick={handleLdCheck}
                        disabled={isCheckingLd || !ldInput.trim()}
                        className="w-full h-12 rounded-xl font-bold"
                      >
                        {isCheckingLd ? (
                          <><Loader2 className="h-5 w-5 animate-spin" /> Validando...</>
                        ) : (
                          "Validar Guías"
                        )}
                      </Button>
                    </div>
                  ) : (

                    /* ESTADO DE RESULTADOS LD */
                    <div className="flex-1 flex flex-col h-full min-h-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-slate-600">{ldResults.length} guías validadas</p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <Button
                            variant="secondary"
                            onClick={handleExportLdToExcel}
                            className="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold"
                          >
                            <FileSpreadsheet className="h-4 w-4" /> Exportar a Excel
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => { setLdResults([]); setLdInput("") }}
                            className="flex-1 sm:flex-none font-bold"
                          >
                            Nueva Consulta
                          </Button>
                        </div>
                      </div>

                      <Card className="flex-1 overflow-auto rounded-xl border-slate-200 p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Guía</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Estatus local</TableHead>
                              <TableHead>Vencimiento</TableHead>
                              <TableHead>Resultado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ldResults.map((res) => (
                              <TableRow key={res.trackingNumber}>
                                <TableCell className="font-mono font-semibold">{res.trackingNumber}</TableCell>
                                <TableCell className="text-sm text-slate-600">{res.shipmentType || "—"}</TableCell>
                                <TableCell className="text-sm text-slate-600">{res.status || "—"}</TableCell>
                                <TableCell className="text-sm text-slate-600">
                                  {res.commitDateTime ? new Date(res.commitDateTime).toLocaleDateString('es-MX') : "—"}
                                </TableCell>
                                <TableCell>
                                  {!res.found ? (
                                    <Badge variant="outline" className="gap-1 text-slate-500"><HelpCircle className="h-3 w-3" /> No encontrado</Badge>
                                  ) : res.ldState === "ld" ? (
                                    <Badge className="gap-1 bg-red-100 text-red-800 hover:bg-red-100"><ShieldAlert className="h-3 w-3" /> Ya causa LD</Badge>
                                  ) : res.ldState === "delivered" ? (
                                    <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><PackageCheck className="h-3 w-3" /> Entregado</Badge>
                                  ) : res.ldState === "closed" ? (
                                    <Badge variant="secondary" className="gap-1">Cerrado</Badge>
                                  ) : (
                                    <Badge className="gap-1 bg-blue-100 text-blue-800 hover:bg-blue-100"><Truck className="h-3 w-3" /> Activo</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Card>
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