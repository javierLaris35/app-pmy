import {
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { JSX } from "react"
import { DataTable } from "../data-table/data-table"
import { ColumnDef } from "@tanstack/react-table"


interface ShipmentItem {
  trackingNumber: string
  date: string
  cost: number
  type: string
  shipmentType: string
  status: string
}

export function ShipmentDetailDialog({ row }: { row: any }) {
  const items = row.original.items ?? []

  const renderTypeBadge = (type: string) => (
    <Badge variant="outline" className="gap-1">
      <Package className="h-3 w-3" />
      {type}
    </Badge>
  )

  const renderShipmentTypeBadge = (shipmentType: string) => (
    <Badge variant="outline" className="gap-1">
      <Truck className="h-3 w-3" />
      {shipmentType}
    </Badge>
  )

  const renderStatusBadge = (status: string) => {
    const normalized = status.toLowerCase()
    const statusMap: Record<string, { label: string; icon: JSX.Element }> = {
      entregado: {
        label: "Entregado",
        icon: <CheckCircle className="h-3 w-3 text-green-600" />
      },
      pendiente: {
        label: "Pendiente",
        icon: <Clock className="h-3 w-3 text-yellow-600" />
      },
      error: {
        label: "Error",
        icon: <AlertTriangle className="h-3 w-3 text-red-600" />
      },
      cancelado: {
        label: "Cancelado",
        icon: <XCircle className="h-3 w-3 text-gray-500" />
      }
    }

    const fallback = {
      label: status,
      icon: <AlertTriangle className="h-3 w-3 text-muted-foreground" />
    }

    const badge = statusMap[normalized] ?? fallback

    return (
      <Badge variant="outline" className="gap-1">
        {badge.icon}
        {badge.label}
      </Badge>
    )
  }

  const shipmentColumns: ColumnDef<ShipmentItem>[] = [
    {
      accessorKey: "trackingNumber",
      header: "Tracking",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("trackingNumber")}</span>
      )
    },
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {format(new Date(row.getValue("date")), "dd MMM yyyy", { locale: es })}
        </span>
      )
    },
    {
      accessorKey: "cost",
      header: "Costo",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          ${Number(row.getValue("cost")).toFixed(2)}
        </span>
      )
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => renderTypeBadge(row.getValue("type"))
    },
    {
      accessorKey: "shipmentType",
      header: "Paquetería",
      cell: ({ row }) => renderShipmentTypeBadge(row.getValue("shipmentType"))
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => renderStatusBadge(row.getValue("status"))
    }
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ver detalles">
          <Eye className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Detalle de Envíos ({items.length})</DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
        ) : (
          <div className="max-h-[80vh] overflow-y-auto p-1">
            <DataTable
              columns={shipmentColumns}
              data={items}
              searchKey="trackingNumber"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}