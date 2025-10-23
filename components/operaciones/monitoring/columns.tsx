import { ArrowUpDown, Package, Truck, Warehouse, XCircleIcon } from "lucide-react"
import { Button } from "../../ui/button"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "../../ui/badge"
import { MonitoringInfo } from "./shipment-tracking"

const getStatusBadge = (status: string) => {
  const variants = {
    "entregado": { 
      label: "Entregado", 
      color: "bg-green-50 text-green-700 ring-green-600/20" as const,
      variant: "outline" as const,
      icon: Package
    },
    "no_entregado": { 
      label: "No Entregado", 
      color: "bg-red-50 text-red-700 ring-red-600/20" as const,
      variant: "destructive" as const,
      icon: XCircleIcon
    },
    "en_ruta": { 
      label: "En Ruta", 
      color: "bg-purple-50 text-purple-700 ring-purple-700/10" as const,
      variant: "default" as const,
      icon: Truck
    },
    "en_bodega": { 
      label: "En Bodega", 
      color: "bg-blue-50 text-blue-700 ring-blue-700/10" as const,
      variant: "secondary" as const,
      icon: Warehouse
    }
  } as Record<string, { label: string; color: string; variant: "secondary" | "default" | "outline" | "destructive"; icon: any }>

  // Convertir el status a minúsculas para que coincida con las claves
  const normalizedStatus = status.toLowerCase()
  
  return (
    variants[normalizedStatus] || {
      label: status || "Desconocido",
      color: "bg-gray-50 text-gray-700 ring-gray-700/10",
      variant: "secondary" as const,
      icon: Package,
    }
  )
}

export const columns: ColumnDef<MonitoringInfo>[] = [
  {
    id: "trackingNumber",
    accessorFn: (row) => row.shipmentData.trackingNumber,
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Tracking
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("trackingNumber")}</div>,
  },
  {
    id: "status",
    accessorFn: (row) => row.shipmentData.shipmentStatus,
    header: "Estado",
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
    id: "location",
    header: "Ubicación",
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
    header: "Chofer",
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
    id: "unloading",
    header: "Desembarque",
    cell: ({ row }) => {
      const pkg = row.original
      if (pkg.shipmentData.unloading) {
        return (
          <div className="text-sm">
            <p className="font-medium">{pkg.shipmentData.unloading.trackingNumber}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(pkg.shipmentData.unloading.date).toLocaleDateString()}
            </p>
          </div>
        )
      }
      return <span className="text-sm text-muted-foreground">-</span>
    },
  },
  {
    id: "consolidated",
    header: "Consolidado",
    cell: ({ row }) => {
      const pkg = row.original
      if (pkg.shipmentData.consolidated) {
        return (
          <div className="text-sm">
            <p className="font-medium">{pkg.shipmentData.consolidated.consNumber}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(pkg.shipmentData.consolidated.date).toLocaleDateString()}
            </p>
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
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Destino
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-sm">{row.getValue("destination")}</div>,
  },
  {
    id: "isCharge",
    accessorFn: (row) => row.shipmentData.isCharge,
    header: "Es Carga",
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue("isCharge") ? "Sí" : "No"}</div>
    ),
  },
  {
    id: "payment",
    header: "Pago",
    cell: ({ row }) => {
      const pkg = row.original
      if (pkg.shipmentData.payment && typeof pkg.shipmentData.payment.amount === "number") {
        return (
          <Badge className="bg-blue-500 text-white whitespace-nowrap">
            {pkg.shipmentData.payment.type}: ${pkg.shipmentData.payment.amount.toFixed(2)}
          </Badge>
        )
      }
      return <span className="text-sm text-muted-foreground">-</span>
    },
  },
]