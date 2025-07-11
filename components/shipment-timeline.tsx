import React from "react"
import {
  CheckCircle,
  Clock,
  Truck,
  Package,
  XCircle,
  AlertTriangle,
  MapPin,
  DollarSign,
  User,
  Phone,
  Calendar,
  CalendarClockIcon,
  PackageCheckIcon,
  TriangleAlertIcon,
  AlertCircleIcon,
  CircleAlertIcon,
} from "lucide-react"
import type { Shipment } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import Link from "next/link"

const statusMap = {
  recoleccion: { icon: Package, color: "text-blue-500", bgColor: "bg-blue-100", label: "Recolección" },
  en_ruta: { icon: Truck, color: "text-purple-500", bgColor: "bg-violet-100", label: "En Ruta" },
  entregado: { icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-100", label: "Entregado" },
  no_entregado: { icon: XCircle, color: "text-red-500", bgColor: "bg-red-100", label: "No Entregado" },
  pendiente: { icon: CircleAlertIcon, color: "text-yellow-500", bgColor: "bg-yellow-100", label: "Pendiente" },
  desconocido: { icon: AlertCircleIcon, color: "text-black-500", bgColor: "bg-gray-100", label: "Desconocido" },
} as const

const priorityMap = {
  alta: { color: "text-red-500", bgColor: "bg-red-100", label: "Alta" },
  media: { color: "text-yellow-500", bgColor: "bg-yellow-100", label: "Media" },
  baja: { color: "text-green-500", bgColor: "bg-green-100", label: "Baja" },
} as const

export function ShipmentTimeline({ shipment }: { shipment: Shipment }) {
  const statuses = ["recoleccion", "en_ruta", "entregado", "no_entregado", "desconocido"] as const
  const currentStatusIndex = statuses.indexOf(shipment.status)

  // Get the status history or create a default one if not provided
  const statusHistory =
    shipment.statusHistory ||
    statuses.slice(0, currentStatusIndex + 1).map((status) => ({
      status,
      timestamp: new Date().toISOString(),
      notes: "",
    }))

  return (
    <div className="space-y-6">
      {/* Información general del envío */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Número de Rastreo</p>
              <Link
                href={`https://www.fedex.com/fedextrack/?trknbr=${shipment.trackingNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-bold text-blue-600 hover:text-blue-800 no-underline"
              >
                {shipment.trackingNumber}
              </Link>
            </div>
            {shipment.priority && (
              <Badge
                className={`${priorityMap[shipment.priority].bgColor} ${priorityMap[shipment.priority].color} border-none`}
              >
                Prioridad: {priorityMap[shipment.priority].label}
              </Badge>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">Estado Actual</p>
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded-full ${statusMap[shipment.status].bgColor}`}>
                  {React.createElement(statusMap[shipment.status].icon, {
                    className: `h-5 w-5 ${statusMap[shipment.status].color}`,
                  })}
                </div>
                <span className={`font-medium ${statusMap[shipment.status].color}`}>
                  {statusMap[shipment.status].label}
                </span>
              </div>

              {(shipment.status === 'entregado' || shipment.status === 'no_entregado') && (
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  {(() => {
                    const entrega = shipment.statusHistory?.find(status => status.status === shipment.status);
                    const fecha = entrega?.timestamp ? new Date(entrega.timestamp) : null;
                    
                    return (
                      <>
                        <div className="flex items-center gap-1">
                          <CalendarClockIcon className="h-4 w-4 inline-block text-gray-400"/>
                          <span className="text-sm text-gray-600">
                            {`Fecha de ${shipment.status === 'entregado' ? 'Entrega' : 'Actualización'}: ${
                              fecha
                                ? format(fecha, 'dd-MM-yyyy HH:mm:ss')
                                : 'Fecha no disponible'
                            }`}
                          </span>
                        </div>

                        {shipment.status === 'entregado' && shipment.receivedByName && (
                          <div className="flex items-center gap-1">
                            <PackageCheckIcon className="h-4 w-4 inline-block text-gray-400"/>
                            <span className="text-sm text-gray-600">
                              {`Entregado a: ${shipment.receivedByName}`}
                            </span>
                          </div>
                        )}

                        {shipment.status === 'no_entregado' && entrega?.notes && (
                          <div className="flex items-center gap-1">
                            <TriangleAlertIcon className="h-4 w-4 inline-block text-gray-400"/>
                            <span className="text-sm text-gray-600">
                              {`Nota: ${entrega.notes}`}
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>


          {shipment.payment && (
            <div>
              <p className="text-sm font-medium text-gray-500">Información de Pago</p>
              <div className="flex items-center gap-2 mt-1">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="font-medium">${shipment.payment.amount}</span>
                <Badge
                  variant={
                    shipment.payment.status === "paid"
                      ? "success"
                      : shipment.payment.status === "pending"
                        ? "warning"
                        : "destructive"
                  }
                >
                  {shipment.payment.status === "paid"
                    ? "Pagado"
                    : shipment.payment.status === "pending"
                      ? "Pendiente"
                      : "Fallido"}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-gray-500">Destinatario</p>
            <div className="flex items-center gap-2 mt-1">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{shipment.recipientName}</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">Dirección de Entrega</p>
            <div className="flex items-start gap-2 mt-1">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
              <span>
                {shipment.recipientAddress}, {shipment.recipientCity}, CP {shipment.recipientZip}
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">Teléfono</p>
            <div className="flex items-center gap-2 mt-1">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{shipment.recipientPhone}</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">Fecha y Hora Compromiso</p>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>
                {shipment.commitDate} {shipment.commitTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Línea de tiempo del envío */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Historial de Seguimiento</h3>
        <div className="relative">
          <div className="absolute left-5 top-0 h-full w-0.5 bg-gray-200"></div>
          {statuses.map((status, index) => {
            const { icon: Icon, color, label } = statusMap[status]
            const isActive = index <= currentStatusIndex
            const isCurrentStatus = index === currentStatusIndex

            // Find the history entry for this status
            const historyEntry = statusHistory.find((h) => h.status === status)
            const timestamp = historyEntry ? new Date(historyEntry.timestamp) : null
            const notes = historyEntry?.notes

            return (
              <div key={status} className="relative flex items-start space-x-4 py-4">
                <div
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${
                    isActive ? "bg-white shadow-md" : "bg-gray-100"
                  }`}
                >
                  <Icon className={`h-6 w-6 ${isActive ? color : "text-gray-400"}`} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isActive ? "text-gray-900" : "text-gray-500"}`}>{label}</p>
                  {isActive && timestamp && (
                    <p className="text-xs text-gray-500">
                      {timestamp.toLocaleDateString()} {timestamp.toLocaleTimeString()}
                    </p>
                  )}
                  {notes && <p className="text-xs italic text-gray-500 mt-1">{notes}</p>}
                  {isCurrentStatus && shipment.status !== "no_entregado" && shipment.status !== "entregado" && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      En progreso
                    </Badge>
                  )}
                  {status === "no_entregado" && shipment.status === "no_entregado" && (
                    <Badge variant="destructive" className="mt-1 text-xs">
                      No se pudo entregar
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
