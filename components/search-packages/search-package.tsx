"use client"

import { useState } from "react"
import {
  Package,
  Loader2,
  Truck,
  MapPin,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Box,
  ShieldAlert,
  PackageCheck,
  HelpCircle,
  Clock,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getFedexTrackingInfo, checkLdStatus, type LdCheckResult } from "@/lib/services/shipments"
import { useUiStore } from "@/store/ui.store"
import { PackageDossierView } from "./package-dossier-view"

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
  // Estados para Rastreo Directo FedEx
  const [bulkInput, setBulkInput] = useState("")
  const [fedexResults, setFedexResults] = useState<any[]>([])
  const [isTrackingFedex, setIsTrackingFedex] = useState(false)

  // Estados para Validar LD
  const [ldInput, setLdInput] = useState("")
  const [ldResults, setLdResults] = useState<LdCheckResult[]>([])
  const [isCheckingLd, setIsCheckingLd] = useState(false)

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
        <DialogContent className="max-w-6xl w-[95vw] p-0 overflow-hidden border border-slate-200 shadow-2xl bg-white sm:rounded-2xl">
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
                <PackageDossierView />
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