"use client";

import React, { useCallback, useMemo, useState } from "react";
import { History } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { PmyLoader } from "@/components/ui/pmy-loader";
import { ConsolidadorKpis } from "@/components/consolidador/consolidador-kpis";
import { RowActions } from "@/components/consolidador/row-actions";
import { HistoryDialog } from "@/components/consolidador/history-dialog";
import { useConsolidadorWeek } from "@/hooks/services/consolidador/use-consolidador";
import { getConsolidadorColumns, SOURCE_FILTER_OPTIONS } from "@/app/finanzas/consolidador/columns";
import { deleteIncome, editIncomeDate, patchIncomeCost, patchSecondAbord } from "@/lib/services/consolidador";
import { ConsolidadorRow } from "@/lib/types/consolidador";
import { toast } from "@/lib/toast";

interface Props {
  subsidiaryId: string;
  from: string;
  to: string;
  /** Tras editar: refresca el Resumen y las demás vistas. */
  onChanged: () => void;
  /** Dentro de un grupo de zona los KPIs del bucket se omiten (van en el encabezado). */
  compact?: boolean;
}

/** Ingresos de la semana de una sucursal: tabla plana editable (costo, 2º a bordo, fecha, borrar, historial). */
export function IncomeWeekTable({ subsidiaryId, from, to, onChanged, compact = false }: Props) {
  const { data, isLoading, mutate } = useConsolidadorWeek(subsidiaryId, from, to, {});
  const [historyId, setHistoryId] = useState<string | null>(null);

  const run = useCallback(
    async (fn: () => Promise<unknown>, ok: string, fail: string) => {
      try {
        await fn();
        await mutate();
        onChanged();
        toast.success(ok);
      } catch {
        toast.error(fail);
      }
    },
    [mutate, onChanged],
  );

  const renderActions = useCallback(
    (row: ConsolidadorRow) => (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Historial" onClick={() => setHistoryId(row.id)}>
          <History className="h-4 w-4 text-slate-500" />
        </Button>
        <RowActions
          row={row}
          onEditCost={(id, cost, reason) => run(() => patchIncomeCost(id, cost, reason), "Costo actualizado", "No se pudo actualizar el costo")}
          onToggleSecondAbord={(id, enabled, reason) =>
            run(() => patchSecondAbord(id, enabled, reason), enabled ? "2º a bordo agregado" : "2º a bordo quitado", "No se pudo ajustar el 2º a bordo")
          }
          onEditDate={(id, date, reason) => run(() => editIncomeDate(id, date, reason), "Fecha actualizada", "No se pudo actualizar la fecha")}
          onDelete={(id, reason) => run(() => deleteIncome(id, reason), "Ingreso eliminado", "No se pudo eliminar el ingreso")}
        />
      </div>
    ),
    [run],
  );

  const columns = useMemo(() => getConsolidadorColumns({ renderActions }), [renderActions]);
  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    data?.rows.forEach((r) => r.shipmentStatus && set.add(r.shipmentStatus));
    return [...set].sort().map((v) => ({ label: v.replace(/_/g, " "), value: v }));
  }, [data]);
  const filters = useMemo(
    () => [
      { columnId: "sourceType", title: "Tipo de ingreso", options: SOURCE_FILTER_OPTIONS },
      { columnId: "shipmentStatus", title: "Estatus", options: statusOptions },
    ],
    [statusOptions],
  );

  if (isLoading && !data) return <PmyLoader size="sm" text="Cargando ingresos…" className="py-10" />;
  return (
    <div className={compact ? "flex flex-col gap-3 p-2" : "flex flex-col gap-4"}>
      {!compact && <ConsolidadorKpis buckets={data?.buckets} />}
      <DataTable columns={columns} data={data?.rows ?? []} filters={filters} autoResetPageIndex={false} />
      <HistoryDialog incomeId={historyId} open={!!historyId} onOpenChange={(o) => !o && setHistoryId(null)} />
    </div>
  );
}
