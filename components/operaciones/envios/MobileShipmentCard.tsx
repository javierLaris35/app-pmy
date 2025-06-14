import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Shipment } from "@/lib/types"
import {
  Truck,
  Phone,
  CalendarDays,
  MapPin,
  User,
  PackageCheck,
  AlertTriangle,
  Clock,
  TruckIcon,
  PackageCheckIcon,
  ChevronDownIcon,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const statusColors = {
  recoleccion: "bg-yellow-200 text-yellow-800",
  en_ruta: "bg-blue-200 text-blue-800",
  entregado: "bg-green-200 text-green-800",
  no_entregado: "bg-red-200 text-red-800",
} as const

const paymentColors = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
} as const

const priorityLabels = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
} as const

const shipmentIcons = {
  fedex: <TruckIcon className="w-4 h-4 text-purple-600" />,
  dhl: <PackageCheckIcon className="w-4 h-4 text-yellow-500" />,
} as const

type Props = {
  shipment: Shipment
  onViewTimeline?: (shipment: Shipment) => void
}

export function MobileShipmentCard({ shipment, onViewTimeline }: Props) {
  return (
    <Card className="mb-4 shadow-md">
      <CardHeader className="p-4 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {shipment.recipientName}
            </h3>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <User className="w-4 h-4" /> {shipment.receivedByName}
            </p>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <span
              className={`px-2 py-1 text-xs rounded-full font-medium ${statusColors[shipment.status]}`}
            >
              {shipment.status.replace("_", " ").toUpperCase()}
            </span>
            {shipment.priority && (
              <Badge variant="outline" className="text-xs">
                Prioridad: {priorityLabels[shipment.priority]}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          {shipment.shipmentType ? shipmentIcons[shipment.shipmentType] : <Truck className="w-4 h-4" />}
          <span>{shipment.shipmentType?.toUpperCase() ?? "Otro"}</span>
        </div>

        <div className="flex items-center gap-2">
          <PackageCheck className="w-4 h-4" />
          <span className="font-medium">Tracking:</span>
          {shipment.trackingNumber}
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 mt-1" />
          <span>
            {shipment.recipientAddress}, {shipment.recipientCity}, {shipment.recipientZip}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4" />
          <span>{shipment.recipientPhone}</span>
        </div>

        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          <span>
            Compromiso: {shipment.commitDate} {shipment.commitTime}
          </span>
        </div>


        {shipment.payment && (
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 text-xs rounded ${paymentColors[shipment.payment.status]}`}
            >
              Pago: {shipment.payment.status} - $
              {typeof shipment.payment.amount === "number"
              ? shipment.payment.amount.toFixed(2)
              : shipment.payment.amount}
            </span>
          </div>
        )}

        {shipment.status === "no_entregado" && (
          <div className="flex items-center text-red-600 gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>No entregado</span>
          </div>
        )}

        {shipment.statusHistory && shipment.statusHistory.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground">
              <ChevronDownIcon className="h-4 w-4" />
              Ver historial
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1 text-sm text-muted-foreground">
              {shipment.statusHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-2">
                    <Clock className="w-4 h-4 mt-0.5 text-gray-500" />
                    <div>
                      <span className="font-medium">
                        {h.status.replace("_", " ")}
                      </span>{" "}
                      en {new Date(h.timestamp).toLocaleString()}
                      {h.notes && <div className="text-gray-500">Nota: {h.notes}</div>}
                    </div>
                  </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={() => onViewTimeline?.(shipment)}
        >
          Ver Timeline
        </Button>
      </CardContent>
    </Card>
  )
}
