"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { PDFDownloadLink } from "@react-pdf/renderer"
import { useBrowserVoice } from "@/hooks/use-browser-voice" 
import { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { PackageEntryPDF } from "@/components/package-entry-pdf"
import {
  Download,
  AlertTriangle,
  X,
  CheckCircle2,
  Keyboard,
  Package,
  Barcode,
  ShieldAlert,
  Clock,
  DollarSign,
  Box,
  Truck,
  PackagePlusIcon
} from "lucide-react"

// Selectores especializados
import { UnidadSelector } from "@/components/selectors/unidad-selector"
import { RepartidorSelector } from "@/components/selectors/repartidor-selector"

// Servicios y tipos
import { validateShipment } from "@/lib/services/warehouse/warehouse"
import { Driver, ScannedShipment, Vehicles } from "@/lib/types"
import { useAuthStore } from "@/store/auth.store"
import { DataTable } from "@/components/data-table/data-table"
import { tableFilters } from "./filters"

export type SessionState = {
  id: string
  vehicle: Vehicles | null
  startTime: Date
  endTime?: Date
  drivers: Driver[]
  receivedByName: string
  enteredByName: string
  packages: ScannedShipment[]
  status: "En Proceso" | "Completado"
}

// Helpers para fechas
const isToday = (date: Date) => new Date().toDateString() === new Date(date).toDateString()
const isTomorrow = (date: Date) => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toDateString() === new Date(date).toDateString()
}

export default function InboundPackage() {
  const user = useAuthStore((state) => state.user);
  const userSubsidiaryId = user?.subsidiary?.id ?? ""

  const inputRef = useRef<HTMLInputElement>(null)
  const { speak: speakMessage } = useBrowserVoice({ pitch: 0.8, rate: 1.3 })

  const safeSpeak = useCallback((text: string) => {
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      if (typeof speakMessage === 'function') {
        speakMessage(text)
      }
    } catch (err) {
      console.warn("Aviso: Fallo silencioso en la síntesis de voz.", err)
    }
  }, [speakMessage])
  
  const [isClient, setIsClient] = useState(false)
  const [session, setSession] = useState<SessionState>({
    id: crypto.randomUUID(),
    vehicle: null,
    startTime: new Date(),
    receivedByName: "",
    enteredByName: "",
    packages: [],
    status: "En Proceso",
    drivers: []
  })
  
  const [scanInput, setScanInput] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [modals, setModals] = useState({
    shortcuts: false,
    expiringToday: false,
    highValue: false,
    charges: false,
    signatures: false
  })

  useEffect(() => { setIsClient(true) }, [])

  const toggleModal = (key: keyof typeof modals, value: boolean) => {
    setModals(prev => ({ ...prev, [key]: value }))
    if (!value) setTimeout(() => inputRef.current?.focus(), 100)
  }

  // KPIs
  const expiringTodayPackages = useMemo(() => session.packages.filter(p => isToday(p.commitDateTime)), [session.packages])
  const highValuePackages = useMemo(() => session.packages.filter(p => p.isHighValue), [session.packages])
  const cargoPackages = useMemo(() => session.packages.filter(p => p.isCharge), [session.packages])
  const packagesWithCharges = useMemo(() => session.packages.filter(p => p.hasPayment), [session.packages])
  const totalChargesAmount = useMemo(() => packagesWithCharges.reduce((acc, p) => acc + (p.paymentAmount || 0), 0), [packagesWithCharges])
  
  const fedexCount = useMemo(() => session.packages.filter(p => p.shipmentType.toLowerCase() === "fedex").length, [session.packages])
  const dhlCount = useMemo(() => session.packages.filter(p => p.shipmentType.toLowerCase() === "dhl").length, [session.packages])

  // --- ORDENAMIENTO EN PANTALLA ---
  const sortedPackages = useMemo(() => {
    return [...session.packages].sort((a, b) => {
      const getSubName = (pkg: any) => {
        if (pkg?.subsidiary?.name) return String(pkg.subsidiary.name);
        if (typeof pkg?.subsidiaryId === 'string') return pkg.subsidiaryId;
        if (typeof pkg?.subsidiaryId === 'object' && pkg?.subsidiaryId !== null) return String(pkg.subsidiaryId.name || "S/N");
        return "S/N";
      };

      // 1. Por Código Postal
      const zipA = String(a.recipientZip || "");
      const zipB = String(b.recipientZip || "");
      const cmpZip = zipA.localeCompare(zipB, undefined, { numeric: true });
      if (cmpZip !== 0) return cmpZip;

      // 2. Por Sucursal
      const sucursalA = getSubName(a);
      const sucursalB = getSubName(b);
      const cmpSucursal = sucursalA.localeCompare(sucursalB);
      if (cmpSucursal !== 0) return cmpSucursal;

      // 3. Por Carrier
      const carrierA = String(a.shipmentType || "").toUpperCase();
      const carrierB = String(b.shipmentType || "").toUpperCase();
      return carrierA.localeCompare(carrierB);
    });
  }, [session.packages]);

  // --- VALIDACIONES DE FLUJO ---
  const isReadyToFinish = session.packages.length > 0 && session.vehicle?.id && session.drivers.length > 0;
  
  // Extraemos el nombre del chofer de forma segura para evitar el error [object Object]
  const derivedDriverName = session.drivers.map(d => {
    if (typeof d.id === 'object' && d.id !== null) {
      return (d.id as any).name || (d.id as any).nombre || "Operador Seleccionado";
    }
    return (d as any).name || (d as any).nombre || d.id || "Operador Seleccionado";
  }).join(", ")
  
  // Solo exigimos que hayan escrito el nombre de quien RECIBE
  const canSaveAndGeneratePDF = session.receivedByName.trim() !== "";

  const handleScan = useCallback(async () => {
    if (!scanInput.trim()) return
    setIsScanning(true)
    setError(null)
    const trackingNumber = scanInput.trim().toUpperCase()

    if (session.packages.some((p) => p.trackingNumber === trackingNumber)) {
      setError(`Guía duplicada: ${trackingNumber}`);
      safeSpeak("Guía duplicada.");
      setIsScanning(false);
      setScanInput("");
      return;
    }

    try {
      const result = await validateShipment(trackingNumber)
      if (result.isValid === false) {
        setError(result.reason || "No encontrado en sistema")
        safeSpeak("No encontrado.")
      } else {
        const newShipment: ScannedShipment = {
          ...result,
          commitDateTime: new Date(result.commitDateTime),
          isCharge: result.isCharge || false,
          hasPayment: result.hasPayment || false,
          paymentAmount: result.paymentAmount || 0
        }
        safeSpeak(isToday(newShipment.commitDateTime) ? "Vence hoy" : isTomorrow(newShipment.commitDateTime) ? "Vence mañana" : "Registrado")
        setSession(prev => ({ ...prev, packages: [newShipment, ...prev.packages] }))
        setScanInput("")
      }
    } catch (err) {
      setError("Error de servidor")
      safeSpeak("Error de sistema")
    } finally {
      setIsScanning(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [scanInput, session.packages, safeSpeak])

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); handleScan() } }

  const handleRemovePackage = useCallback((id: string) => {
    setSession(prev => ({ ...prev, packages: prev.packages.filter((p) => p.id !== id) }))
  }, [])

  const handleCompleteSession = async () => {
    setIsScanning(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    // Limpiamos la sesión por completo para el siguiente camión
    setSession({
      id: crypto.randomUUID(),
      vehicle: null,
      startTime: new Date(),
      receivedByName: "",
      enteredByName: "",
      packages: [],
      status: "En Proceso",
      drivers: []
    })
    toggleModal("signatures", false)
    setIsScanning(false)
  }

  // --- DEFINICIÓN DE COLUMNAS PARA EL DATA-TABLE ---
  const columns: ColumnDef<ScannedShipment>[] = useMemo(() => [
    {
      accessorKey: "trackingNumber",
      header: "Tracking",
      cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.getValue("trackingNumber")}</span>,
    },
    {
      id: "shipmentType",
      accessorKey: "shipmentType",
      header: "Carrier",
      cell: ({ row }) => {
        // CORRECCIÓN AQUÍ: Se leía "carrier" en lugar de "shipmentType" y se le agregó un fallback seguro.
        const type = (row.getValue("shipmentType") as string) || ""; 
        if (type.toLowerCase() === 'fedex') {
          return <Badge className="bg-[#4d148c] text-white hover:bg-[#4d148c]/90 text-[10px] border-none shadow-sm uppercase">FedEx</Badge>
        }
        if (type.toLowerCase() === 'dhl') {
          return <Badge className="bg-[#ffcc00] text-[#d40511] hover:bg-[#ffcc00]/90 text-[10px] border-none shadow-sm uppercase">DHL</Badge>
        }
        return <Badge variant="outline" className="text-[10px] uppercase">{type}</Badge>
      },
      filterFn: (row, id, value: string[]) => {
        const rowValue = (row.getValue(id) as string).toLowerCase()
        return value.includes(rowValue)
      },
    },
    {
      id: "subsidiary",
      accessorFn: (row) => row.subsidiary, 
      header: "Destino",
      cell: ({ row }) => {
        const pkg = row.original;
        return (
          <div className="text-xs text-muted-foreground">
             {pkg.subsidiary?.name || "S/N"} <br/>
             <span className="font-mono">CP: {pkg.recipientZip}</span>
          </div>
        )
      },
      filterFn: (row, id, value: string[]) => {
        const rowValue = row.getValue(id) as string
        return value.includes(rowValue)
      },
    },
    {
      id: "alertas",
      header: "Alertas y Etiquetas",
      cell: ({ row }) => {
        const pkg = row.original;
        return (
          <div className="flex gap-1.5 flex-wrap">
            {isToday(pkg.commitDateTime) && <Badge className="font-bold text-[10px] px-1.5 py-0 bg-red-600 text-white hover:bg-red-700 shadow-sm">Vence Hoy</Badge>}
            {isTomorrow(pkg.commitDateTime) && <Badge variant="secondary" className="font-bold text-[10px] px-1.5 py-0 bg-orange-100 text-orange-800 border-orange-200 border hover:bg-orange-200">Vence Mañana</Badge>}
            {pkg.isHighValue && <Badge variant="secondary" className="font-bold text-[10px] px-1.5 py-0 bg-purple-100 text-purple-800 border-purple-200 border hover:bg-purple-200">Alto Valor</Badge>}
            {pkg.isCharge && <Badge variant="secondary" className="font-bold text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800 border-blue-200 border hover:bg-blue-200">Carga</Badge>}
            {pkg.hasPayment && <Badge variant="secondary" className="font-bold text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-200 border hover:bg-amber-200">Cobro: ${pkg.paymentAmount}</Badge>}
          </div>
        )
      }
    },
    {
      id: "acciones",
      header: () => <div className="text-right">Acciones</div>,
      cell: ({ row }) => {
        return (
          <div className="text-right">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => handleRemovePackage(row.original.id)} className="h-7 w-7 hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Eliminar Registro</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )
      }
    }
  ], [handleRemovePackage])

  return (
    <div className="text-slate-900 min-h-screen pt-4"> 
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <PackagePlusIcon className="w-8 h-8 text-blue-600" />
              Gestión de Entradas a Bodega
            </h1>
            <p className="text-slate-500 mt-1">Registro y seguimiento de paquetes entrantes a la bodega.</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => toggleModal("shortcuts", true)}>
                  <Keyboard className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver Atajos de Teclado</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Total" value={session.packages.length} icon={Package} />
          <div className="rounded-lg border bg-card p-3 flex flex-col justify-center shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">Carrier</span>
              <Truck className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <div className="flex items-center gap-3">
               <div className="flex-1">
                 <p className="text-[10px] font-bold text-[#4d148c]">FEDEX</p>
                 <p className="text-xl font-bold">{fedexCount}</p>
               </div>
               <Separator orientation="vertical" className="h-8" />
               <div className="flex-1 text-right">
                 <p className="text-[10px] font-bold text-[#d40511]">DHL</p>
                 <p className="text-xl font-bold">{dhlCount}</p>
               </div>
            </div>
          </div>
          <StatCard title="Vencen Hoy" value={expiringTodayPackages.length} icon={Clock} alert={expiringTodayPackages.length > 0} onClick={() => expiringTodayPackages.length > 0 && toggleModal("expiringToday", true)} />
          <StatCard title="Alto Valor" value={highValuePackages.length} icon={ShieldAlert} alert={highValuePackages.length > 0} onClick={() => highValuePackages.length > 0 && toggleModal("highValue", true)} />
          <StatCard title="Carga" value={cargoPackages.length} icon={Box} />
          <StatCard title="Cobros" value={packagesWithCharges.length} subValue={`$${totalChargesAmount}`} icon={DollarSign} alert={packagesWithCharges.length > 0} onClick={() => packagesWithCharges.length > 0 && toggleModal("charges", true)} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pt-6">
          
          {/* TABLA DE INVENTARIO Y FILTROS */}
          <div className="xl:col-span-8 space-y-6">
            <Card className="border-none shadow-none bg-transparent">
              <div className="pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Inventario</h2>
                  <Badge variant="secondary">{session.packages.length}</Badge>
                </div>
              </div>
              
              <CardContent className="p-0">
                <div className="">
                  <DataTable 
                    columns={columns} 
                    data={sortedPackages} // <-- Aquí se pasan los paquetes ya ordenados
                    searchKey="trackingNumber"
                    filters={tableFilters}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ESCÁNER Y RUTA */}
          <div className="xl:col-span-4 space-y-4">
            <Card className="border-blue-200 shadow-sm">
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600">
                  <Barcode className="w-5 h-5" />
                  <span className="text-sm font-semibold">Escáner de Entrada</span>
                </div>
                <Input
                  ref={inputRef}
                  placeholder="Escanee guía (F1)..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isScanning}
                  className="font-mono text-lg h-12 uppercase"
                />
                <Button onClick={handleScan} disabled={isScanning || !scanInput.trim()} className="w-full h-11">
                  {isScanning ? "Procesando..." : "Registrar"}
                </Button>
                {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <Label className="font-semibold">Asignación de Salida</Label>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Unidad de Traslado</Label>
                    <UnidadSelector 
                      selectedUnidad={session.vehicle?.id || ""} 
                      onSelectionChange={(id) => setSession(s => ({...s, vehicle: { id } as Vehicles }))} 
                      subsidiaryId={userSubsidiaryId} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Chofer Asignado</Label>
                    <RepartidorSelector 
                      selectedRepartidores={session.drivers.map(d => d.id)} 
                      // NOTA: Si onSelectionChange solo devuelve el 'id', el modal mostrará el ID.
                      // Asegúrate de que el RepartidorSelector devuelva el objeto completo ({id, name}) si quieres que se vea el nombre real en el PDF.
                      onSelectionChange={(ids) => setSession(s => ({...s, drivers: ids.map(id => ({ id } as Driver))}))} 
                      subsidiaryId={userSubsidiaryId}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SECCIÓN DE FINALIZACIÓN VALIDADA */}
            <Card className="bg-slate-50/50">
              <CardContent className="space-y-3">
                {!isReadyToFinish && (
                  <p className="text-[11px] text-amber-600 font-medium bg-amber-50 p-2 rounded flex items-center gap-2 leading-tight border border-amber-100">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" /> 
                    Seleccione Unidad, Chofer y escanee al menos un paquete para finalizar.
                  </p>
                )}
                
                <Button 
                  onClick={() => toggleModal("signatures", true)} 
                  disabled={!isReadyToFinish} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar Ingreso
                </Button>
              </CardContent>
            </Card>
          </div>
      </div>

      {/* MODALES REUTILIZADOS */}
      <Dialog open={modals.shortcuts} onOpenChange={(v) => toggleModal("shortcuts", v)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Keyboard className="w-4 h-4"/> Atajos de Teclado</DialogTitle></DialogHeader>
          <div className="grid gap-2 py-3">
            {[
              { key: "F1", action: "Enfocar campo de Escáner" },
              { key: "F2", action: "Abrir ventana de Finalizar Ingreso" },
              { key: "F3", action: "Buscar en listado (Guía o CP)" },
              { key: "ESC", action: "Cerrar modales o ventanas" },
            ].map(({ key, action }) => (
              <div key={key} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 border-slate-100">
                <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-xs shadow-sm">{key}</kbd>
                <span className="text-slate-600 text-xs">{action}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <DetailModal 
        open={modals.expiringToday} 
        onOpenChange={(val: boolean) => toggleModal("expiringToday", val)}
        title="Paquetes que Vencen Hoy"
        description="Lista de paquetes con urgencia crítica para hoy."
        packages={expiringTodayPackages}
      />

      <DetailModal 
        open={modals.highValue} 
        onOpenChange={(val: boolean) => toggleModal("highValue", val)}
        title="Paquetes de Alto Valor"
        description="Requieren manejo de seguridad especial."
        packages={highValuePackages}
      />

      <DetailModal 
        open={modals.charges} 
        onOpenChange={(val: boolean) => toggleModal("charges", val)}
        title="Cobros Pendientes"
        description={`Monto Total a Cobrar: $${totalChargesAmount.toLocaleString()} MXN`}
        packages={packagesWithCharges}
      />

      {/* MODAL DE FIRMAS REFORZADO */}
      <Dialog open={modals.signatures} onOpenChange={(v) => toggleModal("signatures", v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Recepción y Firmas</DialogTitle>
            <DialogDescription>
              Confirme quién recibe la mercancía para habilitar la descarga del PDF y guardar el registro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre de quien Entrega (Operador Seleccionado)</Label>
              <Input 
                value={derivedDriverName} 
                readOnly
                className="bg-slate-100 text-slate-500 cursor-not-allowed font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre de quien Recibe (Personal en Bodega)</Label>
              <Input 
                value={session.receivedByName} 
                onChange={(e) => setSession({...session, receivedByName: e.target.value})} 
                placeholder="Ej. Juan Pérez"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => toggleModal("signatures", false)}>
              Cancelar
            </Button>
            
            {/* Le pasamos dinámicamente el nombre del operador derivado al PDF */}
            {isClient && canSaveAndGeneratePDF ? (
              <PDFDownloadLink 
                document={
                  <PackageEntryPDF 
                    session={{...session, enteredByName: derivedDriverName}} 
                    vehiculo={session.vehicle} 
                  />
                } 
                fileName="recepcion.pdf"
                className="w-full sm:w-auto"
              >
                {({ loading }) => (
                  <Button variant="secondary" className="w-full" disabled={loading}>
                    <Download className="mr-2 h-4 w-4" /> PDF
                  </Button>
                )}
              </PDFDownloadLink>
            ) : (
              <Button variant="secondary" className="w-full sm:w-auto" disabled>
                <Download className="mr-2 h-4 w-4" /> PDF
              </Button>
            )}

            <Button 
              onClick={handleCompleteSession} 
              disabled={!canSaveAndGeneratePDF}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
            >
              Confirmar y Limpiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ title, value, subValue, icon: Icon, alert = false, onClick }: any) {
  return (
    <div onClick={onClick} className={`rounded-lg border p-3 shadow-sm transition-colors ${alert ? "border-red-200 bg-red-50/50 cursor-pointer hover:bg-red-50" : "bg-card"}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] font-bold uppercase ${alert ? "text-red-600" : "text-muted-foreground"}`}>{title}</span>
        <Icon className={`h-3.5 w-3.5 ${alert ? "text-red-500" : "text-muted-foreground/40"}`} />
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-xl font-bold">{value}</p>
        {subValue && <p className="text-[10px] text-muted-foreground font-medium">{subValue}</p>}
      </div>
    </div>
  )
}

function DetailModal({ open, onOpenChange, title, description, packages }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[400px] overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guía</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Info</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg: any) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-mono">{pkg.trackingNumber}</TableCell>
                  <TableCell className="uppercase text-[10px]">{pkg.shipmentType}</TableCell>
                  <TableCell className="text-right text-[10px]">
                    {pkg.hasPayment ? `$${pkg.paymentAmount}` : 'OK'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}