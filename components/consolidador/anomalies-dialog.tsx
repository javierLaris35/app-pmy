"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { RowActions } from "@/components/consolidador/row-actions";
import { HistoryDialog } from "@/components/consolidador/history-dialog";
import {
  getWeekAnomalies,
  patchIncomeCost,
  patchSecondAbord,
  editIncomeDate,
  deleteIncome,
} from "@/lib/services/consolidador";
import { AnomalyRow } from "@/lib/types/consolidador";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { AlertTriangle, Loader2, History, ShieldCheck } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subsidiaryId: string;
  week: { from: string; to: string };
  /** Refresca la tabla principal de la semana tras una corrección. */
  onChanged: () => void;
}

const SHORT: Record<string, string> = {
  date_mismatch: "Fecha",
  status_regressed: "Retroceso",
  income_without_support: "Sin respaldo",
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "—";

export function AnomaliesDialog({ open, onOpenChange, subsidiaryId, week, onChanged }: Props) {
  const [rows, setRows] = useState<AnomalyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!subsidiaryId) return;
    setLoading(true);
    try {
      const { rows } = await getWeekAnomalies(subsidiaryId, week.from, week.to);
      setRows(rows);
    } catch {
      toast.error("No se pudieron cargar las anomalías");
    } finally {
      setLoading(false);
    }
  }, [subsidiaryId, week.from, week.to]);

  useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  const after = async (p: Promise<unknown>, ok: string) => {
    try {
      await p;
      toast.success(ok);
      onChanged();
      await reload();
    } catch {
      toast.error("No se pudo aplicar el cambio");
    }
  };

  const columns = useMemo<ColumnDef<AnomalyRow>[]>(
    () => [
      {
        accessorKey: "trackingNumber",
        header: "Guía",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums text-slate-800">
            {row.original.trackingNumber || row.original.consNumber || "—"}
          </span>
        ),
      },
      {
        id: "alertas",
        header: "Alertas",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.anomalies.map((a) => (
              <Badge
                key={a.code}
                variant="outline"
                className="whitespace-nowrap gap-1 bg-amber-50 text-amber-700 border-amber-200 font-normal"
                title={a.label}
              >
                <AlertTriangle className="h-3 w-3" />
                {SHORT[a.code] ?? a.code}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: "estatus",
        header: "Estatus",
        cell: ({ row }) => (
          <Badge variant="outline" className="whitespace-nowrap bg-slate-50 text-slate-600 border-slate-200 font-normal">
            {row.original.shipmentStatus ?? "—"}
          </Badge>
        ),
      },
      {
        id: "fechas",
        header: () => <span className="whitespace-nowrap">F. estatus / ingreso</span>,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs tabular-nums text-slate-600">
            {fmtDate(row.original.statusDate)} <span className="text-slate-300">/</span>{" "}
            <span className="font-medium text-amber-600">{fmtDate(row.original.date)}</span>
          </span>
        ),
      },
      {
        id: "cost",
        header: "Costo",
        cell: ({ row }) => <span className="font-semibold tabular-nums">{formatCurrency(row.original.cost)}</span>,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Acciones</div>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Historial" onClick={() => setHistoryId(row.original.id)}>
              <History className="h-4 w-4 text-slate-500" />
            </Button>
            <RowActions
              row={row.original}
              onEditCost={(id, cost, reason) => after(patchIncomeCost(id, cost, reason), "Costo actualizado")}
              onToggleSecondAbord={(id, enabled, reason) => after(patchSecondAbord(id, enabled, reason), "2º a bordo ajustado")}
              onEditDate={(id, date, reason) => after(editIncomeDate(id, date, reason), "Fecha actualizada")}
              onDelete={(id, reason) => after(deleteIncome(id, reason), "Ingreso eliminado")}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-[95vw] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Revisión de anomalías — semana seleccionada
          </DialogTitle>
        </DialogHeader>

        <div className="min-w-0 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-slate-500">
              <ShieldCheck className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-medium">Sin anomalías en esta sucursal y semana.</p>
            </div>
          ) : (
            <div className="min-w-0 overflow-x-auto">
              <DataTable columns={columns} data={rows} autoResetPageIndex={false} hideToolbar hideSelectionCount />
            </div>
          )}
        </div>

        <HistoryDialog incomeId={historyId} open={!!historyId} onOpenChange={(o) => !o && setHistoryId(null)} />
      </DialogContent>
    </Dialog>
  );
}
