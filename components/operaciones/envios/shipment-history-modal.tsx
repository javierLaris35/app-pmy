"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MapPin,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Building2,
  AlertCircle,
  PackageCheck,
  Calendar,
} from "lucide-react"
import { getHistoryById } from "@/lib/services/shipments"

interface ShipmentHistory {
  trackingNumber: string
  lastStatus: {
    code: string
    description: string
    city: string | null
    state: string | null
    country: string | null
    date: string | null
  } | null
  history: {
    date: string
    eventType: string
    description: string
    city: string | null
    state: string | null
    country: string | null
    postalCode: string | null
    derivedStatus: string | null
  }[]
}

interface ShipmentHistoryModalProps {
  shipmentId: string
  isCharge?: boolean
  trackingNumber: string
  trigger: React.ReactNode
}

const translateStatus = (status: string): string => {
  if (!status) return status

  const statusLower = status.toLowerCase()

  // Mapeo de estados comunes de FedEx
  const translations: Record<string, string> = {
    // Estados principales
    delivered: "Entregado",
    "in transit": "En tránsito",
    "out for delivery": "En reparto",
    "picked up": "Recolectado",
    "shipment information sent": "Información de envío enviada",
    "at fedex facility": "En instalación FedEx",
    "departed fedex location": "Salió de ubicación FedEx",
    "arrived at fedex location": "Llegó a ubicación FedEx",
    "in fedex possession": "En posesión de FedEx",
    "on fedex vehicle for delivery": "En vehículo FedEx para entrega",
    "delivery exception": "Excepción de entrega",
    "shipment exception": "Excepción de envío",
    "held at fedex location": "Retenido en ubicación FedEx",
    "customer not available": "Cliente no disponible",
    "delivery attempted": "Intento de entrega",
    "left at location": "Dejado en ubicación",
    "signed for by": "Firmado por",

    // Palabras clave individuales
    pickup: "Recolección",
    transit: "Tránsito",
    facility: "Instalación",
    vehicle: "Vehículo",
    delivery: "Entrega",
    departed: "Salió",
    arrived: "Llegó",
    exception: "Excepción",
    delayed: "Retrasado",
    scheduled: "Programado",
    attempted: "Intentado",
    held: "Retenido",
    location: "Ubicación",
    package: "Paquete",
    shipment: "Envío",
  }

  // Buscar coincidencia exacta primero
  for (const [key, value] of Object.entries(translations)) {
    if (statusLower === key) {
      return value
    }
  }

  // Si no hay coincidencia exacta, buscar palabras clave y reemplazar
  let translated = status
  for (const [key, value] of Object.entries(translations)) {
    const regex = new RegExp(key, "gi")
    translated = translated.replace(regex, value)
  }

  return translated
}

export function ShipmentHistoryModal({ shipmentId, trackingNumber, trigger, isCharge }: ShipmentHistoryModalProps) {
  const [history, setHistory] = useState<ShipmentHistory | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getHistoryById(shipmentId, isCharge ?? false)
        setHistory(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar el historial")
      } finally {
        setIsLoading(false)
      }
    }

    if (shipmentId) {
      fetchHistory()
    }
  }, [shipmentId])

  const getEventIcon = (eventType: string, description: string) => {
    const type = eventType?.toLowerCase() || ""
    const desc = description?.toLowerCase() || ""

    if (type.includes("delivered") || desc.includes("delivered") || desc.includes("entregado")) {
      return <CheckCircle2 className="h-4 w-4" />
    }
    if (
      type.includes("transit") ||
      desc.includes("transit") ||
      desc.includes("tránsito") ||
      desc.includes("vehicle") ||
      desc.includes("vehículo")
    ) {
      return <Truck className="h-4 w-4" />
    }
    if (type.includes("pickup") || desc.includes("pickup") || desc.includes("recolect")) {
      return <PackageCheck className="h-4 w-4" />
    }
    if (type.includes("facility") || desc.includes("facility") || desc.includes("instalación")) {
      return <Building2 className="h-4 w-4" />
    }
    return <Package className="h-4 w-4" />
  }

  const getStatusColor = (status: string | null) => {
    if (!status) return "bg-muted text-muted-foreground"
    const statusLower = status.toLowerCase()
    if (statusLower.includes("delivered") || statusLower.includes("entregado")) {
      return "bg-chart-4/20 text-chart-4 border-chart-4/30"
    }
    if (
      statusLower.includes("transit") ||
      statusLower.includes("tránsito") ||
      statusLower.includes("vehicle") ||
      statusLower.includes("vehículo")
    ) {
      return "bg-chart-2/20 text-chart-2 border-chart-2/30"
    }
    if (
      statusLower.includes("pickup") ||
      statusLower.includes("recolect") ||
      statusLower.includes("facility") ||
      statusLower.includes("instalación")
    ) {
      return "bg-chart-1/20 text-chart-1 border-chart-1/30"
    }
    return "bg-muted text-muted-foreground border-border"
  }

  const getStatistics = () => {
    if (!history?.history.length) return null

    const firstEvent = new Date(history.history[history.history.length - 1].date)
    const lastEvent = new Date(history.history[0].date)
    const daysInTransit = Math.floor((lastEvent.getTime() - firstEvent.getTime()) / (1000 * 60 * 60 * 24))

    const lastStatusCode = history.lastStatus?.code?.toLowerCase() || ""
    const lastStatusDesc = history.lastStatus?.description?.toLowerCase() || ""
    const isDelivered =
      lastStatusCode.includes("delivered") ||
      lastStatusDesc.includes("delivered") ||
      lastStatusDesc.includes("entregado")

    return {
      totalEvents: history.history.length,
      daysInTransit: daysInTransit > 0 ? daysInTransit : 0,
      isDelivered,
    }
  }

  const stats = getStatistics()

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-base font-semibold">Historial de Envío</div>
              <div className="text-xs font-normal text-muted-foreground">{trackingNumber}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {!isLoading && !error && stats && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Card className="border-border/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Días en tránsito</span>
                </div>
                <div className="text-xl font-bold">{stats.daysInTransit}</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Total eventos</span>
                </div>
                <div className="text-xl font-bold">{stats.totalEvents}</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                  {stats.isDelivered ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-chart-4" />
                  ) : (
                    <Truck className="h-3.5 w-3.5 text-chart-2" />
                  )}
                  <span className="text-xs font-medium">Estado</span>
                </div>
                <div className="text-sm font-semibold">{stats.isDelivered ? "Entregado" : "En tránsito"}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="mt-3 border-0">
          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-3 w-40 mt-1.5" />
                </div>
                <div>
                  <Skeleton className="h-4 w-32 mb-3" />
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-2.5 rounded-full bg-destructive/10 mb-3">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="font-semibold text-base mb-1.5">Error al cargar historial</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            ) : history ? (
              <div className="space-y-4">
                {history.lastStatus && (
                  <div className="pb-4 border-b border-border">
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      Estado Actual
                    </h3>
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2 rounded-lg ${getStatusColor(history.lastStatus.code)} border`}>
                        {getEventIcon(history.lastStatus.code, history.lastStatus.description)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={`${getStatusColor(history.lastStatus.code)} border font-medium text-xs`}>
                            {translateStatus(history.lastStatus.description)}
                          </Badge>
                          {history.lastStatus.code && (
                            <span className="text-xs text-muted-foreground font-mono">{history.lastStatus.code}</span>
                          )}
                        </div>
                        {history.lastStatus.date && (
                          <p className="text-xs text-muted-foreground mb-0.5">
                            {new Date(history.lastStatus.date).toLocaleString("es-ES", {
                              dateStyle: "full",
                              timeStyle: "short",
                            })}
                          </p>
                        )}
                        {history.lastStatus.city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span>
                              {history.lastStatus.city}
                              {history.lastStatus.state && `, ${history.lastStatus.state}`}
                              {history.lastStatus.country && `, ${history.lastStatus.country}`}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    Línea de Tiempo
                  </h3>
                  <div className="relative">
                    <div className="absolute left-[16px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-muted to-transparent" />

                    {history.history.map((event, index) => {
                      const isFirst = index === 0

                      return (
                        <div
                          key={index}
                          className="mb-3 relative group animate-in fade-in slide-in-from-left-4 flex gap-2.5"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex-shrink-0 relative z-10">
                            <div
                              className={`p-1.5 rounded-full border-2 bg-background transition-all group-hover:scale-110 ${
                                isFirst ? "border-primary shadow-lg shadow-primary/20" : "border-border"
                              }`}
                            >
                              <div className={isFirst ? "text-primary" : "text-muted-foreground"}>
                                {getEventIcon(event.eventType, event.description)}
                              </div>
                            </div>
                          </div>

                          <Card
                            className={`flex-1 border-border/50 transition-all group-hover:border-primary/30 group-hover:shadow-md ${
                              isFirst ? "border-primary/30 shadow-sm" : ""
                            }`}
                          >
                            <CardContent className="p-2.5">
                              <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge className={`${getStatusColor(event.eventType)} border text-xs font-medium`}>
                                    {translateStatus(event.description)}
                                  </Badge>
                                  {event.eventType && (
                                    <span className="text-xs text-muted-foreground font-mono">{event.eventType}</span>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(event.date).toLocaleString("es-ES", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>

                              {(event.city || event.state || event.country) && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span>
                                    {event.city}
                                    {event.state && `, ${event.state}`}
                                    {event.country && `, ${event.country}`}
                                    {event.postalCode && ` - CP: ${event.postalCode}`}
                                  </span>
                                </p>
                              )}

                              {event.derivedStatus && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Estado derivado:{" "}
                                  <span className="font-medium font-mono">{translateStatus(event.derivedStatus)}</span>
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-2.5 rounded-full bg-muted mb-3">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-base mb-1.5">Sin historial disponible</h3>
                <p className="text-sm text-muted-foreground">No hay datos de historial para este envío</p>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
