"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Loader2, History, ShieldCheck, ListOrdered } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subsidiaryId: string;
  week: { from: string; to: string };
  onChanged: () => void;
}

type Severity = "danger" | "warn";

const ANOMALY: Record<string, { short: string; severity: Severity }> = {
  delivered_by_fedex: { short: "Lo entregó FedEx", severity: "danger" },
  income_without_support: { short: "Cobro sin entrega", severity: "danger" },
  status_regressed: { short: "El estatus retrocedió", severity: "warn" },
  date_mismatch: { short: "Fecha del cobro rara", severity: "warn" },
};

// El único color: el nivel del problema. Rojo = probablemente hay que quitar el cobro.
const SEV_TEXT: Record<Severity, string> = { danger: "text-red-600", warn: "text-amber-600" };

const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const humanStatus = (s: string | null) => (s ? s.replace(/_/g, " ") : "—");

const rowSeverity = (r: AnomalyRow): Severity =>
  r.anomalies.some((a) => ANOMALY[a.code]?.severity === "danger") ? "danger" : "warn";

const inArray: FilterFn<AnomalyRow> = (row, columnId, value: string[]) => !value?.length || value.includes(String(row.getValue(columnId)));
const anomalyFilter: FilterFn<AnomalyRow> = (row, _id, value: string[]) =>
  !value?.length || value.some((v) => row.original.anomalies.some((a) => a.code === v));

const SEVERITY_OPTIONS = [
  { label: "Crítica", value: "danger" },
  { label: "Por revisar", value: "warn" },
];
const ANOMALY_OPTIONS = Object.entries(ANOMALY).map(([value, m]) => ({ label: m.short, value }));

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

  const { danger, warn } = useMemo(() => {
    let d = 0;
    let w = 0;
    rows.forEach((r) => (rowSeverity(r) === "danger" ? d++ : w++));
    return { danger: d, warn: w };
  }, [rows]);

  const columns = useMemo<ColumnDef<AnomalyRow>[]>(
    () => [
      {
        id: "severity",
        accessorFn: (r) => rowSeverity(r),
        header: "Nivel",
        filterFn: inArray,
        cell: ({ row }) => {
          const sev = rowSeverity(row.original);
          return <span className={`text-xs font-semibold ${SEV_TEXT[sev]}`}>{sev === "danger" ? "Crítica" : "Revisar"}</span>;
        },
      },
      {
        accessorKey: "trackingNumber",
        header: "Guía",
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums text-slate-900">
            {row.original.trackingNumber || row.original.consNumber || "—"}
          </span>
        ),
      },
      {
        id: "alertas",
        header: "Qué pasó",
        filterFn: anomalyFilter,
        cell: ({ row }) => (
          <div className="max-w-[340px] space-y-1.5">
            {row.original.anomalies.map((a) => {
              const meta = ANOMALY[a.code] ?? { short: a.code, severity: "warn" as Severity };
              return (
                <div key={a.code}>
                  <span className={`text-sm font-medium ${SEV_TEXT[meta.severity]}`}>{meta.short}</span>
                  <p className="text-xs leading-snug text-slate-500">{a.label}</p>
                </div>
              );
            })}
          </div>
        ),
      },
      {
        id: "shipmentStatus",
        accessorKey: "shipmentStatus",
        header: "Estatus",
        cell: ({ row }) => <span className="whitespace-nowrap text-sm text-slate-600">{humanStatus(row.original.shipmentStatus)}</span>,
      },
      {
        id: "cost",
        accessorKey: "cost",
        header: "Ingreso",
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <div className="font-semibold tabular-nums text-slate-900">{formatCurrency(row.original.cost)}</div>
            <div className="text-xs tabular-nums text-slate-400">{fmtDateTime(row.original.date)}</div>
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Acciones</div>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver trazabilidad del paquete" onClick={() => setTimelineRow(row.original)}>
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

  const tableFilters = useMemo(
    () => [
      { columnId: "severity", title: "Nivel", options: SEVERITY_OPTIONS },
      { columnId: "alertas", title: "Tipo de problema", options: ANOMALY_OPTIONS },
    ],
    [],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-[95vw] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-base font-semibold text-slate-900">Anomalías por revisar</DialogTitle>
          <p className="text-xs text-slate-400">Ingresos con algo raro en esta sucursal y semana. Revisa y corrige desde aquí.</p>
        </DialogHeader>

        <div className="min-w-0 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <ShieldCheck className="h-8 w-8 text-emerald-500" />
              </span>
              <p className="text-sm font-semibold text-slate-700">Todo en orden</p>
              <p className="text-xs text-slate-400">No se detectaron anomalías esta semana.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-red-600">{danger}</span> crítica{danger === 1 ? "" : "s"}
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="font-semibold text-amber-600">{warn}</span> por revisar
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="text-slate-400">{rows.length} en total</span>
              </p>
              <div className="min-w-0 overflow-x-auto">
                <DataTable columns={columns} data={rows} filters={tableFilters} autoResetPageIndex={false} hideSelectionCount />
              </div>
            </>
          )}
        </div>

        <HistoryDialog incomeId={historyId} open={!!historyId} onOpenChange={(o) => !o && setHistoryId(null)} />
        <StatusTimelineDialog open={!!timelineRow} onOpenChange={(o) => !o && setTimelineRow(null)} tracking={timelineRow?.trackingNumber ?? null} />
      </DialogContent>
    </Dialog>
  );
}
