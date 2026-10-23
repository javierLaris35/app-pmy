import { ColumnDef } from "@tanstack/react-table"
import { TrendingUp, TrendingDown } from "lucide-react"
import { NewIncome } from "@/lib/types"
import { formatCurrency, parseCurrency } from "@/lib/utils"
import { ShipmentDetailDialog } from "@/components/modals/shipment-detial-dialog"

export const columns: ColumnDef<NewIncome>[] = [
  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => {
      const dateStr = row.getValue("date") as string;
      const formattedDate = dateStr?.split("T")[0].split("-").reverse().join("/");
      return (
        <div className="font-medium whitespace-nowrap">{formattedDate}</div>
      )
    }
  },
  {
    id: "fedex_metrics",
    header: () => (
      <div className="flex flex-col leading-tight">
        <span>FedEx</span>
        <span className="text-[11px] font-medium">
          <span className="text-green-700">POD</span>/<span className="text-orange-600">DEX07</span>/<span className="text-orange-800">DEX08</span>
        </span>
      </div>
    ),
    cell: ({ row }) => {
      const f = row.original.fedex;
      return (
        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="text-xs font-bold text-green-700">{f?.pod}</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-orange-600">{f?.dex07}</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-orange-800">{f?.dex08}</span>
          <span className="ml-2 text-xs text-muted-foreground">· {f?.total}</span>
        </div>
      )
    }
  },
  {
    id: "fedex_income",
    header: "Ingreso FedEx",
    accessorFn: (r) => parseCurrency(r.fedex?.totalIncome ?? 0), // numérico para ordenar
    cell: ({ row }) => (
      <div className="text-sm font-medium">
        {formatCurrency(parseCurrency(row.original.fedex?.totalIncome ?? 0))}
      </div>
    )
  },
  {
    id: "dhl_metrics",
    header: () => (
      <div className="flex flex-col leading-tight">
        <span>DHL</span>
        <span className="text-[11px] font-medium">
          <span className="text-blue-700">BA</span>/<span className="text-red-600">NE</span>
        </span>
      </div>
    ),
    cell: ({ row }) => {
      const d = row.original.dhl;
      return (
        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="text-xs font-bold text-blue-700">{d?.ba}</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-red-600">{d?.ne}</span>
          <span className="ml-2 text-xs text-muted-foreground">· {d?.total}</span>
        </div>
      )
    }
  },
  {
    id: "dhl_income",
    header: "Ingreso DHL",
    accessorFn: (r) => parseCurrency(r.dhl?.totalIncome ?? 0), // numérico para ordenar
    cell: ({ row }) => (
      <div className="text-sm font-medium">
        {formatCurrency(parseCurrency(row.original.dhl?.totalIncome ?? 0))}
      </div>
    )
  },
  {
    id: "transfers_metrics",
    header: () => (
      <div className="flex flex-col leading-tight">
        <span>Traslados</span>
        <span className="text-[11px] font-medium">
          <span className="text-indigo-700">Tyco</span>/<span className="text-purple-700">Aero</span>/<span className="text-slate-600">Esp</span>
        </span>
      </div>
    ),
    cell: ({ row }) => {
      const t = row.original.transfers;
      return (
        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="text-xs font-bold text-indigo-700">{t?.tyco ?? 0}</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-purple-700">{t?.aeropuerto ?? 0}</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-600">{t?.especial ?? 0}</span>
          <span className="ml-2 text-xs text-muted-foreground">· {t?.total ?? 0}</span>
        </div>
      )
    }
  },
  {
    id: "transfers_income",
    header: "Ingreso Traslados",
    accessorFn: (r) => parseCurrency(r.transfers?.totalIncome ?? 0), // numérico para ordenar
    cell: ({ row }) => (
      <div className="text-sm font-medium">
        {formatCurrency(parseCurrency(row.original.transfers?.totalIncome ?? 0))}
      </div>
    )
  },
  {
    accessorKey: "collections",
    header: "Recol.",
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <span className="text-sm font-medium tabular-nums">{row.original.collections || 0}</span>
      </div>
    )
  },
  {
    accessorKey: "cargas",
    header: "Cargas",
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <span className="text-sm font-medium tabular-nums">{row.original.cargas || 0}</span>
      </div>
    )
  },
  {
    id: "otros_income",
    header: "Otros",
    accessorFn: (r) => parseCurrency(r.otros?.totalIncome ?? 0),
    cell: ({ row }) => {
      const value = parseCurrency(row.original.otros?.totalIncome ?? 0)
      return (
        <div
          className="text-sm font-medium"
          title="Ingresos capturados a mano en el Consolidador sin guía"
        >
          {value > 0 ? formatCurrency(value) : <span className="text-slate-400">-</span>}
        </div>
      )
    }
  },
  {
    accessorKey: "total",
    header: "Total Ops",
    cell: ({ row }) => <div className="text-center font-bold">{row.original.total}</div>
  },
  {
    id: "totalIncome",
    header: "Ingreso Total",
    accessorFn: (r) => parseCurrency(r.totalIncome ?? 0), // numérico (antes ordenaba como texto)
    cell: ({ row }) => (
      <div className="font-bold tabular-nums text-emerald-700">
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