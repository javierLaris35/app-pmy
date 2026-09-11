"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTable } from "@/components/data-table/data-table";
import { formatCurrency } from "@/lib/utils";
import {
  searchPackageBatch,
  fixPackageStatus,
  repairPackageIncome,
  reassignIncomeSubsidiary,
} from "@/lib/services/consolidador";
import { editIncomeDate } from "@/lib/services/consolidador";
import { canFixStatus, parseTrackingList, MAX_BATCH_TRACKINGS } from "@/lib/consolidador/validation";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import { EditDateDialog } from "@/components/consolidador/edit-date-dialog";
import { StatusTimelineDialog } from "@/components/consolidador/status-timeline-dialog";
import { SearchBatchItem } from "@/lib/types/consolidador";
import { toast } from "@/lib/toast";
import {
  Search,
  Loader2,
  AlertTriangle,
  PackageSearch,
  RefreshCw,
  DollarSign,
  ArrowRightLeft,
  CalendarClock,
  ListOrdered,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sucursal seleccionada arriba: destino al mover un ingreso mal asignado. */
  selectedSubsidiaryId: string;
  /** Se llama tras corregir/reparar/mover, para refrescar la tabla de la semana. */
  onFixed: () => void;
}

const fmt = (s: string | null) => (s ? s.replace(/_/g, " ") : "—");
const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
const dayKey = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : null);

interface Handlers {
  reasonOk: boolean;
  busy: string | null;
  selectedSubsidiaryId: string;
  selectedName: string;
  onStatus: (r: SearchBatchItem) => void;
  onIncome: (r: SearchBatchItem) => void;
  onMove: (r: SearchBatchItem) => void;
  onDate: (r: SearchBatchItem) => void;
  onTimeline: (r: SearchBatchItem) => void;
}

function IconAction({
  label,
  icon: Icon,
  onClick,
  disabled,
  loading,
  className,
}: {
  label: string;
  icon: typeof RefreshCw;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            size="icon"
            variant="outline"
            className={`h-8 w-8 ${className ?? ""}`}
            disabled={disabled}
            onClick={onClick}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function buildColumns(h: Handlers): ColumnDef<SearchBatchItem>[] {
  return [
    {
      id: "trackingNumber",
      accessorFn: (r) => r.tracking,
      header: "Guía",
      cell: ({ row }) => <span className="font-medium tabular-nums text-slate-800">{row.original.tracking}</span>,
    },
    {
      id: "interno",
      header: "Interno",
      cell: ({ row }) => (
        <Badge variant="outline" className="whitespace-nowrap bg-slate-50 text-slate-600 border-slate-200 font-normal">
          {fmt(row.original.internalStatus)}
        </Badge>
      ),
    },
    {
      id: "fedex",
      header: "FedEx",
      cell: ({ row }) => {
        const f = row.original.fedex;
        if (!f.found || f.error) {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" /> sin verificar
            </span>
          );
        }
        return (
          <Badge variant="outline" className="whitespace-nowrap bg-sky-50 text-sky-700 border-sky-200 font-normal">
            {fmt(f.status)}
          </Badge>
        );
      },
    },
    {
      id: "ingreso",
      header: "Ingreso",
      cell: ({ row }) => {
        const r = row.original;
        if (r.income)
          return (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal">
              {formatCurrency(r.income.cost)}
            </Badge>
          );
        if (r.incomeRepairNeeded)
          return (
            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-normal">
              Falta
            </Badge>
          );
        return <span className="text-xs text-slate-400">—</span>;
      },
    },
    {
      id: "sucursal",
      header: "Sucursal",
      cell: ({ row }) => {
        const r = row.original;
        if (!r.income) return <span className="text-xs text-slate-400">—</span>;
        const mis = !!h.selectedSubsidiaryId && r.income.subsidiaryId !== h.selectedSubsidiaryId;
        return (
          <span className={`text-xs ${mis ? "font-medium text-amber-600" : "text-slate-600"}`}>
            {r.income.subsidiaryName ?? "—"}
          </span>
        );
      },
    },
    {
      id: "alertas",
      header: "Alertas",
      cell: ({ row }) => {
        const a = row.original.anomalies ?? [];
        if (a.length === 0) return <span className="text-xs text-emerald-500">OK</span>;
        const short: Record<string, string> = {
          date_mismatch: "Fecha",
          status_regressed: "Retroceso",
          income_without_support: "Sin respaldo",
          delivered_by_fedex: "FedEx entregó",
        };
        return (
          <div className="flex flex-wrap gap-1">
            {a.map((an) => (
              <Badge
                key={an.code}
                variant="outline"
                className="whitespace-nowrap gap-1 bg-amber-50 text-amber-700 border-amber-200 font-normal"
                title={an.label}
              >
                <AlertTriangle className="h-3 w-3" />
                {short[an.code] ?? an.code}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: "fechas",
      header: () => (
        <div className="whitespace-nowrap">
          F. estatus <span className="text-slate-300">/</span> ingreso
        </div>
      ),
      cell: ({ row }) => {
        const r = row.original;
        // Resalta cuando ambas existen pero caen en días distintos (posible cobro mal fechado).
        const mismatch =
          !!r.statusDate && !!r.incomeDate && dayKey(r.statusDate) !== dayKey(r.incomeDate);
        return (
          <div className="whitespace-nowrap text-xs tabular-nums leading-tight">
            <div className="text-slate-600">
              <span className="text-[10px] text-slate-400">Est</span> {fmtDateTime(r.statusDate)}
            </div>
            <div className={mismatch ? "font-semibold text-amber-600" : "text-slate-600"}>
              <span className="text-[10px] text-slate-400">Ing</span> {fmtDateTime(r.incomeDate)}
            </div>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        if (!r.shipment) return <div className="text-right text-[11px] text-slate-400">no existe</div>;
        const id = r.shipment.id;
        const canStatus = canFixStatus(r);
        const canIncome = r.incomeRepairNeeded;
        const mis = !!r.income && !!h.selectedSubsidiaryId && r.income.subsidiaryId !== h.selectedSubsidiaryId;
        return (
          <div className="flex justify-end gap-1.5">
            <IconAction
              label="Ver trazabilidad del paquete"
              icon={ListOrdered}
              disabled={h.busy !== null}
              onClick={() => h.onTimeline(r)}
            />
            <IconAction
              label="Corregir estatus contra FedEx"
              icon={RefreshCw}
              disabled={!canStatus || !h.reasonOk || h.busy !== null}
              loading={h.busy === `${id}:status`}
              onClick={() => h.onStatus(r)}
            />
            <IconAction
              label="Reparar ingreso (crear si falta)"
              icon={DollarSign}
              disabled={!canIncome || !h.reasonOk || h.busy !== null}
              loading={h.busy === `${id}:income`}
              onClick={() => h.onIncome(r)}
            />
            {r.income && (
              <IconAction
                label="Editar fecha del ingreso"
                icon={CalendarClock}
                disabled={h.busy !== null}
                onClick={() => h.onDate(r)}
              />
            )}
            {mis && (
              <IconAction
                label={`Mover ingreso a ${h.selectedName}`}
                icon={ArrowRightLeft}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                disabled={!h.reasonOk || h.busy !== null}
                loading={h.busy === `${r.income!.id}:move`}
                onClick={() => h.onMove(r)}
              />
            )}
          </div>
        );
      },
    },
  ];
}

export function SearchPackageDialog({ open, onOpenChange, selectedSubsidiaryId, onFixed }: Props) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<SearchBatchItem[]>([]);
  const [reason, setReason] = useState("");
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [dateItem, setDateItem] = useState<SearchBatchItem | null>(null);
  const [timelineItem, setTimelineItem] = useState<SearchBatchItem | null>(null);

  const { subsidiaries } = useSubsidiaries();
  const selectedName = subsidiaries.find((s: any) => s.id === selectedSubsidiaryId)?.name ?? "esta sucursal";

  const parsed = useMemo(() => parseTrackingList(text), [text]);
  const reasonOk = reason.trim().length >= 3;

  const isMisassigned = (r: SearchBatchItem) =>
    !!r.income && !!selectedSubsidiaryId && r.income.subsidiaryId !== selectedSubsidiaryId;

  const doSearch = async () => {
    if (parsed.length === 0) return;
    setSearching(true);
    setResults([]);
    try {
      const { results } = await searchPackageBatch(parsed);
      setResults(results);
    } catch {
      toast.error("No se pudo hacer la búsqueda");
    } finally {
      setSearching(false);
    }
  };

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
      onFixed();
      await doSearch();
    } finally {
      setBusy(null);
    }
  };

  const onStatus = (r: SearchBatchItem) =>
    r.shipment && r.suggestion?.newStatus && reasonOk
      ? runAction(`${r.shipment.id}:status`, async () => {
          try {
            await fixPackageStatus(r.shipment!.id, r.suggestion!.newStatus!, reason.trim());
            toast.success(`Estatus corregido: ${r.tracking}`);
          } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "No se pudo corregir el estatus");
          }
        })
      : undefined;

  const onIncome = (r: SearchBatchItem) =>
    r.shipment && reasonOk
      ? runAction(`${r.shipment.id}:income`, async () => {
          try {
            const res = await repairPackageIncome(r.shipment!.id, reason.trim());
            if (res.created) toast.success(`Ingreso generado: ${r.tracking}`);
            else toast.error(res.reason ?? "No se generó ingreso");
          } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "No se pudo reparar el ingreso");
          }
        })
      : undefined;

  const onMove = (r: SearchBatchItem) =>
    r.income && selectedSubsidiaryId && reasonOk
      ? runAction(`${r.income.id}:move`, async () => {
          try {
            await reassignIncomeSubsidiary(r.income!.id, selectedSubsidiaryId, reason.trim());
            toast.success(`Ingreso movido a ${selectedName}: ${r.tracking}`);
          } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "No se pudo mover el ingreso");
          }
        })
      : undefined;

  const anyActionable = results.some(
    (r) => (r.shipment && canFixStatus(r)) || r.incomeRepairNeeded || isMisassigned(r),
  );

  const onDate = (r: SearchBatchItem) => setDateItem(r);
  const onTimeline = (r: SearchBatchItem) => setTimelineItem(r);

  const submitDate = async (date: string, reason: string) => {
    if (!dateItem?.income) return;
    try {
      await editIncomeDate(dateItem.income.id, date, reason);
      toast.success(`Fecha actualizada: ${dateItem.tracking}`);
      onFixed();
      await doSearch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "No se pudo actualizar la fecha");
      throw e;
    }
  };

  const columns = useMemo(
    () => buildColumns({ reasonOk, busy, selectedSubsidiaryId, selectedName, onStatus, onIncome, onMove, onDate, onTimeline }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reasonOk, busy, selectedSubsidiaryId, selectedName, reason, results],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-[95vw] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-slate-500" />
            Buscar paquetes — estatus e ingresos
          </DialogTitle>
        </DialogHeader>

        <TooltipProvider delayDuration={200}>
        <div className="min-w-0 space-y-4">
          {/* Entrada de guías */}
          <div className="rounded-lg border bg-slate-50/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="batch-input" className="text-xs font-semibold text-slate-600">
                Guías (una por línea, o separadas por coma/espacio)
              </Label>
              <span className="text-[11px] text-slate-400">
                {parsed.length}/{MAX_BATCH_TRACKINGS}
              </span>
            </div>
            <Textarea
              id="batch-input"
              rows={2}
              className="resize-none bg-white"
              placeholder={"T123...\nT456..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex justify-end">
              <Button onClick={doSearch} disabled={searching || parsed.length === 0} size="sm" className="gap-2">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar
              </Button>
            </div>
          </div>

          {/* Motivo compartido */}
          {anyActionable && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <Label htmlFor="batch-reason" className="shrink-0 text-xs font-semibold text-slate-600">
                Motivo
              </Label>
              <Input
                id="batch-reason"
                className="h-8 border-slate-200"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Requerido para aplicar cualquier acción"
              />
            </div>
          )}

          {/* Resultados */}
          {results.length > 0 && (
            <div className="min-w-0 overflow-x-auto">
              <DataTable columns={columns} data={results} autoResetPageIndex={false} hideToolbar hideSelectionCount />
            </div>
          )}
        </div>

        <EditDateDialog
          open={!!dateItem}
          onOpenChange={(o) => !o && setDateItem(null)}
          currentDate={dateItem?.income?.date ?? null}
          onSubmit={submitDate}
        />
        <StatusTimelineDialog
          open={!!timelineItem}
          onOpenChange={(o) => !o && setTimelineItem(null)}
          tracking={timelineItem?.tracking ?? null}
        />
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
