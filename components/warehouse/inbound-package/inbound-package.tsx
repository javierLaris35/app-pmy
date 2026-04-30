"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { PDFDownloadLink } from "@react-pdf/renderer"
import { useBrowserVoice } from "@/hooks/use-browser-voice" 

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  Search,
  Building2,
  ShieldAlert,
  Clock,
  DollarSign,
  Box,
  Truck
} from "lucide-react"
import { UnidadSelector } from "@/components/selectors/unidad-selector"
import { RepartidorSelector } from "@/components/selectors/repartidor-selector"

// --- Tipos adaptados a tu Entidad Shipment ---
export type ShipmentType = "FEDEX" | "DHL" | "UPS"
export type Priority = "ALTA" | "MEDIA" | "BAJA"

export type ScannedShipment = {
  id: string
  trackingNumber: string
  shipmentType: ShipmentType
  recipientZip: string
  subsidiaryId: string
  commitDateTime: Date
  isHighValue: boolean
  isCargo: boolean
  hasCharge: boolean
  chargeAmount?: number
  priority: Priority
  status: string
  weight: number
}

export type SessionState = {
  id: string
  vehicleId: string
  startTime: Date
  endTime?: Date
  receivedByName: string
  enteredByName: string
  packages: ScannedShipment[]
  status: "En Proceso" | "Completado"
}

// --- Mocks y Diccionarios ---
const mockVehiculos = [
  { id: "v1", placa: "ABC-123", marca: "Freightliner", modelo: "Cascadia", estado: "Activo", choferAsignado: "Juan Pérez" },
  { id: "v2", placa: "XYZ-789", marca: "Ford", modelo: "F-150", estado: "Activo", choferAsignado: "María García" },
]

const sucursalMap: Record<string, string> = {
  alamos: "Álamos",
  navojoa: "Navojoa",
  huatabampo: "Huatabampo",
  "pueblo-yaqui": "Pueblo Yaqui",
  "villa-juarez": "Villa Juárez",
  vicam: "Vicam",
}

// Helpers para fechas
const isToday = (date: Date) => new Date().toDateString() === new Date(date).toDateString()
const isTomorrow = (date: Date) => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toDateString() === new Date(date).toDateString()
}

// Generador mock
const generateScannedShipment = (tracking: string): ScannedShipment => {
  const sucursales = Object.keys(sucursalMap)
  const carriers: ShipmentType[] = ["FEDEX", "DHL"]
  const randomZip = `85${Math.floor(Math.random() * 900) + 100}`
  
  const randDate = Math.random()
  const date = new Date()
  if (randDate > 0.8) date.setDate(date.getDate() + 1) // Mañana
  else if (randDate > 0.6) date.setDate(date.getDate() + 5) // Futuro

  const hasCharge = Math.random() > 0.8
  
  return {
    id: crypto.randomUUID(),
    trackingNumber: tracking,
    shipmentType: carriers[Math.floor(Math.random() * carriers.length)],
    recipientZip: randomZip,
    subsidiaryId: sucursales[Math.floor(Math.random() * sucursales.length)],
    commitDateTime: date,
    isHighValue: Math.random() > 0.85,
    isCargo: Math.random() > 0.9,
    hasCharge: hasCharge,
    chargeAmount: hasCharge ? Math.floor(Math.random() * 500) + 100 : undefined,
    priority: "MEDIA",
    status: "PENDIENTE",
    weight: Math.floor(Math.random() * 20) + 1
  }
}

export default function InboundPackage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  
  const { speak: speakMessage } = useBrowserVoice({ pitch: 0.8, rate: 1.3 })

  // WRAPPER OPTIMIZADO PARA POS
  const safeSpeak = useCallback((text: string) => {
    try {
      // Cancelamos cualquier voz reproduciéndose actualmente para escaneos rápidos
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
    vehicleId: mockVehiculos[0].id,
    startTime: new Date(),
    receivedByName: "",
    enteredByName: "",
    packages: [],
    status: "En Proceso"
  })
  
  const [scanInput, setScanInput] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [filters, setFilters] = useState({
    search: "",
    sucursal: "ALL",
    carrier: "ALL"
  })

  const [modals, setModals] = useState({
    shortcuts: false,
    expiringToday: false,
    highValue: false,
    charges: false,
    signatures: false
  })

  useEffect(() => {
    setIsClient(true)
  }, [])

  const toggleModal = (key: keyof typeof modals, value: boolean) => {
    setModals(prev => ({ ...prev, [key]: value }))
    if (!value) setTimeout(() => inputRef.current?.focus(), 100)
  }

  // Ordenamiento corporativo: Sucursal -> Carrier -> CP
  const processedPackages = useMemo(() => {
    let result = [...session.packages]

    if (filters.search) {
      const s = filters.search.toLowerCase()
      result = result.filter(p => p.trackingNumber.toLowerCase().includes(s) || p.recipientZip.includes(s))
    }
    if (filters.sucursal !== "ALL") result = result.filter(p => p.subsidiaryId === filters.sucursal)
    if (filters.carrier !== "ALL") result = result.filter(p => p.shipmentType === filters.carrier)

    result.sort((a, b) => {
      const cmpSucursal = (sucursalMap[a.subsidiaryId] || a.subsidiaryId).localeCompare(sucursalMap[b.subsidiaryId] || b.subsidiaryId)
      if (cmpSucursal !== 0) return cmpSucursal

      const cmpCarrier = a.shipmentType.localeCompare(b.shipmentType)
      if (cmpCarrier !== 0) return cmpCarrier

      return a.recipientZip.localeCompare(b.recipientZip)
    })

    return result
  }, [session.packages, filters])

  // KPIs
  const expiringTodayPackages = useMemo(() => session.packages.filter(p => isToday(p.commitDateTime)), [session.packages])
  const highValuePackages = useMemo(() => session.packages.filter(p => p.isHighValue), [session.packages])
  const cargoPackages = useMemo(() => session.packages.filter(p => p.isCargo), [session.packages])
  const packagesWithCharges = useMemo(() => session.packages.filter(p => p.hasCharge), [session.packages])
  const totalChargesAmount = useMemo(() => packagesWithCharges.reduce((acc, p) => acc + (p.chargeAmount || 0), 0), [packagesWithCharges])
  
  const fedexCount = useMemo(() => session.packages.filter(p => p.shipmentType === "FEDEX").length, [session.packages])
  const dhlCount = useMemo(() => session.packages.filter(p => p.shipmentType === "DHL").length, [session.packages])

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement instanceof HTMLInputElement
      
      if (e.key === "F1") {
        e.preventDefault()
        inputRef.current?.focus()
      } else if (e.key === "F2" && session.packages.length > 0) {
        e.preventDefault()
        toggleModal("signatures", true)
      } else if (e.key === "F3") {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === "Escape") {
        setModals({ signatures: false, shortcuts: false, expiringToday: false, highValue: false, charges: false })
        setTimeout(() => inputRef.current?.focus(), 100)
      } else if (!isInputFocused && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [session.packages.length])

  const handleScan = useCallback(async () => {
    if (!scanInput.trim()) return
    setIsScanning(true)
    setError(null)
    
    const trackingNumber = scanInput.trim().toUpperCase()

    setSession((prevSession) => {
      if (prevSession.packages.some((p) => p.trackingNumber === trackingNumber)) {
        setError(`Guía duplicada: ${trackingNumber}`)
        safeSpeak("Guía duplicada. Por favor, verifica.")
        return prevSession
      }

      const newShipment = generateScannedShipment(trackingNumber)
      
      if (isToday(newShipment.commitDateTime)) {
        safeSpeak("El paquete expira hoy")
      } else if (isTomorrow(newShipment.commitDateTime)) {
        safeSpeak("El paquete expira mañana")
      }

      return {
        ...prevSession,
        packages: [newShipment, ...prevSession.packages],
      }
    })

    setScanInput("")
    setIsScanning(false)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [scanInput, safeSpeak])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleScan()
    }
  }

  const handleRemovePackage = (id: string) => {
    setSession(prev => ({ ...prev, packages: prev.packages.filter((p) => p.id !== id) }))
    setTimeout(() => inputRef.current?.focus(), 10)
  }

  const handleCompleteSession = async () => {
    setIsScanning(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    setSession(prev => ({ ...prev, endTime: new Date(), status: "Completado" }))
    toggleModal("signatures", false)
    setIsScanning(false)

    setTimeout(() => {
      setSession({
        id: crypto.randomUUID(),
        vehicleId: session.vehicleId,
        startTime: new Date(),
        receivedByName: "",
        enteredByName: "",
        packages: [],
        status: "En Proceso"
      })
      setScanInput("")
      inputRef.current?.focus()
    }, 2000)
  }

  const selectedVehiculo = mockVehiculos.find((v) => v.id === session.vehicleId)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      
      <header className="bg-white border-b border-border">
        <div className="px-6 py-4 max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold">Bodega Obregón</h1>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm text-muted-foreground">Recepción de Envíos</span>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={() => toggleModal("shortcuts", true)} className="ml-2 text-muted-foreground hover:text-foreground outline-none rounded">
                    <Keyboard className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Ver Atajos (F1, F2...)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        
        {/* Grid de 6 Columnas para las Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Total Registros" value={session.packages.length} icon={Package} />
          
          <div className="rounded-lg border bg-card p-3 flex flex-col justify-center shadow-sm">
            <div className="flex flex-row items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Transportistas</span>
              <Truck className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <div className="flex items-center gap-3">
               <div className="flex-1 flex flex-col">
                 <span className="text-[10px] font-bold text-[#4d148c] uppercase">FedEx</span>
                 <span className="text-xl font-bold tracking-tight">{fedexCount}</span>
               </div>
               <div className="w-px h-8 bg-border"></div>
               <div className="flex-1 flex flex-col items-end">
                 <span className="text-[10px] font-bold text-[#d40511] uppercase">DHL</span>
                 <span className="text-xl font-bold tracking-tight">{dhlCount}</span>
               </div>
            </div>
          </div>
          
          <StatCard 
            title="Vencen Hoy" 
            value={expiringTodayPackages.length} 
            icon={Clock} 
            alert={expiringTodayPackages.length > 0}
            onClick={() => expiringTodayPackages.length > 0 && toggleModal("expiringToday", true)}
          />
          
          <StatCard 
            title="Alto Valor" 
            value={highValuePackages.length} 
            icon={ShieldAlert} 
            alert={highValuePackages.length > 0}
            onClick={() => highValuePackages.length > 0 && toggleModal("highValue", true)}
          />
          
          <StatCard 
            title="Carga" 
            value={cargoPackages.length} 
            icon={Box} 
          />

          <StatCard 
            title="Cobros Extras" 
            value={packagesWithCharges.length} 
            subValue={`$${totalChargesAmount.toLocaleString()} MXN`}
            icon={DollarSign} 
            alert={packagesWithCharges.length > 0}
            onClick={() => packagesWithCharges.length > 0 && toggleModal("charges", true)}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* COLUMNA IZQUIERDA: Tabla de Datos */}
          <div className="xl:col-span-8 space-y-6">
            <Card className="flex flex-col h-full">
              <div className="px-6 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/10">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">Inventario Recibido</CardTitle>
                  <Badge variant="secondary" className="font-mono text-[10px]">{processedPackages.length}</Badge>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input 
                      id="search-filter"
                      ref={searchRef}
                      placeholder="Buscar guía o C.P. (F3)..." 
                      className="h-8 text-xs pl-8 bg-white shadow-sm"
                      value={filters.search}
                      onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                    />
                  </div>
                  <select 
                    className="h-8 rounded-md border border-input bg-white px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring shadow-sm"
                    value={filters.sucursal}
                    onChange={(e) => setFilters(f => ({ ...f, sucursal: e.target.value }))}
                  >
                    <option value="ALL">Todas las Sucursales</option>
                    {Object.entries(sucursalMap).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                  <select 
                    className="h-8 rounded-md border border-input bg-white px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring shadow-sm"
                    value={filters.carrier}
                    onChange={(e) => setFilters(f => ({ ...f, carrier: e.target.value }))}
                  >
                    <option value="ALL">Carrier</option>
                    <option value="FEDEX">FedEx</option>
                    <option value="DHL">DHL</option>
                  </select>
                </div>
              </div>
              
              <CardContent className="p-0 flex-1 overflow-auto max-h-[800px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm border-b">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[170px] text-xs h-9">Tracking</TableHead>
                      <TableHead className="text-xs h-9">Carrier</TableHead>
                      <TableHead className="text-xs h-9">Destino</TableHead>
                      <TableHead className="text-xs h-9 w-[300px]">Alertas y Etiquetas</TableHead>
                      <TableHead className="text-right text-xs h-9">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedPackages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground text-sm">
                          Escanee un paquete para comenzar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      processedPackages.map((pkg) => (
                        <TableRow key={pkg.id}>
                          <TableCell className="font-mono font-medium text-sm py-2.5">{pkg.trackingNumber}</TableCell>
                          
                          <TableCell className="py-2.5">
                            {pkg.shipmentType === 'FEDEX' ? (
                              <Badge className="bg-[#4d148c] hover:bg-[#4d148c]/90 text-white font-bold text-[10px] border-none shadow-sm">FedEx</Badge>
                            ) : pkg.shipmentType === 'DHL' ? (
                              <Badge className="bg-[#ffcc00] hover:bg-[#ffcc00]/90 text-[#d40511] font-bold text-[10px] border-none shadow-sm">DHL</Badge>
                            ) : (
                              <Badge variant="outline" className="font-normal text-[10px]">{pkg.shipmentType}</Badge>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-xs py-2.5 text-muted-foreground">
                            {sucursalMap[pkg.subsidiaryId] || pkg.subsidiaryId} <br/>
                            <span className="font-mono">CP: {pkg.recipientZip}</span>
                          </TableCell>
                          
                          <TableCell className="py-2.5">
                            <div className="flex gap-1.5 flex-wrap">
                              {isToday(pkg.commitDateTime) && <Badge className="font-bold text-[10px] px-1.5 py-0 bg-red-600 text-white hover:bg-red-700 shadow-sm">Vence Hoy</Badge>}
                              {isTomorrow(pkg.commitDateTime) && <Badge variant="secondary" className="font-bold text-[10px] px-1.5 py-0 bg-orange-100 text-orange-800 border-orange-200 border hover:bg-orange-200">Vence Mañana</Badge>}
                              {pkg.isHighValue && <Badge variant="secondary" className="font-bold text-[10px] px-1.5 py-0 bg-purple-100 text-purple-800 border-purple-200 border hover:bg-purple-200">Alto Valor</Badge>}
                              {pkg.isCargo && <Badge variant="secondary" className="font-bold text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800 border-blue-200 border hover:bg-blue-200">Carga</Badge>}
                              {pkg.hasCharge && <Badge variant="secondary" className="font-bold text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-200 border hover:bg-amber-200">Cobro: ${pkg.chargeAmount}</Badge>}
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-right py-2.5">
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleRemovePackage(pkg.id)} className="h-7 w-7 hover:text-destructive">
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar Registro</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* COLUMNA DERECHA: Escáner y Configuración */}
          <div className="xl:col-span-4 space-y-4">
            
            <Card className="border-blue-200 shadow-sm">
              <CardContent className="">
                <div className="bg-blue-50/30 pb-4">
                    <Label className="text-sm font-medium flex items-center gap-2">
                        <Barcode className="w-4 h-4 text-blue-600" /> Captura de Tracking (Escáner)
                    </Label>
                    <Label className="text-xs">
                        Escanee el código de barras aquí.
                    </Label>
                </div>
                <div className="flex flex-col gap-3">
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Escanee o teclee (F1)..."
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isScanning}
                    className="font-mono text-base h-12 shadow-inner uppercase"
                    autoFocus
                  />
                  <Button onClick={handleScan} disabled={isScanning || !scanInput.trim()} className="h-10 w-full">
                    {isScanning ? "Procesando..." : "Registrar Paquete"}
                  </Button>
                </div>
                {error && (
                  <p className="mt-3 text-xs text-destructive font-medium flex items-center gap-1.5 p-2 bg-destructive/10 rounded">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="">
                <Label className="">Asignación de Ruta</Label>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Seleccionar Vehículo</Label>
                  <UnidadSelector 
                    selectedUnidad={session.vehicleId}
                    onSelectionChange={(unidadId) => setSession(prev => ({...prev, vehicleId: unidadId}))}
                  />
                </div>
                
                {selectedVehiculo && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Seleccionar Chofer</Label>
                      <RepartidorSelector 
                        onSelectionChange={(e) => {
                            console.log(e);
                        }}
                        selectedRepartidores={[]}
                      />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3">
                <Label className="text-sm font-medium">Procesar Recepción</Label>
                <div className="space-y-2">
                    {isClient ? (
                    <PDFDownloadLink document={<PackageEntryPDF session={session} vehiculo={selectedVehiculo} />} fileName={`recepcion-${new Date().toISOString().split("T")[0]}.pdf`}>
                        {({ loading }) => (
                        <Button variant="outline" disabled={loading || session.packages.length === 0} className="w-full justify-start h-9 text-sm shadow-sm">
                            <Download className="mr-2 h-4 w-4" /> Exportar Reporte
                        </Button>
                        )}
                    </PDFDownloadLink>
                    ) : (
                    <Button variant="outline" disabled className="w-full justify-start h-9 text-sm shadow-sm">
                        <Download className="mr-2 h-4 w-4" /> Preparando Reporte...
                    </Button>
                    )}

                    <Button
                    onClick={() => toggleModal("signatures", true)}
                    disabled={session.packages.length === 0}
                    className="w-full justify-start h-10 text-sm shadow-md bg-green-600 hover:bg-green-700 text-white"
                    >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar Ingreso (F2)
                    </Button>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>

      {/* --- Modales --- */}

      <Dialog open={modals.shortcuts} onOpenChange={(val) => toggleModal("shortcuts", val)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2"><Keyboard className="w-4 h-4"/> Atajos de Teclado</DialogTitle>
            <DialogDescription className="text-xs">Optimice su flujo de trabajo utilizando el teclado.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-3">
            {[
              { key: "F1", action: "Enfocar campo de Escáner" },
              { key: "F2", action: "Abrir ventana de Finalizar Ingreso" },
              { key: "F3", action: "Buscar en listado (Guía o CP)" },
              { key: "ESC", action: "Cerrar modales o ventanas" },
              { key: "Letras", action: "Auto-enfoca escáner si está fuera" },
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
        sucursalMap={sucursalMap}
      />

      <DetailModal 
        open={modals.highValue} 
        onOpenChange={(val: boolean) => toggleModal("highValue", val)}
        title="Paquetes de Alto Valor"
        description="Requieren manejo de seguridad especial."
        packages={highValuePackages}
        sucursalMap={sucursalMap}
      />

      <DetailModal 
        open={modals.charges} 
        onOpenChange={(val: boolean) => toggleModal("charges", val)}
        title="Cobros Pendientes"
        description={`Monto Total a Cobrar: $${totalChargesAmount.toLocaleString()} MXN`}
        packages={packagesWithCharges}
        sucursalMap={sucursalMap}
      />

      <Dialog open={modals.signatures} onOpenChange={(val) => toggleModal("signatures", val)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base">Firma de Recepción</DialogTitle>
            <DialogDescription className="text-xs">
              Autorice el ingreso de {session.packages.length} paquetes a la bodega.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="received-by" className="text-xs">Recibe (Personal de Bodega)</Label>
              <Input id="received-by" value={session.receivedByName} onChange={(e) => setSession({...session, receivedByName: e.target.value})} className="h-9" autoFocus />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entered-by" className="text-xs">Entrega (Chofer/Operador)</Label>
              <Input id="entered-by" value={session.enteredByName} onChange={(e) => setSession({...session, enteredByName: e.target.value})} className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => toggleModal("signatures", false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCompleteSession} disabled={!session.receivedByName || !session.enteredByName || isScanning}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ title, value, subValue, icon: Icon, alert = false, onClick }: any) {
  return (
    <div onClick={onClick} className={`rounded-lg border bg-card p-3 flex flex-col justify-center shadow-sm transition-colors ${alert ? "cursor-pointer hover:bg-muted/40 border-destructive/30" : ""}`}>
      <div className="flex flex-row items-center justify-between mb-1">
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${alert ? "text-destructive" : "text-muted-foreground"}`}>{title}</span>
        <Icon className={`h-3.5 w-3.5 ${alert ? "text-destructive/70" : "text-muted-foreground/50"}`} />
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-xl font-bold tracking-tight">{value}</div>
        {subValue && <div className="text-xs font-semibold text-muted-foreground">{subValue}</div>}
      </div>
    </div>
  )
}

function DetailModal({ open, onOpenChange, title, description, packages, sucursalMap }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="text-sm">{description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-auto border rounded-md mt-2">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm border-b">
              <TableRow>
                <TableHead className="text-xs h-9">Tracking</TableHead>
                <TableHead className="text-xs h-9">Detalles</TableHead>
                <TableHead className="text-right text-xs h-9">Monto / Peso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-20 text-muted-foreground text-sm">
                    No hay registros asociados.
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((pkg: ScannedShipment) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-mono font-medium text-sm py-2">{pkg.trackingNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-xs py-2">
                      {pkg.shipmentType} • {sucursalMap[pkg.subsidiaryId]}
                    </TableCell>
                    <TableCell className="text-right text-xs py-2 font-medium">
                      {pkg.hasCharge ? `$${pkg.chargeAmount}` : `${pkg.weight} kg`}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}