"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DataTable } from "@/components/data-table/data-table";
import { formatCurrency } from "@/lib/utils";
import {
  searchPackageBatch,
  fixPackageStatus,
  repairPackageIncome,
  reassignIncomeSubsidiary,
  editIncomeDate,
} from "@/lib/services/consolidador";
import { canFixStatus, parseTrackingList, MAX_BATCH_TRACKINGS } from "@/lib/consolidador/validation";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import { EditDateDialog } from "@/components/consolidador/edit-date-dialog";
import { StatusTimelineDialog } from "@/components/consolidador/status-timeline-dialog";
import { VerdictBadge } from "@/components/consolidador/verdict-badge";
import { SearchBatchItem } from "@/lib/types/consolidador";
import { toast } from "@/lib/toast";
import {
  Search,
  Loader2,
  PackageSearch,
  RefreshCw,
  DollarSign,
  ArrowRightLeft,
  CalendarClock,
  ListOrdered,
  PlusCircle,
  Truck,
  PackageX,
} from "lucide-react";

interface Props {
  /** Sucursal seleccionada arriba: destino al mover un ingreso mal asignado. */
  selectedSubsidiaryId: string;
  /** Se llama tras corregir/reparar/mover, para refrescar los datos de la semana. */
  onFixed: () => void;
  /** Abre el alta de ingreso manual precargando la guía (para guías que no existen). */
  onAddIncome: (tracking: string) => void;
}

const fmt = (s: string | null) => (s ? s.replace(/_/g, " ") : "—");

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
  onAddIncome: (tracking: string) => void;
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
          <Button size="icon" variant="outline" className={`h-8 w-8 ${className ?? ""}`} disabled={disabled} onClick={onClick}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function FedexPeek({ r }: { r: SearchBatchItem }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]">
          <Truck className="h-3.5 w-3.5" /> Ver en FedEx
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-1 text-xs">
        <p className="font-medium text-slate-600">FedEx dice</p>
        {r.fedex.found ? (
          <>
            <p className="text-slate-700">Estatus: {fmt(r.fedex.status)}</p>
            {r.fedex.description && <p className="text-slate-500">{r.fedex.description}</p>}
          </>
        ) : (
          <p className="text-amber-600">{r.fedex.error ?? "Sin datos en FedEx"}</p>
        )}
      </PopoverContent>
    </Popover>
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
      cell: ({ row }) =>
        row.original.shipment ? (
          <Badge variant="outline" className="whitespace-nowrap border-slate-200 bg-slate-50 font-normal text-slate-600">
            {fmt(row.original.internalStatus)}
          </Badge>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <PackageX className="h-3.5 w-3.5" /> no existe
          </span>
        ),
    },
    {
      id: "fedex",
      header: "FedEx",
      cell: ({ row }) => {
        const f = row.original.fedex;
        if (!f.found || f.error) return <span className="text-xs text-amber-600">sin verificar</span>;
        return (
          <Badge variant="outline" className="whitespace-nowrap border-sky-200 bg-sky-50 font-normal text-sky-700">
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
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 font-normal text-emerald-700">
              {formatCurrency(r.income.cost)}
            </Badge>
          );
        if (r.incomeRepairNeeded)
          return (
            <Badge variant="outline" className="border-rose-200 bg-rose-50 font-normal text-rose-700">
              Falta
            </Badge>
          );
        return <span className="text-xs text-slate-400">—</span>;
      },
    },
    {
      id: "veredicto",
      header: "Veredicto",
      cell: ({ row }) => (row.original.shipment ? <VerdictBadge verdict={row.original.verdict} /> : <span className="text-xs text-slate-400">—</span>),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        if (!r.shipment) {
          return (
            <div className="flex justify-end gap-1.5">
              <FedexPeek r={r} />
              <Button size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={() => h.onAddIncome(r.tracking)}>
                <PlusCircle className="h-3.5 w-3.5" /> Dar de alta ingreso
              </Button>
            </div>
          );
        }
        const id = r.shipment.id;
        const canStatus = canFixStatus(r);
        const canIncome = r.incomeRepairNeeded;
        const mis = !!r.income && !!h.selectedSubsidiaryId && r.income.subsidiaryId !== h.selectedSubsidiaryId;
        return (
          <div className="flex justify-end gap-1.5">
            <IconAction label="Ver trazabilidad del paquete" icon={ListOrdered} disabled={h.busy !== null} onClick={() => h.onTimeline(r)} />
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
              <IconAction label="Editar fecha del ingreso" icon={CalendarClock} disabled={h.busy !== null} onClick={() => h.onDate(r)} />
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

export function SearchPackageView({ selectedSubsidiaryId, onFixed, onAddIncome }: Props) {
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

  const isMisassigned = (r: SearchBatchItem) => !!r.income && !!selectedSubsidiaryId && r.income.subsidiaryId !== selectedSubsidiaryId;

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

  const anyActionable = results.some((r) => (r.shipment && canFixStatus(r)) || r.incomeRepairNeeded || isMisassigned(r));

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
    () => buildColumns({ reasonOk, busy, selectedSubsidiaryId, selectedName, onStatus, onIncome, onMove, onDate, onTimeline, onAddIncome }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reasonOk, busy, selectedSubsidiaryId, selectedName, reason, results],
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-w-0 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Buscar paquetes</p>
              <p className="text-xs text-slate-400">Estatus interno vs FedEx, ingreso ligado y veredicto por guía</p>
            </div>
          </div>
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
            className="mt-1 resize-none bg-slate-50/60"
            placeholder={"T123...\nT456..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-2 flex justify-end">
            <Button onClick={doSearch} disabled={searching || parsed.length === 0} size="sm" className="gap-2">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </Button>
          </div>
        </div>

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
      <StatusTimelineDialog open={!!timelineItem} onOpenChange={(o) => !o && setTimelineItem(null)} tracking={timelineItem?.tracking ?? null} />
    </TooltipProvider>
  );
}
