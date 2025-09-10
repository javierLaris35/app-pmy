"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Truck, Package, CheckCircle, AlertCircle, Clock, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { ShipmentType, ShipmentStatusType, Priority } from "@/lib/types"
import { AppLayout } from "@/components/app-layout"
import { withAuth } from '@/hoc/withAuth';

interface Shipment {
  id: string
  trackingNumber: string
  shipmentType: ShipmentType
  recipientName: string
  recipientAddress: string
  recipientCity: string
  recipientZip: string
  recipientPhone: string
  commitDateTime: Date
  status: ShipmentStatusType
  priority: Priority
  payment?: {
    method: string
    amount: number
    status: string
  }
  statusHistory: ShipmentStatus[]
  consNumber?: string
  receivedByName: string
  createdAt: Date
  subsidiary?: {
    name: string
  }
  consolidatedId?: string
}

interface ShipmentStatus {
  id: string
  status: ShipmentStatusType
  exceptionCode?: string
  timestamp: Date
  notes?: string
  createdAt: Date
  user?: string
}

export const getStatusVariant = (status: ShipmentStatusType) => {
    switch (status) {
      case ShipmentStatusType.ENTREGADO: return 'default'
      case ShipmentStatusType.EN_RUTA: return 'secondary'
      case ShipmentStatusType.PENDIENTE: return 'outline'
      default: return 'outline'
    }
  }

  export const getStatusLabel = (status: ShipmentStatusType) => {
    const statusLabels = {
      [ShipmentStatusType.ENTREGADO]: 'Entregado',
      [ShipmentStatusType.EN_RUTA]: 'En tránsito',
      [ShipmentStatusType.PENDIENTE]: 'Pendiente'
    }
    return statusLabels[status] || status
  }

  export const getPriorityVariant = (priority: Priority) => {
    switch (priority) {
      case Priority.ALTA: return 'destructive'
      case Priority.MEDIA: return 'warning'
      case Priority.BAJA: return 'default'
    }
  }

  export const getProgressPercentage = (shipment: Shipment) => {
    const now = Date.now()
    const start = new Date(shipment.createdAt).getTime()
    const end = new Date(shipment.commitDateTime).getTime()
    
    if (now >= end) return 100
    if (now <= start) return 0
    
    return Math.floor(((now - start) / (end - start)) * 100)
  }


function ShipmentMonitoringDashboard() {
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<ShipmentStatusType | 'all'>('all')

  // Datos de ejemplo - reemplaza con tus datos reales
  const shipments: Shipment[] = [
    {
      id: '1',
      trackingNumber: 'FEDEX123456789',
      shipmentType: ShipmentType.FEDEX,
      recipientName: 'María González',
      recipientAddress: 'Av. Principal 1234, Piso 5',
      recipientCity: 'Ciudad de México',
      recipientZip: '06500',
      recipientPhone: '55-1234-5678',
      commitDateTime: new Date('2023-11-20T14:00:00'),
      status: ShipmentStatusType.EN_TRANSITO,
      priority: Priority.ALTA,
      payment: {
        method: 'Tarjeta',
        amount: 450.50,
        status: 'Pagado'
      },
      statusHistory: [
        {
          id: '101',
          status: ShipmentStatusType.PENDIENTE,
          timestamp: new Date('2023-11-15T08:00:00'),
          notes: 'Envío registrado en sistema'
        },
        {
          id: '102',
          status: ShipmentStatusType.EN_TRANSITO,
          timestamp: new Date('2023-11-15T10:30:00'),
          notes: 'Recolección completada'
        }
      ],
      consNumber: 'CN12345',
      receivedByName: '',
      createdAt: new Date('2023-11-15T08:00:00'),
      subsidiary: {
        name: 'Centro'
      },
      consolidatedId: 'CONS-789'
    }
    // ... más envíos
  ]

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = shipment.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         shipment.recipientName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTab = activeTab === 'all' || shipment.status === activeTab
    
    return matchesSearch && matchesTab
  })

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4">
        {/* Columna izquierda - Lista de envíos */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Monitoreo</h1>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar envíos..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Filtros rápidos */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button 
              variant={activeTab === "all" ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveTab("all")}
            >
              Todos
            </Button>
            <Button 
              variant={activeTab === ShipmentStatusType.PENDIENTE ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveTab(ShipmentStatusType.PENDIENTE)}
            >
              <Clock className="h-4 w-4 mr-2" />
              Pendientes
            </Button>
            <Button 
              variant={activeTab === ShipmentStatusType.EN_RUTA ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveTab(ShipmentStatusType.EN_RUTA)}
            >
              <Truck className="h-4 w-4 mr-2" />
              En tránsito
            </Button>
            <Button 
              variant={activeTab === ShipmentStatusType.PENDIENTE ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveTab(ShipmentStatusType.PENDIENTE)}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Problemas
            </Button>
          </div>

          {/* Lista de envíos */}
          <ScrollArea className="h-[calc(100vh-180px)] rounded-md border">
            <div className="space-y-2 p-2">
              {filteredShipments.map((shipment) => (
                <Card 
                  key={shipment.id} 
                  className={`hover:bg-accent cursor-pointer transition-colors ${
                    selectedShipment?.id === shipment.id ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedShipment(shipment)}
                >
                  <CardHeader className="p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-lg font-mono">{shipment.trackingNumber}</CardTitle>
                        <p className="text-sm line-clamp-1">{shipment.recipientName}</p>
                        <p className="text-xs text-muted-foreground">{shipment.recipientCity}</p>
                      </div>
                      <Badge variant={getStatusVariant(shipment.status)} className="flex-shrink-0">
                        {shipment.status === ShipmentStatusType.EN_RUTA && <Truck className="h-3 w-3 mr-1" />}
                        {shipment.status === ShipmentStatusType.ENTREGADO && <CheckCircle className="h-3 w-3 mr-1" />}
                        {getStatusLabel(shipment.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Columna derecha - Detalles del envío */}
        <div className="lg:col-span-3 space-y-4">
          {selectedShipment ? (
            <>
              {/* Resumen del envío */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Envío #{selectedShipment.trackingNumber}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-sm">
                        {selectedShipment.shipmentType}
                      </Badge>
                      <Badge variant={getPriorityVariant(selectedShipment.priority)}>
                        {selectedShipment.priority}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Destinatario</h3>
                    <p className="font-medium">{selectedShipment.recipientName}</p>
                    <p className="text-sm text-muted-foreground">{selectedShipment.recipientPhone}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Dirección</h3>
                    <p className="text-sm">{selectedShipment.recipientAddress}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedShipment.recipientCity}, {selectedShipment.recipientZip}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Tiempo estimado</h3>
                    <Progress value={getProgressPercentage(selectedShipment)} className="h-2 mt-2" />
                    <p className="text-sm text-muted-foreground mt-1">
                      Compromiso: {new Date(selectedShipment.commitDateTime).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Historial de estados */}
              <Card>
                <CardHeader>
                  <CardTitle>Historial de Estados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedShipment.statusHistory?.map((status, index) => (
                      <div key={status.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`h-2 w-2 rounded-full mt-1 ${
                            status.status === ShipmentStatusType.ENTREGADO ? 'bg-green-500' : 
                            status.status === ShipmentStatusType.EN_RUTA ? 'bg-blue-500' : 'bg-amber-500'
                          }`} />
                          {index < selectedShipment.statusHistory.length - 1 && (
                            <div className="h-6 w-px bg-border" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <Badge variant={getStatusVariant(status.status)}>
                              {getStatusLabel(status.status)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(status.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {status.notes && (
                            <p className="text-sm mt-1">{status.notes}</p>
                          )}
                          {status.exceptionCode && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Código excepción: {status.exceptionCode}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Información adicional */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Información de Pago</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Método:</span>
                        <span>{selectedShipment.payment?.method || 'No especificado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Monto:</span>
                        <span>${selectedShipment.payment?.amount?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Estatus:</span>
                        <span>{selectedShipment.payment?.status || 'N/A'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Datos Adicionales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Consolidado ID:</span>
                        <span>{selectedShipment.consolidatedId || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Número CONS:</span>
                        <span>{selectedShipment.consNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Sucursal:</span>
                        <span>{selectedShipment.subsidiary?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Recibido por:</span>
                        <span>{selectedShipment.receivedByName || 'No recibido'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Seleccione un envío</CardTitle>
                <CardDescription>Haga clic en un envío de la lista para ver los detalles</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

export default withAuth(ShipmentMonitoringDashboard, 'operaciones.monitoreo')