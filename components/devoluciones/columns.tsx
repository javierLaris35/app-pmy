import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, MapPin, User } from "lucide-react"
import { SHIPMENT_REASONS } from "@/lib/constants"
import { ReturnValidaton } from "@/lib/types"

export const getUnifiedColumns = (onRemove: (id: string) => void): ColumnDef<ReturnValidaton>[] => [
  {
    accessorKey: "trackingNumber",
    header: () => <span className="text-xs font-black uppercase tracking-widest text-slate-500">Guía</span>,
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="font-mono font-black text-primary tracking-tighter text-base leading-none">
          {row.getValue("trackingNumber")}
        </span>
        <Badge variant="outline" className="w-fit text-[10px] px-1.5 h-5 uppercase bg-slate-50 border-slate-200 font-bold text-slate-600">
          {row.original.status?.replace(/_/g, ' ')}
        </Badge>
      </div>
    )
  },
  {
    accessorKey: "recipientName",
    header: () => <span className="text-xs font-black uppercase tracking-widest text-slate-500">Destinatario</span>,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="font-black text-sm uppercase text-slate-800 flex items-center gap-1">
          <User size={12} className="text-primary" />
          {row.getValue("recipientName") || "N/A"}
        </div>
        <div className="text-xs font-bold text-slate-500 ml-4">
          {row.original.recipientPhone}
        </div>
      </div>
    )
  },
  {
    accessorKey: "recipientAddress",
    header: () => <span className="text-xs font-black uppercase tracking-widest text-slate-500">Dirección de Entrega</span>,
    cell: ({ row }) => (
      <div className="max-w-[280px] flex flex-col gap-0.5">
        <div className="text-xs leading-tight uppercase font-medium text-slate-700 flex items-start gap-1">
          <MapPin size={12} className="text-secondary shrink-0 mt-0.5" />
          <span className="line-clamp-2">{row.getValue("recipientAddress")}</span>
        </div>
        <div className="text-[10px] text-slate-400 uppercase font-black ml-4">
          CP: {row.original.recipientZip}
        </div>
      </div>
    )
  },
  {
    accessorKey: "reason",
    header: () => <span className="text-xs font-black uppercase tracking-widest text-slate-500">Motivo DEX/STAT</span>,
    cell: ({ row }) => (
      <Select defaultValue={row.original.status}>
        <SelectTrigger className="h-9 text-xs w-[210px] bg-white border-slate-200 font-bold focus:ring-primary">
          <SelectValue placeholder="Seleccionar motivo..." />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SHIPMENT_REASONS).map(([key, label]) => (
            <SelectItem key={key} value={key} className="text-xs font-medium uppercase">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onRemove(row.original.id)} 
          className="h-10 w-10 text-slate-300 hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Trash2 size={18} />
        </Button>
      </div>
    )
  }
]