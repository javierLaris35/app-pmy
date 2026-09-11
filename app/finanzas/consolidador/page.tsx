"use client";

import React, { useCallback, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { SucursalSelector } from "@/components/sucursal-selector";
import { DataTable } from "@/components/data-table/data-table";
import { withAuth } from "@/hoc/withAuth";
import { useConsolidadorWeek } from "@/hooks/services/consolidador/use-consolidador";
import { ConsolidadorToolbar } from "@/components/consolidador/consolidador-toolbar";
import { ConsolidadorKpis } from "@/components/consolidador/consolidador-kpis";
import { RowActions } from "@/components/consolidador/row-actions";
import { AddIncomeDialog } from "@/components/consolidador/add-income-dialog";
import { SearchPackageDialog } from "@/components/consolidador/search-package-dialog";
import { HistoryDialog } from "@/components/consolidador/history-dialog";
import { AnomaliesDialog } from "@/components/consolidador/anomalies-dialog";
import { Button } from "@/components/ui/button";
import { getConsolidadorColumns, SOURCE_FILTER_OPTIONS } from "./columns";
import { patchIncomeCost, patchSecondAbord, createManualIncome, deleteIncome, editIncomeDate } from "@/lib/services/consolidador";
import { getWeekRange, shiftWeek, formatWeekLabel, isCurrentWeek } from "@/lib/week";
import { Subsidiary } from "@/lib/types";
import { ConsolidadorRow, ManualKind } from "@/lib/types/consolidador";
import { toast } from "@/lib/toast";
import { SlidersHorizontal, Loader2, PlusCircle, Search, History, AlertTriangle } from "lucide-react";

function ConsolidadorPage() {
  const [subsidiaryId, setSubsidiaryId] = useState<string>("");
  const [week, setWeek] = useState(() => getWeekRange());
  const [consNumber, setConsNumber] = useState("");
  const [routeId, setRouteId] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [anomaliesOpen, setAnomaliesOpen] = useState(false);

  // Consulta filtrada (server: consolidado/ruta) → tabla + KPIs.
  const { data, isLoading, mutate } = useConsolidadorWeek(subsidiaryId, week.from, week.to, { consNumber, routeId });
  // Consulta base sin filtros → opciones de los popovers (SWR deduplica si no hay filtros).
  const { data: base } = useConsolidadorWeek(subsidiaryId, week.from, week.to, {});

  const handleEditCost = useCallback(
    async (id: string, cost: number, reason: string) => {
      try {
        await patchIncomeCost(id, cost, reason);
        await mutate();
        toast.success("Costo actualizado");
      } catch {
        toast.error("No se pudo actualizar el costo");
      }
    },
    [mutate],
  );

  const handleToggleSecondAbord = useCallback(
    async (id: string, enabled: boolean, reason: string) => {
      try {
        await patchSecondAbord(id, enabled, reason);
        await mutate();
        toast.success(enabled ? "2º a bordo agregado" : "2º a bordo quitado");
      } catch {
        toast.error("No se pudo ajustar el 2º a bordo");
      }
    },
    [mutate],
  );

  const handleAddIncome = useCallback(
    async (payload: { kind: ManualKind; trackingNumber?: string; cost: number; date: string; reason: string }) => {
      try {
        await createManualIncome({ subsidiaryId, ...payload });
        await mutate();
        toast.success("Ingreso agregado");
      } catch (e: any) {
        if (e?.response?.status === 409) toast.error("Ya existe un ingreso equivalente ese día para esa guía");
        else toast.error("No se pudo agregar el ingreso");
        throw e; // el dialog no cierra si falló
      }
    },
    [subsidiaryId, mutate],
  );

  const handleEditDate = useCallback(
    async (id: string, date: string, reason: string) => {
      try {
        await editIncomeDate(id, date, reason);
        await mutate();
        toast.success("Fecha actualizada");
      } catch {
        toast.error("No se pudo actualizar la fecha");
      }
    },
    [mutate],
  );

  const handleDelete = useCallback(
    async (id: string, reason: string) => {
      try {
        await deleteIncome(id, reason);
        await mutate();
        toast.success("Ingreso eliminado");
      } catch {
        toast.error("No se pudo eliminar el ingreso");
      }
    },
    [mutate],
  );

  const renderActions = useCallback(
    (row: ConsolidadorRow) => (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Historial" onClick={() => setHistoryId(row.id)}>
          <History className="h-4 w-4 text-slate-500" />
        </Button>
        <RowActions
          row={row}
          onEditCost={handleEditCost}
          onToggleSecondAbord={handleToggleSecondAbord}
          onEditDate={handleEditDate}
          onDelete={handleDelete}
        />
      </div>
    ),
    [handleEditCost, handleToggleSecondAbord, handleEditDate, handleDelete],
  );

  const columns = useMemo(() => getConsolidadorColumns({ renderActions }), [renderActions]);

  const consOptions = useMemo(() => {
    const set = new Set<string>();
    base?.rows.forEach((r) => r.consNumber && set.add(r.consNumber));
    return [...set].sort();
  }, [base]);

  const routeOptions = useMemo(() => {
    const set = new Set<string>();
    base?.rows.forEach((r) => r.routeId && set.add(r.routeId));
    return [...set].map((id) => ({ id, label: `Ruta …${id.slice(-6)}` }));
  }, [base]);

  // Opciones del filtro facetado de Estatus, derivadas de los datos reales.
  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    data?.rows.forEach((r) => r.shipmentStatus && set.add(r.shipmentStatus));
    return [...set].sort().map((v) => ({ label: v.replace(/_/g, " "), value: v }));
  }, [data]);

  const tableFilters = useMemo(
    () => [
      { columnId: "sourceType", title: "Tipo de ingreso", options: SOURCE_FILTER_OPTIONS },
      { columnId: "shipmentStatus", title: "Estatus", options: statusOptions },
    ],
    [statusOptions],
  );

  return (
    <AppLayout>
      <div className="relative flex flex-col gap-3 p-4 bg-slate-50/30 min-h-screen">
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-lg shadow-lg border border-slate-100">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-slate-600">Cargando consolidado...</p>
            </div>
          </div>
        )}

        <OperationHeader
          icon={SlidersHorizontal}
          title="Consolidador de Finanzas"
          description="Concilia ingresos por sucursal y semana"
          actions={
            <div className="flex items-center gap-2">
              <SucursalSelector
                value={subsidiaryId}
                onValueChange={(val) => {
                  const id = typeof val === "string" ? val : (val as Subsidiary).id;
                  setSubsidiaryId(id ?? "");
                }}
              />
              <Button
                variant="outline"
                onClick={() => setAnomaliesOpen(true)}
                disabled={!subsidiaryId}
                className="gap-2 border-amber-300 bg-white text-amber-700 hover:bg-amber-50"
              >
                <AlertTriangle className="h-4 w-4" /> Anomalías
              </Button>
              <Button variant="outline" onClick={() => setSearchOpen(true)} className="gap-2 bg-white">
                <Search className="h-4 w-4" /> Buscar paquete
              </Button>
              <Button onClick={() => setAddOpen(true)} disabled={!subsidiaryId} className="gap-2">
                <PlusCircle className="h-4 w-4" /> Agregar ingreso
              </Button>
            </div>
          }
        />

        {/* Barra compacta: semana + filtros de consolidado/ruta */}
        <ConsolidadorToolbar
          weekLabel={formatWeekLabel(week)}
          isCurrentWeek={isCurrentWeek(week)}
          onPrevWeek={() => setWeek((w) => shiftWeek(w, -1))}
          onNextWeek={() => setWeek((w) => shiftWeek(w, 1))}
          consNumber={consNumber}
          routeId={routeId}
          onConsChange={setConsNumber}
          onRouteChange={setRouteId}
          consOptions={consOptions}
          routeOptions={routeOptions}
        />

        <ConsolidadorKpis buckets={data?.buckets} />

        {!subsidiaryId ? (
          <div className="rounded-md border bg-white py-16 text-center text-sm text-slate-400">
            Selecciona una sucursal para comenzar
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.rows ?? []}
            filters={tableFilters}
            autoResetPageIndex={false}
          />
        )}

        <AddIncomeDialog open={addOpen} onOpenChange={setAddOpen} week={week} onSubmit={handleAddIncome} />
        <SearchPackageDialog open={searchOpen} onOpenChange={setSearchOpen} selectedSubsidiaryId={subsidiaryId} onFixed={() => mutate()} />
        <HistoryDialog incomeId={historyId} open={!!historyId} onOpenChange={(o) => !o && setHistoryId(null)} />
        <AnomaliesDialog
          open={anomaliesOpen}
          onOpenChange={setAnomaliesOpen}
          subsidiaryId={subsidiaryId}
          week={week}
          onChanged={() => mutate()}
        />
      </div>
    </AppLayout>
  );
}

export default withAuth(ConsolidadorPage, "finanzas.consolidador");
