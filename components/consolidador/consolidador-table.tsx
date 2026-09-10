"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ConsolidadorRow, ConsolidadorSourceType } from "@/lib/types/consolidador";
import { Inbox } from "lucide-react";

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

function statusClass(status: string | null): string {
  if (!status) return "bg-slate-50 text-slate-500 border-slate-200";
  if (status === "entregado" || status === "entregado_por_fedex" || status === "entregado_en_bodega")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "rechazado" || status === "devuelto_a_fedex") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

interface Props {
  rows: ConsolidadorRow[];
  /** Slot de acciones inline por fila (F1/F2/F3). */
  actions?: (row: ConsolidadorRow) => React.ReactNode;
}

export function ConsolidadorTable({ rows, actions }: Props) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
        <Inbox className="h-10 w-10 opacity-20" />
        <p className="text-sm font-medium">No hay ingresos para esta semana / filtros</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/60">
            <TableHead className="w-[130px]">Tipo</TableHead>
            <TableHead>Guía / Consolidado</TableHead>
            <TableHead>Estatus</TableHead>
            <TableHead className="w-[90px]">Fecha</TableHead>
            <TableHead className="text-right w-[150px]">Costo</TableHead>
            {actions && <TableHead className="text-right w-[180px]">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-slate-50/50">
              <TableCell>
                <Badge variant="outline" className={SOURCE_CLASS[row.sourceType]}>
                  {SOURCE_LABEL[row.sourceType]}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-slate-800 tabular-nums">
                    {row.trackingNumber || row.consNumber || "—"}
                  </span>
                  {row.consNumber && row.trackingNumber && (
                    <span className="text-[11px] text-slate-400">Cons. {row.consNumber}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusClass(row.shipmentStatus)}>
                  {row.shipmentStatus ?? "—"}
                </Badge>
              </TableCell>
              <TableCell className="text-slate-600 text-sm">{formatDate(row.date)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.originalCost != null && row.originalCost !== row.cost ? (
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] text-slate-400 line-through">{formatCurrency(row.originalCost)}</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(row.cost)}</span>
                  </div>
                ) : (
                  <span className="font-semibold text-slate-900">{formatCurrency(row.cost)}</span>
                )}
              </TableCell>
              {actions && <TableCell className="text-right">{actions(row)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
