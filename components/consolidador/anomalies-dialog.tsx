"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { RowActions } from "@/components/consolidador/row-actions";
import { HistoryDialog } from "@/components/consolidador/history-dialog";
import { StatusTimelineDialog } from "@/components/consolidador/status-timeline-dialog";
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
import { AlertTriangle, Loader2, History, ShieldCheck, ListOrdered } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subsidiaryId: string;
  week: { from: string; to: string };
  /** Refresca la tabla principal de la semana tras una corrección. */
  onChanged: () => void;
}

const SHORT: Record<string, string> = {
  date_mismatch: "Fecha no coincide",
  status_regressed: "Volvió a tránsito",
  income_without_support: "Cobro sin entrega",
  delivered_by_fedex: "Lo entregó FedEx",
};

const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

export function AnomaliesDialog({ open, onOpenChange, subsidiaryId, week, onChanged }: Props) {
  const [rows, setRows] = useState<AnomalyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [timelineRow, setTimelineRow] = useState<AnomalyRow | null>(null);

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
          <div className="flex max-w-[380px] flex-col gap-1.5">
            {row.original.anomalies.map((a) => (
              <div key={a.code} className="flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-amber-800">{SHORT[a.code] ?? a.code}</div>
                  <div className="text-[11px] leading-snug text-amber-700">{a.label}</div>
                </div>
              </div>
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
          <div className="whitespace-nowrap text-xs tabular-nums leading-tight">
            <div className="text-slate-600">
              <span className="text-[10px] text-slate-400">Est</span> {fmtDateTime(row.original.statusDate)}
            </div>
            <div className="font-medium text-amber-600">
              <span className="text-[10px] text-slate-400">Ing</span> {fmtDateTime(row.original.date)}
            </div>
          </div>
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
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Historial de estatus" onClick={() => setTimelineRow(row.original)}>
              <ListOrdered className="h-4 w-4 text-slate-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Historial de cambios" onClick={() => setHistoryId(row.original.id)}>
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
        <StatusTimelineDialog
          open={!!timelineRow}
          onOpenChange={(o) => !o && setTimelineRow(null)}
          tracking={timelineRow?.trackingNumber ?? null}
        />
      </DialogContent>
    </Dialog>
  );
}
