"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { TextField } from "@/components/ui/field";
import { applyDateRealign, DateRealignRow, getDateRealignPreview } from "@/lib/services/consolidador";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { ArrowRight, CalendarCheck2, CalendarClock, HelpCircle, Loader2, PenLine, ShieldCheck } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subsidiaryId: string;
  week: { from: string; to: string };
  onChanged: () => void;
}

const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-MX", {
        timeZone: "America/Hermosillo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const typeLabel = (r: DateRealignRow) =>
  r.incomeType === "entregado" ? "Entregado" : `No entregado${r.nonDeliveryStatus ? ` (DEX ${r.nonDeliveryStatus})` : ""}`;

type Kind = "day" | "hour" | "no_event";
const kindOf = (r: DateRealignRow): Kind => (r.action === "no_event" ? "no_event" : r.currentDay !== r.correctDay ? "day" : "hour");
const KIND_OPTIONS = [
  { label: "Cambia de día", value: "day" },
  { label: "Solo la hora", value: "hour" },
  { label: "Sin evento de FedEx", value: "no_event" },
];
const inArray: FilterFn<DateRealignRow> = (row, columnId, value: string[]) => !value?.length || value.includes(String(row.getValue(columnId)));

/**
 * Corrige la fecha de los ingresos FedEx que el cierre de ruta dejó en el día de la salida (00:00)
 * en lugar del día y la hora en que FedEx entregó. Muestra antes → después y aplica con motivo.
 */
export function DateRealignDialog({ open, onOpenChange, subsidiaryId, week, onChanged }: Props) {
  const [rows, setRows] = useState<DateRealignRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [reason, setReason] = useState("Fecha real de entrega FedEx (cierre de ruta)");
  const [reasonError, setReasonError] = useState<string | undefined>();

  const reload = useCallback(async () => {
    if (!subsidiaryId) return;
    setLoading(true);
    try {
      setRows(await getDateRealignPreview(subsidiaryId, week.from, week.to));
    } catch {
      toast.error("No se pudieron revisar las fechas de los ingresos");
    } finally {
      setLoading(false);
    }
  }, [subsidiaryId, week.from, week.to]);

  useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  const fixable = useMemo(() => rows.filter((r) => r.action === "fix"), [rows]);
  const dayChanges = useMemo(() => fixable.filter((r) => r.currentDay !== r.correctDay).length, [fixable]);
  const amount = useMemo(() => fixable.reduce((s, r) => s + r.cost, 0), [fixable]);

  const handleApply = async () => {
    if (reason.trim().length < 3) {
      setReasonError("Escribe el motivo (al menos 3 letras).");
      return;
    }
    setApplying(true);
    try {
      const { fixed } = await applyDateRealign(subsidiaryId, week.from, week.to, fixable.map((r) => r.incomeId), reason.trim());
      toast.success(fixed === 1 ? "Se corrigió 1 fecha" : `Se corrigieron ${fixed} fechas`);
      onChanged();
      await reload();
    } catch {
      toast.error("No se pudieron corregir las fechas");
    } finally {
      setApplying(false);
    }
  };

  const columns = useMemo<ColumnDef<DateRealignRow>[]>(
    () => [
      {
        accessorKey: "trackingNumber",
        header: "Guía",
        cell: ({ row }) => <span className="font-semibold tabular-nums text-slate-900">{row.original.trackingNumber}</span>,
      },
      {
        id: "type",
        header: "Ingreso",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-slate-700">
            {typeLabel(row.original)} · <span className="tabular-nums">{formatCurrency(row.original.cost)}</span>
          </span>
        ),
      },
      {
        id: "change",
        header: "Fecha registrada → fecha FedEx",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm tabular-nums">
            <span className="text-slate-400 line-through decoration-slate-300">{fmtDateTime(row.original.currentDate)}</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-slate-900">{fmtDateTime(row.original.correctDate)}</span>
          </span>
        ),
      },
      {
        id: "kind",
        accessorFn: (r) => kindOf(r),
        header: "Cambio",
        filterFn: inArray,
        cell: ({ row }) => {
          const k = kindOf(row.original);
          if (k === "no_event")
            return (
              <Badge variant="outline" className="gap-1 whitespace-nowrap border-slate-200 bg-slate-50 font-medium text-slate-500">
                <HelpCircle className="h-3 w-3" /> Sin evento de FedEx
              </Badge>
            );
          return k === "day" ? (
            <Badge variant="outline" className="gap-1 whitespace-nowrap border-amber-200 bg-amber-50 font-medium text-amber-700">
              <CalendarClock className="h-3 w-3" /> Cambia de día
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 whitespace-nowrap border-sky-200 bg-sky-50 font-medium text-sky-700">
              <CalendarCheck2 className="h-3 w-3" /> Solo la hora
            </Badge>
          );
        },
      },
    ],
    [],
  );

  const tableFilters = useMemo(() => [{ columnId: "kind", title: "Cambio", options: KIND_OPTIONS }], []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-[95vw] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <CalendarCheck2 className="h-5 w-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-base font-semibold text-slate-900">Corregir fechas de ingresos</span>
              <span className="text-xs font-normal text-slate-400">
                Ingresos que el cierre de ruta dejó en el día de la salida. Se pasan al día y la hora en que FedEx entregó.
              </span>
            </span>
          </DialogTitle>
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
              <p className="text-xs text-slate-400">No hay ingresos con fecha por corregir esta semana.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-5 text-sm text-slate-600">
                <span>
                  <span className="font-bold tabular-nums text-slate-900">{fixable.length}</span> por corregir
                </span>
                <span>
                  <span className="font-bold tabular-nums text-amber-600">{dayChanges}</span> cambian de día
                </span>
                <span>
                  <span className="font-bold tabular-nums text-slate-900">{formatCurrency(amount)}</span> en total
                </span>
                {rows.length > fixable.length && (
                  <span className="text-xs text-slate-400">
                    {rows.length - fixable.length} sin evento de FedEx (se quedan como están)
                  </span>
                )}
              </div>
              <div className="min-w-0 overflow-x-auto">
                <DataTable columns={columns} data={rows} filters={tableFilters} autoResetPageIndex={false} hideSelectionCount />
              </div>
            </>
          )}
        </div>

        {fixable.length > 0 && !loading && (
          <DialogFooter className="flex-col items-stretch gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-start">
            <TextField
              label="Motivo"
              icon={PenLine}
              size="sm"
              className="flex-1"
              value={reason}
              error={reasonError}
              onChange={(e) => {
                setReason(e.target.value);
                setReasonError(undefined);
              }}
            />
            <Button size="sm" onClick={handleApply} disabled={applying} className="gap-2">
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck2 className="h-4 w-4" />}
              Corregir {fixable.length === 1 ? "1 fecha" : `${fixable.length} fechas`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
