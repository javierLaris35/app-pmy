import { ArrowUpDown, Package, Truck, Warehouse } from "lucide-react"
import { Button } from "../../ui/button"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "../../ui/badge"
import { MonitoringInfo } from "./shipment-tracking"

const getStatusBadge = (ubication: string) => {
  const variants = {
    "EN BODEGA": { variant: "secondary" as const, label: "En Bodega", icon: Warehouse },
    "EN RUTA": { variant: "default" as const, label: "En Ruta", icon: Truck },
    ENTREGADO: { variant: "outline" as const, label: "Entregado", icon: Package },
  } as Record<string, { variant: "secondary" | "default" | "outline"; label: string; icon: any }>

  return (
    variants[ubication.toUpperCase()] || {
      variant: "secondary" as const,
      label: ubication || "Desconocido",
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
    id: "ubication",
    accessorFn: (row) => row.shipmentData.ubication,
    header: "Estado",
    cell: ({ row }) => {
      const ubication = row.getValue("ubication") as string
      const statusInfo = getStatusBadge(ubication)
      const StatusIcon = statusInfo.icon
      return (
        <Badge variant={statusInfo.variant} className="whitespace-nowrap">
          <StatusIcon className="mr-1 h-3 w-3" />
          {statusInfo.label}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: "location",
    header: "Ubicación",
    cell: ({ row }) => {
      const pkg = row.original
      const ubication = pkg.shipmentData.ubication.toUpperCase()
      if (ubication === "EN RUTA" && pkg.packageDispatch?.vehicle) {
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
      if (ubication === "EN BODEGA" && pkg.packageDispatch?.subsidiary) {
        return (
          <div className="text-sm">
            <div className="flex items-center gap-1">
              <Warehouse className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{pkg.packageDispatch.subsidiary.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">ID: {pkg.packageDispatch.subsidiary.id}</p>
          </div>
        )
      }
      if (ubication === "ENTREGADO") {
        return (
          <div className="text-sm">
            <div className="flex items-center gap-1">
              <Package className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">Entregado</span>
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
]