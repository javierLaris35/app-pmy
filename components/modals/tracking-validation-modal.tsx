"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  CheckCircle,
  XCircle,
  Search,
  FileText,
  BarChart3,
  AlertTriangle,
  Info,
  FileUp,
  Calendar,
  Package,
  MapPin,
  Phone,
  User,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Database,
} from "lucide-react"
import { getShipmentByTrackingNumber } from "@/lib/services/shipments"
import { format, isValid } from "date-fns"
import { es } from "date-fns/locale"

interface TrackingValidationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface TrackingDetail {
  trackingNumber: string
  recipientName: string
  recipientAddress: string
  recipientPhone: string
  status: string
  commitDate: string
  shipmentType: string
  source: string
  statusHistory: any[]
  lastStatus?: string
  exceptionCode?: string | null
  statusNotes?: string | null
  statusTimestamp?: string | null
  receivedByName?: string
  priority?: string
  consNumber?: string
  error?: string
}

interface ValidationResults {
  onlyInFinanzas: string[]
  onlyInSistema: string[]
  common: string[]
}

interface ValidationSummary {
  totalFinanzas: number
  totalSistema: number
  onlyInFinanzas: number
  onlyInSistema: number
  common: number
  validationIssues: number
}

export function TrackingValidationModal({ open, onOpenChange }: TrackingValidationModalProps) {
  const [trackingFinanzas, setTrackingFinanzas] = useState("")
  const [listadoSistema, setListadoSistema] = useState("")
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null)
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null)
  const [trackingDetails, setTrackingDetails] = useState<{
    onlyInFinanzas: {
      found: TrackingDetail[],
      notFound: TrackingDetail[]
    },
    onlyInSistema: {
      found: TrackingDetail[],
      notFound: TrackingDetail[]
    }
  } | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationProgress, setVerificationProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("input")
  const [expandedTracking, setExpandedTracking] = useState<string | null>(null)

  const parseTrackingNumbers = (text: string): string[] => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  }

  const performEnhancedValidation = () => {
    const finanzasNumbers = parseTrackingNumbers(trackingFinanzas)
    const sistemaNumbers = parseTrackingNumbers(listadoSistema)

    const onlyInFinanzas = finanzasNumbers.filter(num => !sistemaNumbers.includes(num))
    const onlyInSistema = sistemaNumbers.filter(num => !finanzasNumbers.includes(num))
    const common = finanzasNumbers.filter(num => sistemaNumbers.includes(num))

    setValidationResults({
      onlyInFinanzas,
      onlyInSistema,
      common,
    })

    setValidationSummary({
      totalFinanzas: finanzasNumbers.length,
      totalSistema: sistemaNumbers.length,
      onlyInFinanzas: onlyInFinanzas.length,
      onlyInSistema: onlyInSistema.length,
      common: common.length,
      validationIssues: onlyInFinanzas.length + onlyInSistema.length
    })

    setActiveTab("validation")
  }

  const verifyDiscrepantTrackings = async () => {
    if (!validationResults) return

    const allDiscrepant = [...validationResults.onlyInFinanzas, ...validationResults.onlyInSistema]
    setIsVerifying(true)
    setVerificationProgress(0)
    
    const newTrackingDetails = {
      onlyInFinanzas: { found: [], notFound: [] },
      onlyInSistema: { found: [], notFound: [] }
    }

    try {
      for (let i = 0; i < allDiscrepant.length; i++) {
        const trackingNumber = allDiscrepant[i]
        const isFromFinanzas = validationResults.onlyInFinanzas.includes(trackingNumber)

        try {
          const cleanTracking = trackingNumber.trim()
          const shipment = await getShipmentByTrackingNumber(cleanTracking)
          
          if (!shipment) {
            throw new Error('No encontrado')
          }

          const lastStatus = shipment.statusHistory?.length > 0 
            ? shipment.statusHistory.reduce((prev: any, current: any) => 
                new Date(prev.timestamp) > new Date(current.timestamp) ? prev : current
              )
            : null

          const formatDateSafe = (date: any) => {
            if (!date) return "N/A"
            const dateObj = new Date(date)
            return isValid(dateObj) ? format(dateObj, 'PPP', { locale: es }) : "N/A"
          }

          const formatDateTimeSafe = (date: any) => {
            if (!date) return "N/A"
            const dateObj = new Date(date)
            return isValid(dateObj) ? format(dateObj, 'PPPp', { locale: es }) : "N/A"
          }

          const detail: TrackingDetail = {
            trackingNumber: cleanTracking,
            recipientName: shipment.recipientName || 'N/A',
            recipientAddress: `${shipment.recipientAddress || ''}, ${shipment.recipientCity || ''} ${shipment.recipientZip || ''}`.trim(),
            recipientPhone: shipment.recipientPhone || 'N/A',
            status: shipment.status,
            commitDate: formatDateSafe(shipment.commitDateTime),
            shipmentType: shipment.shipmentType,
            source: isFromFinanzas ? "finanzas" : "sistema",
            statusHistory: shipment.statusHistory || [],
            lastStatus: lastStatus?.status || shipment.status,
            exceptionCode: lastStatus?.exceptionCode || null,
            statusNotes: lastStatus?.notes || null,
            statusTimestamp: formatDateTimeSafe(lastStatus?.timestamp),
            receivedByName: shipment.receivedByName || "No recibido",
            priority: shipment.priority,
            consNumber: shipment.consNumber
          }

          if (isFromFinanzas) {
            newTrackingDetails.onlyInFinanzas.found.push(detail)
          } else {
            newTrackingDetails.onlyInSistema.found.push(detail)
          }
        } catch (error) {
          console.error(`Error buscando tracking ${trackingNumber}:`, error)
          
          const errorDetail: TrackingDetail = {
            trackingNumber: trackingNumber.trim(),
            recipientName: "",
            recipientAddress: "",
            recipientPhone: "",
            status: "",
            commitDate: "",
            shipmentType: "",
            source: isFromFinanzas ? "finanzas" : "sistema",
            statusHistory: [],
            error: "No encontrado en BD"
          }

          if (isFromFinanzas) {
            newTrackingDetails.onlyInFinanzas.notFound.push(errorDetail)
          } else {
            newTrackingDetails.onlyInSistema.notFound.push(errorDetail)
          }
        }

        setVerificationProgress(((i + 1) / allDiscrepant.length) * 100)
        setTrackingDetails({...newTrackingDetails})
      }
    } catch (error) {
      console.error('Error general en la verificación:', error)
    } finally {
      setIsVerifying(false)
      setActiveTab("verification")
    }
  }

  const exportResults = () => {
    if (!trackingDetails) return

    const data = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalFinanzas: validationSummary?.totalFinanzas,
        totalSistema: validationSummary?.totalSistema
      },
      onlyInFinanzas: {
        found: trackingDetails.onlyInFinanzas.found,
        notFound: trackingDetails.onlyInFinanzas.notFound.map(item => item.trackingNumber)
      },
      onlyInSistema: {
        found: trackingDetails.onlyInSistema.found,
        notFound: trackingDetails.onlyInSistema.notFound.map(item => item.trackingNumber)
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `validacion-trackings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string) => {
    const variant = status === "entregado" ? "default" : 
                   status === "en_ruta" ? "secondary" : 
                   status === "no_entregado" ? "destructive" : "outline"
    return <Badge variant={variant} className="capitalize">{status.replace('_', ' ')}</Badge>
  }

  const NotFoundList = ({ items, title }: { items: TrackingDetail[], title: string }) => (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <XCircle className="h-5 w-5 text-destructive" />
        <h3 className="font-medium text-lg">{title}</h3>
        <Badge variant="destructive" className="ml-2">
          {items.length} no encontrados
        </Badge>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 p-3 border-b font-medium text-sm">
          <div className="col-span-4">Tracking Number</div>
          <div className="col-span-3">Origen</div>
          <div className="col-span-5">Acciones</div>
        </div>
        
        <div className="divide-y">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 p-3 items-center hover:bg-gray-50">
              <div className="col-span-4 font-mono font-medium">
                {item.trackingNumber}
              </div>
              <div className="col-span-3">
                {item.source === "finanzas" ? (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700">
                    Finanzas
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Sistema
                  </Badge>
                )}
              </div>
              <div className="col-span-5 flex gap-2">
                <Button variant="outline" size="sm" className="gap-1">
                  <Search className="h-3 w-3" />
                  Reintentar búsqueda
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <FileText className="h-3 w-3" />
                  Ver detalles
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const TrackingCard = ({ detail }: { detail: TrackingDetail }) => {
    const isDelivered = detail.status === "entregado"
    const isFailed = detail.status === "no_entregado"

    const toggleExpand = () => {
      setExpandedTracking(expandedTracking === detail.trackingNumber ? null : detail.trackingNumber)
    }

    return (
      <Card className={detail.error ? "border-destructive" : isDelivered ? "border-green-500" : isFailed ? "border-red-500" : "border-blue-500"}>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="font-mono font-medium flex items-center gap-2">
              {detail.trackingNumber}
              {detail.source === "finanzas" ? (
                <Badge variant="outline" className="bg-orange-100">Finanzas</Badge>
              ) : (
                <Badge variant="outline" className="bg-blue-100">Sistema</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {detail.status && getStatusBadge(detail.status)}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleExpand}
                className="h-8 w-8 p-0"
              >
                {expandedTracking === detail.trackingNumber ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground text-sm">Destinatario</div>
                  <div className="font-medium">{detail.recipientName}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground text-sm">Teléfono</div>
                  <div className="font-medium">{detail.recipientPhone}</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground text-sm">Dirección</div>
                  <div className="font-medium">{detail.recipientAddress}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground text-sm">Tipo</div>
                  <div className="font-medium">{detail.shipmentType}</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground text-sm">Fecha Compromiso</div>
                  <div className="font-medium">{detail.commitDate}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground text-sm">Último estado</div>
                  <div className="font-medium">
                    {detail.lastStatus} {detail.statusTimestamp && `(${detail.statusTimestamp})`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {expandedTracking === detail.trackingNumber && (
            <div className="mt-4 space-y-3">
              {isFailed && detail.exceptionCode && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Motivo de no entrega</AlertTitle>
                  <AlertDescription className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-medium">Código:</span> {detail.exceptionCode}
                    </div>
                    <div>
                      <span className="font-medium">Notas:</span> {detail.statusNotes || 'Sin detalles'}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {detail.statusHistory?.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Historial de estados</span>
                  </div>
                  <div className="space-y-2">
                    {[...detail.statusHistory]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((status, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-sm">
                          <div className="w-24 text-muted-foreground">
                            {format(new Date(status.timestamp), 'PPpp', { locale: es })}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{status.status}</div>
                            {status.exceptionCode && (
                              <div className="text-xs text-red-500">Código: {status.exceptionCode}</div>
                            )}
                            {status.notes && (
                              <div className="text-xs text-muted-foreground mt-1">{status.notes}</div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Validador Avanzado de Trackings
          </DialogTitle>
          <DialogDescription>
            Compara listas y verifica existencia en base de datos
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="input" className="flex gap-2">
              <FileText className="h-4 w-4" /> Entrada
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex gap-2">
              <BarChart3 className="h-4 w-4" /> Comparación
            </TabsTrigger>
            <TabsTrigger value="verification" className="flex gap-2">
              <Search className="h-4 w-4" /> Verificación
            </TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="font-semibold">Tracking Finanzas</span>
                  <Badge variant="outline" className="bg-orange-100">
                    {parseTrackingNumbers(trackingFinanzas).length} números
                  </Badge>
                </Label>
                <Textarea
                  value={trackingFinanzas}
                  onChange={(e) => setTrackingFinanzas(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Pegue números de tracking, uno por línea"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="font-semibold">Listado Sistema</span>
                  <Badge variant="outline" className="bg-blue-100">
                    {parseTrackingNumbers(listadoSistema).length} números
                  </Badge>
                </Label>
                <Textarea
                  value={listadoSistema}
                  onChange={(e) => setListadoSistema(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Pegue números de tracking, uno por línea"
                />
              </div>
            </div>
            <div className="flex justify-center">
              <Button onClick={performEnhancedValidation} className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Comparar Listas
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            {validationSummary ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Resumen de Comparación
                      </div>
                      <Badge variant="outline">
                        {validationSummary.validationIssues} discrepancias
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {validationSummary.onlyInFinanzas}
                      </div>
                      <div className="text-sm text-muted-foreground">Solo en Finanzas</div>
                    </div>
                    <div className="border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {validationSummary.onlyInSistema}
                      </div>
                      <div className="text-sm text-muted-foreground">Solo en Sistema</div>
                    </div>
                    <div className="border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {validationSummary.common}
                      </div>
                      <div className="text-sm text-muted-foreground">En Ambos</div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-center gap-4">
                  <Button 
                    onClick={verifyDiscrepantTrackings} 
                    className="gap-2"
                    disabled={validationSummary.onlyInFinanzas + validationSummary.onlyInSistema === 0}
                  >
                    <Search className="h-4 w-4" />
                    Verificar Discrepancias en BD
                  </Button>
                </div>
              </>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Realice primero la comparación de listas en la pestaña "Entrada"
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="verification" className="space-y-8">
            {isVerifying ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Verificando en base de datos...</span>
                  <span className="text-sm font-medium">{Math.round(verificationProgress)}%</span>
                </div>
                <Progress value={verificationProgress} />
              </div>
            ) : trackingDetails ? (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Resultados de Verificación</h3>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setExpandedTracking(null)}
                      variant="outline" 
                      size="sm"
                      className="gap-1"
                    >
                      <ChevronUp className="h-3 w-3" />
                      Contraer todo
                    </Button>
                    <Button 
                      onClick={exportResults} 
                      variant="outline" 
                      className="gap-2"
                    >
                      <FileUp className="h-4 w-4" />
                      Exportar JSON
                    </Button>
                  </div>
                </div>

                {trackingDetails.onlyInFinanzas.notFound.length > 0 && (
                  <NotFoundList 
                    items={trackingDetails.onlyInFinanzas.notFound} 
                    title="Trackings de Finanzas no encontrados" 
                  />
                )}

                {trackingDetails.onlyInSistema.notFound.length > 0 && (
                  <NotFoundList 
                    items={trackingDetails.onlyInSistema.notFound} 
                    title="Trackings del Sistema no encontrados" 
                  />
                )}

                {trackingDetails.onlyInFinanzas.found.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-green-600 mb-4">
                      <CheckCircle className="h-5 w-5" />
                      Trackings de Finanzas encontrados ({trackingDetails.onlyInFinanzas.found.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {trackingDetails.onlyInFinanzas.found.map((detail, i) => (
                        <TrackingCard key={`finanzas-found-${i}`} detail={detail} />
                      ))}
                    </div>
                  </div>
                )}

                {trackingDetails.onlyInSistema.found.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-green-600 mb-4">
                      <CheckCircle className="h-5 w-5" />
                      Trackings del Sistema encontrados ({trackingDetails.onlyInSistema.found.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {trackingDetails.onlyInSistema.found.map((detail, i) => (
                        <TrackingCard key={`sistema-found-${i}`} detail={detail} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Realice la verificación de discrepancias desde la pestaña "Comparación"
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}