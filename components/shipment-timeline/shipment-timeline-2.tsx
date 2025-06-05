import React from "react"
import {
  CheckCircle,
  Truck,
  Package,
  XCircle,
  CalendarClockIcon,
  PackageCheckIcon,
  TriangleAlertIcon,
  User,
  MapPin,
  Phone,
  Calendar,
  DollarSign,
} from "lucide-react"
import type { Shipment } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import Link from "next/link"

const statusMap = {
  recoleccion: { icon: Package, color: "text-blue-600", bgColor: "bg-blue-100", label: "Recolección" },
  en_ruta: { icon: Truck, color: "text-purple-600", bgColor: "bg-violet-100", label: "En Ruta" },
  entregado: { icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100", label: "Entregado" },
  no_entregado: { icon: XCircle, color: "text-red-600", bgColor: "bg-red-100", label: "No Entregado" },
} as const

const priorityMap = {
  alta: { color: "text-red-600", bgColor: "bg-red-100", label: "Alta" },
  media: { color: "text-yellow-600", bgColor: "bg-yellow-100", label: "Media" },
  baja: { color: "text-green-600", bgColor: "bg-green-100", label: "Baja" },
} as const

function StatusBadge({ status }: { status: keyof typeof statusMap }) {
  const { icon: Icon, color, bgColor, label } = statusMap[status]
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${bgColor} ${color} font-semibold`}>
      <Icon className="h-5 w-5" />
      {label}
    </div>
  )
}

function PriorityBadge({ priority }: { priority: keyof typeof priorityMap }) {
  const { color, bgColor, label } = priorityMap[priority]
  return (
    <Badge className={`${bgColor} ${color} border-none font-semibold`}>
      Prioridad: {label}
    </Badge>
  )
}

function PaymentInfo({ payment }: Shipment["payment"]) {
  if (!payment) return null
  const statusVariants = {
    paid: "success",
    pending: "warning",
    failed: "destructive",
  }
  const labelMap = {
    paid: "Pagado",
    pending: "Pendiente",
    failed: "Fallido",
  }
  const variant = statusVariants[payment.status] ?? "destructive"
  const label = labelMap[payment.status] ?? "Desconocido"
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">Información de Pago</p>
      <div className="flex items-center gap-2 mt-1">
        <DollarSign className="h-4 w-4 text-gray-400" />
        <span className="font-medium">${payment.amount.toFixed(2)}</span>
        <Badge variant={variant}>{label}</Badge>
      </div>
    </div>
  )
}

function RecipientInfo({ shipment }: { shipment: Shipment }) {
  return (
    <>
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
          <span>{shipment.commitDate} {shipment.commitTime}</span>
        </div>
      </div>
    </>
  )
}

function CurrentStatusDetails({ shipment }: { shipment: Shipment }) {
  if (shipment.status !== "entregado" && shipment.status !== "no_entregado") return null

  const entrega = shipment.statusHistory?.find(s => s.status === shipment.status)
  const fecha = entrega?.timestamp ? new Date(entrega.timestamp) : null

  return (
    <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-600 text-sm">
      <div className="flex items-center gap-1">
        <CalendarClockIcon className="h-4 w-4 text-gray-400" />
        <span>
          {`Fecha de ${shipment.status === "entregado" ? "Entrega" : "Actualización"}: ${
            fecha ? format(fecha, "dd-MM-yyyy HH:mm:ss") : "Fecha no disponible"
          }`}
        </span>
      </div>

      {shipment.status === "entregado" && shipment.receivedByName && (
        <div className="flex items-center gap-1">
          <PackageCheckIcon className="h-4 w-4 text-gray-400" />
          <span>{`Entregado a: ${shipment.receivedByName}`}</span>
        </div>
      )}

      {shipment.status === "no_entregado" && entrega?.notes && (
        <div className="flex items-center gap-1">
          <TriangleAlertIcon className="h-4 w-4 text-gray-400" />
          <span>{`Nota: ${entrega.notes}`}</span>
        </div>
      )}
    </div>
  )
}

function TimelineEntry({
  status,
  isActive,
  isCurrent,
  timestamp,
  notes,
  isNoEntregado,
  isEntregado,
}: {
  status: keyof typeof statusMap
  isActive: boolean
  isCurrent: boolean
  timestamp: Date | null
  notes?: string
  isNoEntregado: boolean
  isEntregado: boolean
}) {
  const { icon: Icon, color, label } = statusMap[status]

  return (
    <div className="relative flex items-start space-x-4 py-4">
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

        {isCurrent && !isEntregado && !isNoEntregado && (
          <Badge variant="outline" className="mt-1 text-xs">
            En progreso
          </Badge>
        )}

        {isNoEntregado && (
          <Badge variant="destructive" className="mt-1 text-xs">
            No se pudo entregar
          </Badge>
        )}
      </div>
    </div>
  )
}

export function ShipmentTimeline({ shipment }: { shipment: Shipment }) {
  const statuses = ["recoleccion", "en_ruta", "entregado", "no_entregado"] as const
  const currentStatusIndex = statuses.indexOf(shipment.status)

  const statusHistory =
    shipment.statusHistory ||
    statuses.slice(0, currentStatusIndex + 1).map((status) => ({
      status,
      timestamp: new Date().toISOString(),
      notes: "",
    }))

  return (
    <div className="space-y-6">
      {/* Información general */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Número de Rastreo</p>
              <Link
                href={`https://www.fedex.com/fedextrack/?trknbr=${shipment.trackingNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-bold text-blue-600 hover:text-blue-800 underline"
              >
                {shipment.trackingNumber}
              </Link>
            </div>

            {shipment.priority && <PriorityBadge priority={shipment.priority} />}
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
              <CurrentStatusDetails shipment={shipment} />
            </div>
          </div>

          <PaymentInfo payment={shipment.payment} />
        </section>

        <section className="space-y-4">
          <RecipientInfo shipment={shipment} />
        </section>
      </div>

      <Separator />

      {/* Timeline */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Historial de Seguimiento</h3>
        <div className="relative pl-16">
          {/* Línea vertical alineada con iconos */}
          <div className="absolute left-10 top-0 h-full w-0.5 bg-gray-200 -translate-x-1/2" />
          {statuses.map((status, idx) => {
            const isActive = idx <= currentStatusIndex
            const isCurrent = idx === currentStatusIndex
            const historyEntry = statusHistory.find((h) => h.status === status)
            const timestamp = historyEntry ? new Date(historyEntry.timestamp) : null
            const notes = historyEntry?.notes

            return (
              <TimelineEntry
                key={status}
                status={status}
                isActive={isActive}
                isCurrent={isCurrent}
                timestamp={timestamp}
                notes={notes}
                isNoEntregado={status === "no_entregado" && shipment.status === "no_entregado"}
                isEntregado={status === "entregado" && shipment.status === "entregado"}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}
