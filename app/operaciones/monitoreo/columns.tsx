import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Truck, CheckCircle, AlertCircle } from "lucide-react"
import { getPriorityClasses, getStatusClasses } from "./page"
import { Shipment } from "@/lib/types"

export type IShipment = {
  id: string
  trackingNumber: string
  recipientName: string
  recipientAddress: string
  recipientCity: string
  recipientZip: string
  recipientPhone: string
  commitDateTime: Date
  status: string
  priority: string
  shipmentType: string
  subsidiary: string
}

export const columns: ColumnDef<IShipment>[] = [
  {
    accessorKey: "trackingNumber",
    header: "Tracking",
    cell: ({ row }) => {
      const priority = row.original.priority
      return (
        <div className="flex items-center gap-2 font-medium">
          {priority === 'alta' && <AlertCircle className="h-4 w-4 text-red-500" />}
          {row.getValue("trackingNumber")}
        </div>
      )
    }
  },
  {
    accessorKey: "recipientName",
    header: "Destinatario",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.getValue("recipientName")}</div>
        <div className="text-sm text-muted-foreground">{row.original.recipientPhone}</div>
      </div>
    )
  },
  {
    accessorKey: "recipientAddress",
    header: "Dirección",
    cell: ({ row }) => (
      <div>
        <div>{row.getValue("recipientAddress")}</div>
        <div className="text-sm text-muted-foreground">
          {row.original.recipientCity}, {row.original.recipientZip}
        </div>
      </div>
    )
  },
  {
    accessorKey: "commitDateTime",
    header: "Fecha/Hora",
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {new Date(row.getValue("commitDateTime")).toLocaleString()}
      </div>
    )
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status")
      return (
          {
            accessorKey: "status",
            header: "Estado",
            cell: ({ row }) => {
              const status = row.getValue("status")
              return (
                  <Badge className={`${getStatusClasses(status)} flex items-center gap-1`}>
                  {status === 'EN_TRANSITO' && <Truck className="h-3 w-3" />}
                  {status === 'ENTREGADO' && <CheckCircle className="h-3 w-3" />}
                  {status}
                  </Badge>
              )
            }
        }
      )
    }
  },
  {
    accessorKey: "priority",
    header: "Prioridad",
    cell: ({ row }) => (
      <Badge className={getPriorityClasses(row.getValue("priority"))}>
        {row.getValue("priority")}
      </Badge>
    )
  },
  {
    accessorKey: "shipmentType",
    header: "Transportista"
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Actualizar estado</DropdownMenuItem>
            <DropdownMenuItem>Ver detalles</DropdownMenuItem>
            <DropdownMenuItem>Marcar problema</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">Reasignar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }
]