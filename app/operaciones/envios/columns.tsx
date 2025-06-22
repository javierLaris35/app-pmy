"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { Button } from "@/components/ui/button"
import { Check, CheckCircle, Eye, Minus, XCircle } from "lucide-react"
import { Shipment } from "@/lib/types"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export const columns: ColumnDef<Shipment>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "shipmentType",
    header: "Empresa",
    cell: ({ row }) => {
      const shipmentType: string = row.getValue("shipmentType");

      let color: string;
      
      switch (shipmentType) {
        case "fedex":
          color = "bg-blue-500";
          break;
        case "dhl":
          color = "bg-red-500";
          break;
      }

      return (
        <Badge className={`${color} text-white`}>
          {shipmentType.charAt(0).toUpperCase() + shipmentType.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "trackingNumber",
    header: ({ column }) => <DataTableColumnHeader column={column} title="No. Rastreo" />,
    cell: ({ row }) => <div className="font-medium">{row.getValue("trackingNumber")}</div>,
  },
  {
    accessorKey: "isChargePackage",
    header: " ",
    cell: ({ row }) => {
      const isChargePackage = row.getValue("isChargePackage") as boolean

      return isChargePackage ? (
        <Badge className="bg-emerald-500 text-white">Carga</Badge>
      ) : null
    },
  },
  {
    accessorKey: "recipientName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Destinatario" />,
  },
  {
    accessorKey: "recipientAddress",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Dirección" />,
  },
  {
    accessorKey: "recipientCity",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ciudad" />,
  },
  {
    accessorKey: "recipientZip",
    header: ({ column }) => <DataTableColumnHeader column={column} title="CP" />,
  },
  {
    accessorKey: "commitDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
  },
  {
    accessorKey: "commitTime",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Hora" />,
  },
  {
    accessorKey: "recipientPhone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Teléfono" />,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.getValue("status") as Shipment["status"]
      const statusMap = {
        recoleccion: { label: "Recolección", color: "bg-blue-50 text-blue-700 ring-blue-700/10" as const },
        pendiente: { label: "Pendiente", color: "bg-yellow-50 text-yellow-800 ring-yellow-600/20" as const },
        en_ruta: { label: "En Ruta", color: "bg-purple-50 text-purple-700 ring-purple-700/10" as const },
        entregado: { label: "Entregado", color: "bg-green-50 text-green-700 ring-green-600/20" as const },
        no_entregado: { label: "No Entregado", color: "destructive" as const },
      }
      const { label, color } = statusMap[status] || { label: "Desconocido", color: "default" as const }
      return <Badge className={color}>{label}</Badge>
    },
  },
  {
    accessorKey: "priority",
    header: "Prioridad",
    cell: ({ row }) => {
      const priority = row.getValue("priority");

      // Asignar colores según la prioridad
      let color: string;
      switch (priority) {
        case "alta":
          color = "bg-red-500"; // rojo para alta
          break;
        case "media":
          color = "bg-yellow-500"; // amarillo para media
          break;
        case "baja":
          color = "bg-green-500"; // verde para baja
          break;
        default:
          color = "bg-gray-500"; // gris por defecto
      }

      return (
        <Badge className={`${color} text-white`}>
          {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "payment",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Pago" />,
    cell: ({ row }) => {
      const payment = row.getValue("payment") as Shipment["payment"]
      if (!payment) return "N/A"
      const statusMap = {
        paid: { label: "Pagado", variant: "success" as const },
        pending: { label: "Pendiente", variant: "warning" as const },
        failed: { label: "Fallido", variant: "destructive" as const },
      }
      const { label, variant } = statusMap[payment.status] || { label: "Desconocido", variant: "default" as const }
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">${Number(payment.amount).toFixed(2)}</span>
          <Badge variant={variant}>{label}</Badge>
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => console.log("View timeline", row.original)}>
        <Eye className="h-4 w-4" />
      </Button>
    ),
  },
]

