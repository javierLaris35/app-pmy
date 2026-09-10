"use client";

import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ConsolidadorRow, ConsolidadorSourceType } from "@/lib/types/consolidador";

const SOURCE_LABEL: Record<ConsolidadorSourceType, string> = {
  shipment: "Envío",
  charge: "Carga",
  collection: "Recolección",
  manual: "Manual",
  tyco: "Tyco",
  aeropuerto: "Aeropuerto",
  special_transfer: "Traslado esp.",
};

const SOURCE_CLASS: Record<ConsolidadorSourceType, string> = {
  shipment: "bg-blue-50 text-blue-700 border-blue-200",
  charge: "bg-amber-50 text-amber-700 border-amber-200",
  collection: "bg-violet-50 text-violet-700 border-violet-200",
  manual: "bg-rose-50 text-rose-700 border-rose-200",
  tyco: "bg-cyan-50 text-cyan-700 border-cyan-200",
  aeropuerto: "bg-cyan-50 text-cyan-700 border-cyan-200",
  special_transfer: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

/** Opciones de tipo de ingreso para el filtro facetado (punto 4). */
export const SOURCE_FILTER_OPTIONS = (Object.keys(SOURCE_LABEL) as ConsolidadorSourceType[]).map((v) => ({
  label: SOURCE_LABEL[v],
  value: v,
}));

function statusClass(status: string | null): string {
  if (!status) return "bg-slate-50 text-slate-500 border-slate-200";
  if (status === "entregado" || status === "entregado_por_fedex" || status === "entregado_en_bodega")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "rechazado" || status === "devuelto_a_fedex") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

/** filterFn para filtros facetados (valor de columna escalar contra array de seleccionados). */
const inArray: FilterFn<ConsolidadorRow> = (row, columnId, value: string[]) =>
  !value?.length || value.includes(String(row.getValue(columnId)));

interface Handlers {
  /** Slot de acciones inline por fila (se llena en F1/F3). */
  renderActions?: (row: ConsolidadorRow) => React.ReactNode;
}

export function getConsolidadorColumns({ renderActions }: Handlers = {}): ColumnDef<ConsolidadorRow>[] {
  const columns: ColumnDef<ConsolidadorRow>[] = [
    {
      accessorKey: "sourceType",
      header: "Tipo",
      filterFn: inArray,
      cell: ({ row }) => {
        const t = row.original.sourceType;
        return (
          <Badge variant="outline" className={SOURCE_CLASS[t]}>
            {SOURCE_LABEL[t]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "trackingNumber",
      header: "Guía / Consolidado",
      cell: ({ row }) => {
        const { trackingNumber, consNumber } = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-slate-800 tabular-nums">{trackingNumber || consNumber || "—"}</span>
            {consNumber && trackingNumber && <span className="text-[11px] text-slate-400">Cons. {consNumber}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "shipmentStatus",
      header: "Estatus",
      filterFn: inArray,
      cell: ({ row }) => (
        <Badge variant="outline" className={statusClass(row.original.shipmentStatus)}>
          {row.original.shipmentStatus ?? "—"}
        </Badge>
      ),
    },
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) =>
        new Date(row.original.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
    },
    {
      accessorKey: "cost",
      header: "Costo",
      cell: ({ row }) => {
        const { cost, originalCost } = row.original;
        if (originalCost != null && originalCost !== cost) {
          return (
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-400 line-through">{formatCurrency(originalCost)}</span>
              <span className="font-semibold text-slate-900">{formatCurrency(cost)}</span>
            </div>
          );
        }
        return <span className="font-semibold text-slate-900">{formatCurrency(cost)}</span>;
      },
    },
  ];

  if (renderActions) {
    columns.push({
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      cell: ({ row }) => <div className="flex justify-end">{renderActions(row.original)}</div>,
    });
  }

  return columns;
}
