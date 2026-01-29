import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Truck, Box, DollarSign, TrendingUp, TrendingDown } from "lucide-react"
import { NewIncome } from "@/lib/types"
import { formatCurrency, parseCurrency } from "@/lib/utils"
import { ShipmentDetailDialog } from "@/components/modals/shipment-detial-dialog"
import { createSelectColumn } from "@/components/data-table/columns"

export const columns: ColumnDef<NewIncome>[] = [
  createSelectColumn<NewIncome>(),
  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => {
      const dateStr = row.getValue("date") as string;
      const formattedDate = dateStr?.split("T")[0].split("-").reverse().join("/");
      return (
        <div className="flex items-center gap-2 font-medium whitespace-nowrap">
          <Calendar className="h-4 w-4 text-slate-400" />
          {formattedDate}
        </div>
      )
    }
  },
  {
    id: "fedex_metrics",
    header: "FedEx (POD/DEX07/DEX08)",
    cell: ({ row }) => {
      const f = row.original.fedex;
      return (
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-green-700">{f?.pod}</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-orange-600">{f?.dex07}</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-orange-800">{f?.dex08}</span>
          <Badge variant="secondary" className="ml-2 bg-blue-50 text-blue-700 border-blue-100">
            Total: {f?.total}
          </Badge>
        </div>
      )
    }
  },
  {
    id: "fedex_income",
    header: "Ingreso FedEx",
    cell: ({ row }) => (
      <div className="text-sm font-medium">
        {formatCurrency(parseCurrency(row.original.fedex?.totalIncome ?? 0))}
      </div>
    )
  },
  {
    id: "dhl_metrics",
    header: "DHL (BA/NE)",
    cell: ({ row }) => {
      const d = row.original.dhl;
      return (
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-blue-700">{d?.ba}</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-red-600">{d?.ne}</span>
          <Badge variant="secondary" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-100">
            Total: {d?.total}
          </Badge>
        </div>
      )
    }
  },
  {
    id: "dhl_income",
    header: "Ingreso DHL",
    cell: ({ row }) => (
      <div className="text-sm font-medium">
        {formatCurrency(parseCurrency(row.original.dhl?.totalIncome ?? 0))}
      </div>
    )
  },
  {
    accessorKey: "collections",
    header: "Recol.",
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Badge variant="outline" className="font-mono">{row.original.collections || 0}</Badge>
      </div>
    )
  },
  {
    accessorKey: "cargas",
    header: "Cargas",
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Badge variant="outline" className="font-mono bg-slate-50">{row.original.cargas || 0}</Badge>
      </div>
    )
  },
  {
    accessorKey: "total",
    header: "Total Ops",
    cell: ({ row }) => <div className="text-center font-bold">{row.original.total}</div>
  },
  {
    accessorKey: "totalIncome",
    header: "Ingreso Total",
    cell: ({ row }) => (
      <div className="flex items-center gap-1 font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
        <DollarSign className="h-3 w-3" />
        {formatCurrency(parseCurrency(row.original.totalIncome ?? 0))}
      </div>
    )
  },
  {
    accessorKey: "lastWeekValue",
    header: "Vs. Sem. Pasada",
    cell: ({ row }) => {
      const current = parseCurrency(row.original.totalIncome);
      const last = row.original.lastWeekValue || 0;

      if (last === 0) return <span className="text-slate-400">-</span>;

      const diff = ((current - last) / last) * 100;
      const isPositive = diff >= 0;

      return (
        <div className={`flex items-center font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isPositive ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
          {Math.abs(diff).toFixed(1)}%
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Detalles",
    cell: ({ row }) => <ShipmentDetailDialog row={row} />
  }
];