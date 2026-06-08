"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { X, ChevronRight, ChevronDown, Layers, User, MapPin } from "lucide-react"
import { InboundShipment } from "./inbound-package"

// Funciones de ayuda para fechas
const isToday = (date: Date) => new Date().toDateString() === new Date(date).toDateString()
const isTomorrow = (date: Date) => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toDateString() === new Date(date).toDateString()
}

// Interfaz para las funciones que pasaremos desde el componente principal
interface ColumnActions {
  handleRemovePackage: (id: string) => void;
}

export const getColumns = ({ handleRemovePackage }: ColumnActions): ColumnDef<InboundShipment>[] => [
  {
    accessorKey: "trackingNumber",
    header: "Guía / Remesa",
    cell: function CellComponent({ row }) {
      const pkg = row.original;
      const hasPieces = (pkg.pieces && pkg.pieces.length > 0) || (pkg.existingPieces && pkg.existingPieces.length > 0);

      return (
        <div className="flex flex-col gap-0.5 w-full">
          <span className="font-mono text-[14px] font-bold text-slate-900 tracking-tight">
            {pkg.trackingNumber}
          </span>
          { pkg.dhlUniqueId && (
            <span className="font-mono text-slate-500">
              {pkg.dhlUniqueId}
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: "subsidiary",
    accessorFn: (row) => row.subsidiary, 
    header: "Destino",
    cell: ({ row }) => {
      const pkg = row.original;
      return (
        <div className="text-slate-600 flex flex-col gap-0.5">
          <span className="font-bold text-slate-800">{pkg.subsidiary?.name || "S/N"}</span>
          <span className="font-mono text-slate-500">
            CP: <span className="font-bold text-slate-700">{pkg.recipientZip}</span>
          </span>
        </div>
      )
    },
    filterFn: (row, id, value: string[]) => {
      const rowValue = row.getValue(id) as string
      return value.includes(rowValue)
    },
  },
  {
    id: "shipmentType",
    accessorKey: "shipmentType",
    header: "Carrier",
    cell: ({ row }) => {
      const type = (row.getValue("shipmentType") as string) || ""; 
      if (type.toLowerCase() === 'fedex') {
        return <Badge className="bg-[#4d148c] text-white hover:bg-[#4d148c]/90 text-[12px] border-none shadow-sm uppercase font-bold tracking-wider">FedEx</Badge>
      }
      if (type.toLowerCase() === 'dhl') {
        return <Badge className="bg-[#ffcc00] text-[#d40511] hover:bg-[#ffcc00]/90 text-[12px] border-none shadow-sm uppercase font-bold tracking-wider">DHL</Badge>
      }
      return <Badge variant="outline" className="text-[12px] uppercase font-bold text-slate-600">{type}</Badge>
    },
    filterFn: (row, id, value: string[]) => {
      const rowValue = (row.getValue(id) as string).toLowerCase()
      return value.includes(rowValue)
    },
  },
  {
    id: "recipientName",
    header: "Destinatario",
    cell: ({ row }) => {
      const pkg = row.original;
      return (
        <div className="flex flex-col gap-1 py-1 min-w-[150px] max-w-[220px]">
          <div className="flex items-start gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-800 leading-tight truncate" title={pkg.recipientName}>
              {pkg.recipientName || "Sin Nombre"}
            </span>
          </div>
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-slate-500 leading-snug line-clamp-2" title={pkg.recipientAddress}>
              {pkg.recipientAddress || "Dirección no disponible"}
            </span>
          </div>
        </div>
      )
    }
  },
  {
    id: "alertas",
    header: "Etiquetas",
    cell: ({ row }) => {
      const pkg = row.original;
      return (
        <div className="flex gap-1.5 flex-wrap max-w-[150px]">
          {isToday(pkg.commitDateTime) && <Badge className="font-bold text-[10px] px-1.5 py-0.5 bg-red-600 text-white hover:bg-red-700 shadow-sm border-none">Vence Hoy</Badge>}
          {isTomorrow(pkg.commitDateTime) && <Badge variant="secondary" className="font-bold text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-700 border-orange-200 border hover:bg-orange-100 shadow-sm">Vence Mañana</Badge>}
          {pkg.isHighValue && <Badge variant="secondary" className="font-bold text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border-purple-200 border hover:bg-purple-100 shadow-sm">Alto Valor</Badge>}
          {pkg.isCharge && <Badge variant="secondary" className="font-bold text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200 border hover:bg-blue-100 shadow-sm">Carga</Badge>}
          {pkg.hasPayment && <Badge className="font-bold text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border-amber-300 border hover:bg-amber-100 shadow-sm" variant="secondary">
            Cobro: ${Number(pkg.paymentAmount).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </Badge>}
        </div>
      )
    }
  },
  {
    id: "acciones",
    header: () => <div className="text-right">Acciones</div>,
    cell: ({ row }) => {
      return (
        <div className="text-right">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* AQUI SE EJECUTA LA FUNCIÓN QUE PASAMOS POR PARÁMETRO */}
                <Button variant="ghost" size="icon" onClick={() => handleRemovePackage(row.original.id)} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-red-600 text-white border-none text-xs">Eliminar Registro</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )
    }
  }
];