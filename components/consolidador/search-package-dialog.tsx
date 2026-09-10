"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { formatCurrency } from "@/lib/utils";
import {
  searchPackageBatch,
  fixPackageStatus,
  repairPackageIncome,
  reassignIncomeSubsidiary,
} from "@/lib/services/consolidador";
import { canFixStatus, parseTrackingList, MAX_BATCH_TRACKINGS } from "@/lib/consolidador/validation";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
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

interface Handlers {
  reasonOk: boolean;
  busy: string | null;
  selectedSubsidiaryId: string;
  selectedName: string;
  onStatus: (r: SearchBatchItem) => void;
  onIncome: (r: SearchBatchItem) => void;
  onMove: (r: SearchBatchItem) => void;
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
        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-normal">
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
          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 font-normal">
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
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              disabled={!canStatus || !h.reasonOk || h.busy !== null}
              onClick={() => h.onStatus(r)}
            >
              {h.busy === `${id}:status` ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Estatus
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              disabled={!canIncome || !h.reasonOk || h.busy !== null}
              onClick={() => h.onIncome(r)}
            >
              {h.busy === `${id}:income` ? <Loader2 className="h-3 w-3 animate-spin" /> : <DollarSign className="h-3 w-3" />}
              Ingreso
            </Button>
            {mis && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                disabled={!h.reasonOk || h.busy !== null}
                onClick={() => h.onMove(r)}
                title={`Mover a ${h.selectedName}`}
              >
                {h.busy === `${r.income!.id}:move` ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ArrowRightLeft className="h-3 w-3" />
                )}
                Mover aquí
              </Button>
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

  const columns = useMemo(
    () => buildColumns({ reasonOk, busy, selectedSubsidiaryId, selectedName, onStatus, onIncome, onMove }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reasonOk, busy, selectedSubsidiaryId, selectedName, reason, results],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-slate-500" />
            Buscar paquetes — estatus e ingresos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
            <div className="space-y-1.5">
              <Label htmlFor="batch-reason" className="text-xs font-semibold text-slate-600">
                Motivo <span className="font-normal text-slate-400">(aplica a la acción que ejecutes)</span>
              </Label>
              <Textarea
                id="batch-reason"
                rows={2}
                className="resize-none"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo"
              />
            </div>
          )}

          {/* Resultados */}
          {results.length > 0 && <DataTable columns={columns} data={results} autoResetPageIndex={false} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
