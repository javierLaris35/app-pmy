'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Package, 
  ScanBarcode, 
  User, 
  MapPin, 
  Calendar, 
  Hash,
  CheckCircle2,
  X,
  Trash2,
  Clock,
  AlertCircle,
  Phone,
  Building2,
  Box,
  Truck,
  Keyboard,
  History,
  Printer,
  Search,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { getTrackingNumberInfo, savePackageReception } from '@/lib/services/package-reception/package-reception'
import { formatDateToShortDate, formatShortDate } from '@/utils/date.utils'


interface CustomerInfo {
  recipientName: string
  recipientPhone: string
  recipientCity: string
  recipientZip: string
  recipientAddress: string
}

interface PackageDetails {
  trackingNumber: string
  shipmentType: string
  priority: string
  commitDateTime: string | Date
  carrierCode: string
  consNumber: string
  consolidatedId: string
  isHighValue: boolean
}

interface ScannedPackage {
  shipmentId?: string
  chargeShipmentId?: string
  trackingNumber: string
  recipientName: string
  shipmentType: string
  status: 'ready' | 'pending' | 'delivered'
  scannedAt: string
  isCharge: boolean
  customerInfo: CustomerInfo
  packageDetails: PackageDetails
}

// Reusable detail row component
function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground min-w-24">{label}</span>
      <span className="text-sm font-medium text-foreground ml-auto text-right">{value}</span>
    </div>
  )
}

export default function PackageReception() {
  const [scanInput, setScanInput] = useState('')
  const [scannedPackages, setScannedPackages] = useState<ScannedPackage[]>([])
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [packageDetails, setPackageDetails] = useState<PackageDetails | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount and when returning from dialogs
  useEffect(() => {
    if (!showConfirmDialog && !showShortcuts) {
      inputRef.current?.focus()
    }
  }, [showConfirmDialog, showShortcuts])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input
      if (e.target instanceof HTMLInputElement) return
      
      if (e.key === 'F1') {
        e.preventDefault()
        inputRef.current?.focus()
      } else if (e.key === 'F2' && scannedPackages.length > 0) {
        e.preventDefault()
        setShowConfirmDialog(true)
      } else if (e.key === 'Escape') {
        setShowConfirmDialog(false)
        setShowShortcuts(false)
      } else if (e.key === '?') {
        setShowShortcuts(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [scannedPackages.length])

  const handleScan = useCallback(async () => {
    if (!scanInput.trim()) return
    
    setIsScanning(true)
    setError(null)

    const trackingNumber = scanInput.trim().toUpperCase();

    try {
      // API call
      const trackingInfo: any = await getTrackingNumberInfo(trackingNumber);   
      console.log("🚀 ~ PackageReception ~ trackingInfo:", trackingInfo)
      
      // Check if already scanned
      if (scannedPackages.some(p => p.trackingNumber === trackingNumber)) {
        setError('Este paquete ya fue escaneado')
        setIsScanning(false)
        setScanInput('')
        inputRef.current?.focus()
        return
      }

      const newPackage: ScannedPackage = {
        // Si ES carga, shipmentId es null. Si NO es carga, lleva el id.
        shipmentId: trackingInfo.isCharge ? null : trackingInfo.id,
        
        // Si ES carga, chargeShipmentId lleva el id. Si NO es carga, es null.
        chargeShipmentId: trackingInfo.isCharge ? trackingInfo.id : null,
        trackingNumber,
        recipientName: trackingInfo?.recipientName || 'Cliente no especificado',
        shipmentType: trackingInfo?.shipmentType || 'Estándar',
        status: 'ready',
        isCharge: trackingInfo?.isCharge || false,
        customerInfo: {
          recipientName: trackingInfo.recipientName || 'N/A',
          recipientPhone: trackingInfo.recipientPhone || 'N/A',
          recipientCity: trackingInfo.recipientCity || 'N/A',
          recipientZip: trackingInfo.recipientZip || 'N/A',
          recipientAddress: trackingInfo.recipientAddress || 'N/A'
        },
        packageDetails: {
          trackingNumber: trackingInfo.trackingNumber || trackingNumber,
          shipmentType: trackingInfo.shipmentType || 'N/A',
          priority: trackingInfo.priority || 'BAJA',
          carrierCode: trackingInfo.carrierCode || 'N/A',
          commitDateTime: trackingInfo.commitDateTime || new Date(),
          consNumber: trackingInfo.consNumber || 'N/A',
          consolidatedId: trackingInfo.consolidatedId || 'N/A',
          isHighValue: trackingInfo.isHighValue || false
        },
        scannedAt: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      }
      
      setScannedPackages(prev => [newPackage, ...prev])
      setSelectedPackage(trackingNumber)
      
      if (trackingInfo) {
        setCustomerInfo({
          recipientName: trackingInfo.recipientName || 'N/A',
          recipientPhone: trackingInfo.recipientPhone || 'N/A',
          recipientCity: trackingInfo.recipientCity || 'N/A',
          recipientZip: trackingInfo.recipientZip || 'N/A',
          recipientAddress: trackingInfo.recipientAddress || 'N/A'
        })
        setPackageDetails({
          trackingNumber: trackingInfo.trackingNumber || trackingNumber,
          shipmentType: trackingInfo.shipmentType || 'N/A',
          priority: trackingInfo.priority || 'BAJA',
          carrierCode: trackingInfo.carrierCode || 'N/A',
          commitDateTime: trackingInfo.commitDateTime || new Date(),
          consNumber: trackingInfo.consNumber || 'N/A',
          consolidatedId: trackingInfo.consolidatedId || 'N/A',
          isHighValue: trackingInfo.isHighValue || false
        })
      } else {
        setCustomerInfo({
          recipientName: 'Cliente ' + trackingNumber.slice(-4),
          recipientPhone: 'No registrado',
          recipientCity: 'Ciudad Local',
          recipientZip: '00000',
          recipientAddress: 'Dirección pendiente'
        })
        setPackageDetails({
          trackingNumber,
          shipmentType: 'FEDEX',
          priority: 'NORMAL',
          carrierCode: 'FDX',
          commitDateTime: new Date(),
          consNumber: '-',
          consolidatedId: '-',
          isHighValue: false
        })
      }
    } catch (err) {
      setError('Error al conectar con el servidor')
    }
    
    setScanInput('')
    setIsScanning(false)
    inputRef.current?.focus()
  }, [scanInput, scannedPackages])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan()
    }
  }

  const handleRemovePackage = (id: string) => {
    const pkg = scannedPackages.find(p => p.id === id)
    setScannedPackages(prev => prev.filter(p => p.id !== id))
    if (pkg && pkg.trackingNumber === selectedPackage) {
      setSelectedPackage(null)
      setCustomerInfo(null)
      setPackageDetails(null)
    }
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleSelectPackage = (trackingNumber: string) => {
    setSelectedPackage(trackingNumber)
    // Buscamos si existe en mockPackages si es que recargamos (en un caso real, haríamos otra llamada a la BD o buscaríamos del estado general)
    const pkg = scannedPackages.find(p => p.trackingNumber === trackingNumber)
    if (pkg) {
      setCustomerInfo(pkg.customerInfo)
      setPackageDetails(pkg.packageDetails)
    }
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleConfirmDelivery = async () => {
    setShowConfirmDialog(false)
    setIsScanning(true)
    await savePackageReception(scannedPackages)
    
    setScannedPackages(prev => prev.map(p => ({ ...p, status: 'delivered' as const })))
    setShowSuccess(true)
    setIsScanning(false)
    
    setTimeout(() => {
      setShowSuccess(false)
      setScannedPackages([])
      setSelectedPackage(null)
      setCustomerInfo(null)
      setPackageDetails(null)
      inputRef.current?.focus()
    }, 2000)
  }

  const totalPackages = scannedPackages.length
  const readyPackages = scannedPackages.filter(p => p.status === 'ready').length

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-full">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-backdrop-blur:bg-card/60">
        <div className="flex items-center justify-between pr-6 py-3">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold text-foreground">Registro Ocurre/Entrega Bodega</h1>
              <p className="text-xs text-muted-foreground"></p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowShortcuts(true)}>
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atajos de teclado (?)</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <History className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Historial</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split Panel */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Panel - Scanner and Package List */}
        <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-border flex flex-col bg-card overflow-hidden shrink-0 lg:shrink">
          {/* Scanner Section */}
          <div className="shrink-0 py-5 px-2 border-b border-border">
            <div className="flex items-center gap-2 mb-4">
              <ScanBarcode className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Escanear Paquete</h2>
              <Badge variant="default" className="ml-auto text-xs hidden sm:inline-flex">F1 para enfocar</Badge>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Escanear codigo de barras o ingresar tracking..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="h-12 text-base pl-10 pr-10 font-mono w-full"
                  disabled={isScanning}
                />
                {scanInput && (
                  <button
                    onClick={() => {
                      setScanInput('')
                      inputRef.current?.focus()
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button 
                onClick={handleScan}
                disabled={!scanInput.trim() || isScanning}
                className="h-12 px-5 w-full sm:w-auto"
              >
                {isScanning ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span className="sm:hidden">Escaneando</span>
                  </span>
                ) : (
                  'Agregar'
                )}
              </Button>
            </div>

            {error && (
              <div className="flex items-center gap-2 mt-3 p-2.5 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Package List */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-5 py-3 bg-muted/40 border-b border-border sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">
                  Paquetes Escaneados
                </h3>
                {totalPackages > 0 && (
                  <Badge className="bg-secondary/10 text-secondary hover:bg-secondary/20 border-0">
                    {readyPackages} listo{readyPackages !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>

            {scannedPackages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-muted-foreground p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 opacity-50" />
                </div>
                <p className="font-medium">No hay paquetes escaneados</p>
                <p className="text-sm mt-1">Escanee un codigo de barras para comenzar</p>
              </div>
            ) : (
              <div className="divide-y divide-border pb-4">
                {scannedPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => handleSelectPackage(pkg.trackingNumber)}
                    className={`px-5 py-4 cursor-pointer transition-all ${
                      selectedPackage === pkg.trackingNumber 
                        ? 'bg-primary/5 border-l-2 border-l-primary' 
                        : 'hover:bg-muted/50 border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold text-foreground">
                            {pkg.trackingNumber}
                          </span>
                          <Badge 
                            variant={pkg.status === 'delivered' ? 'default' : 'secondary'}
                            className={`text-[10px] sm:text-xs ${
                              pkg.status === 'delivered' 
                                ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20' 
                                : ''
                            }`}
                          >
                            {pkg.status === 'delivered' ? 'Entregado' : 'Listo'}
                          </Badge>
                          { pkg.isCharge && (
                            <Badge variant="success" className="text-[10px] sm:text-xs">
                              Carga
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {pkg.recipientName}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Box className="w-3 h-3" />
                            {pkg.shipmentType}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {pkg.scannedAt}
                          </span>
                        </div>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemovePackage(pkg.id)
                            }}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Remover paquete</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Delivery Button */}
          <div className="shrink-0 p-5 border-t border-border bg-card">
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={scannedPackages.length === 0 || isScanning || showSuccess}
              size="lg"
              className={`w-full h-12 sm:h-14 text-sm sm:text-base font-semibold transition-all ${
                showSuccess 
                  ? 'bg-green-500 hover:bg-green-500 text-white' 
                  : ''
              }`}
            >
              {showSuccess ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Entrega Confirmada
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Confirmar Entrega ({totalPackages})
                  <Badge variant="secondary" className="ml-2 text-xs bg-primary-foreground/20 hidden sm:inline-flex">F2</Badge>
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Right Panel - Details */}
        <div className="w-full lg:w-1/2 bg-muted/20 flex flex-col overflow-y-auto">
          {!selectedPackage ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Package className="w-10 h-10 opacity-30" />
              </div>
              <p className="text-lg font-medium">Sin Paquete Seleccionado</p>
              <p className="text-sm mt-1 text-center">Escanee o seleccione un paquete para ver los detalles</p>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Customer Card */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">Información del Cliente</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {customerInfo && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{customerInfo.recipientName}</p>
                          <p className="text-sm text-muted-foreground">{customerInfo.recipientCity}, C.P. {customerInfo.recipientZip}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <div className="overflow-hidden">
                            <p className="text-xs text-muted-foreground">Teléfono</p>
                            <p className="text-sm font-medium text-foreground truncate">{customerInfo.recipientPhone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <div className="overflow-hidden">
                            <p className="text-xs text-muted-foreground">Ciudad</p>
                            <p className="text-sm font-medium text-foreground truncate">{customerInfo.recipientCity}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Dirección Exacta</p>
                          <p className="text-sm font-medium text-foreground">{customerInfo.recipientAddress}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Package Details Card with Tabs */}
              <Card className="flex-1">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary" />
                      <CardTitle className="text-base">Detalles del Envío</CardTitle>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Imprimir etiqueta</TooltipContent>
                    </Tooltip>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {packageDetails && (
                    <Tabs defaultValue="general" className="w-full">
                      <TabsList className="w-full mb-4">
                        <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
                        <TabsTrigger value="shipping" className="flex-1">Logística</TabsTrigger>
                        <TabsTrigger value="value" className="flex-1">Valor</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="general" className="mt-0 space-y-4">
                        {/* Tracking Number Highlight */}
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                          <div className="flex items-center gap-2 mb-1">
                            <Hash className="w-4 h-4 text-primary" />
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Número de Rastreo</p>
                          </div>
                          <p className="text-xl font-mono font-bold text-primary">{packageDetails.trackingNumber}</p>
                        </div>

                        <div className="space-y-1">
                          <DetailRow icon={Box} label="Tipo de Envío" value={packageDetails.shipmentType} />
                          <DetailRow icon={AlertCircle} label="Prioridad" value={packageDetails.priority} />
                          <DetailRow icon={Truck} label="Carrier Code" value={packageDetails.carrierCode || 'N/A'} />
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="shipping" className="mt-0 space-y-1">
                        <DetailRow icon={Calendar} label="Fecha Compromiso" value={formatDateToShortDate(packageDetails.commitDateTime)} />
                        <DetailRow icon={Hash} label="Consolidado ID" value={packageDetails.consolidatedId || 'Sin consolidar'} />
                        <DetailRow icon={Package} label="Cons Number" value={packageDetails.consNumber || 'N/A'} />
                      </TabsContent>
                      
                      <TabsContent value="value" className="mt-0">
                        {packageDetails.isHighValue ? (
                          <div className="p-6 bg-amber-50 rounded-lg border border-amber-200 text-center">
                            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                            <p className="text-sm text-amber-700 uppercase tracking-wide mb-1 font-semibold">Atención Requerida</p>
                            <p className="text-2xl font-bold text-amber-700">PAQUETE DE ALTO VALOR</p>
                            <p className="text-xs text-amber-600 mt-2">Este envío requiere protocolos de seguridad adicionales durante su entrega.</p>
                          </div>
                        ) : (
                          <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-center">
                            <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <p className="text-lg font-medium text-slate-600">Valor Estándar</p>
                            <p className="text-xs text-slate-500 mt-1">No requiere protocolos especiales de alto valor.</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Delivery Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Confirmar Entrega
            </DialogTitle>
            <DialogDescription>
              Esta a punto de confirmar la entrega de {totalPackages} paquete{totalPackages !== 1 ? 's' : ''} al cliente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{customerInfo?.recipientName || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ciudad:</span>
                <span className="font-medium">{customerInfo?.recipientCity || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paquetes:</span>
                <span className="font-medium">{totalPackages}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmDelivery} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Confirmar Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary" />
              Atajos de Teclado
            </DialogTitle>
            <DialogDescription>
              Use estos atajos para trabajar mas rapido.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm">Enfocar campo de escaneo</span>
              <Badge variant="outline">F1</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm">Confirmar entrega</span>
              <Badge variant="outline">F2</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm">Escanear paquete</span>
              <Badge variant="outline">Enter</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm">Cerrar dialogo</span>
              <Badge variant="outline">Esc</Badge>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm">Mostrar atajos</span>
              <Badge variant="outline">?</Badge>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowShortcuts(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}