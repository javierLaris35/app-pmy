"use client"

import { History, Package, Truck, Warehouse, XCircleIcon } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MonitoringInfo } from "./shipment-tracking"
import { formatDate } from "@/utils/date.utils"
import { ShipmentHistoryModal } from "../envios/shipment-history-modal"
import { getStatusBadge } from "@/utils/shipment-status.utils"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"


export const columns: ColumnDef<MonitoringInfo>[] = [
  {
    id: "trackingNumber",
    accessorFn: (row) => row.shipmentData.trackingNumber,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tracking" />
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("trackingNumber")}</div>,
  },
  {
    id: "status",
    accessorFn: (row) => row.shipmentData.shipmentStatus,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const statusInfo = getStatusBadge(status)
      const StatusIcon = statusInfo.icon
      return (
        <Badge variant={statusInfo.variant} className={`whitespace-nowrap ${statusInfo.color}`}>
          <StatusIcon className="mr-1 h-3 w-3" />
          {statusInfo.label}
        </Badge>
      )
    },
  },
  {
    id: "commitDateTime",
    accessorFn: (row) => row.shipmentData.commitDateTime,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha Vencimiento" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("commitDateTime") as string;
      return <span className="font-medium">{formatDate(date)}</span>
    },
  },
  {
    id: "location",
    header: "Ubicación",
    accessorFn: (row) => row.shipmentData.shipmentStatus, // Necesario para que sea ocultable
    cell: ({ row }) => {
      const pkg = row.original
      const status = pkg.shipmentData.shipmentStatus.toLowerCase()
      
      if (status === "en_ruta" && pkg.packageDispatch?.vehicle) {
        return (
          <div className="text-sm">
            <div className="flex items-center gap-1">
              <Truck className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">En ruta</span>
            </div>
            <p className="text-xs text-muted-foreground">{pkg.packageDispatch.vehicle.name}</p>
          </div>
        )
      }
      if (status === "en_bodega") {
        return (
          <div className="text-sm">
            <div className="flex items-center gap-1">
              <Warehouse className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{pkg.shipmentData.subsidiary?.name || "Bodega"}</span>
            </div>
          </div>
        )
      }
      if (status === "entregado") {
        return (
          <div className="text-sm">
            <div className="flex items-center gap-1">
              <Package className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">Entregado</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {pkg.shipmentData.deliveryDate ? new Date(pkg.shipmentData.deliveryDate).toLocaleDateString() : ""}
            </p>
          </div>
        )
      }
      if (status === "no_entregado") {
        return (
          <div className="text-sm">
            <div className="flex items-center gap-1">
              <XCircleIcon className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">No Entregado</span>
            </div>
          </div>
        )
      }
      return <span className="text-sm text-muted-foreground">-</span>
    },
  },
  {
    id: "driver",
    accessorFn: (row) => row.packageDispatch?.driver,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Chofer" />
    ),
    cell: ({ row }) => {
      const pkg = row.original
      if (pkg.packageDispatch?.driver && pkg.packageDispatch?.vehicle) {
        return (
          <div className="text-sm">
            <p className="font-medium">{pkg.packageDispatch.driver}</p>
            <p className="text-xs text-muted-foreground">{pkg.packageDispatch.vehicle.plateNumber}</p>
          </div>
        )
      }
      return <span className="text-sm text-muted-foreground">-</span>
    },
  },
  {
    id: "destination",
    accessorFn: (row) => row.shipmentData.destination,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Destino" />
    ),
    cell: ({ row }) => <div className="text-sm">{row.getValue("destination")}</div>,
  },
  {
    id: "isChargePackage", // Sincronizado con el Toolbar
    accessorFn: (row) => row.shipmentData.isCharge,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Carga" />
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue("isChargePackage") ? "Sí" : "No"}</div>
    ),
  },
  {
    id: "payment",
    accessorFn: (row) => row.shipmentData.payment?.amount,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Pago" />
    ),
    cell: ({ row }) => {
      const pkg = row.original
      if (pkg.shipmentData.payment) {
        return (
          <Badge className="bg-blue-500 text-white whitespace-nowrap">
            {pkg.shipmentData.payment.type}: ${pkg.shipmentData.payment.amount.toFixed(2)}
          </Badge>
        )
      }
      return <span className="text-sm text-muted-foreground">-</span>
    },
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => {
      const pkg = row.original
      return (
        <div className="flex justify-end">
          <ShipmentHistoryModal
            shipmentId={pkg.shipmentData.id}
            trackingNumber={pkg.shipmentData.trackingNumber}
            trigger={
              <Button variant="ghost" className="h-8 w-8 p-0">
                <History className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      )
    },
  },
]