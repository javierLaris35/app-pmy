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
import { SearchPackageView } from "@/components/consolidador/search-package-view";
import { GroupsView } from "@/components/consolidador/groups-view";
import { HistoryDialog } from "@/components/consolidador/history-dialog";
import { AnomaliesDialog } from "@/components/consolidador/anomalies-dialog";
import { CobrosAuditPanel } from "@/components/consolidador/cobros-audit-panel";
import { ManualCountPanel } from "@/components/consolidador/manual-count-panel";
import { useAuthStore } from "@/store/auth.store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getConsolidadorColumns, SOURCE_FILTER_OPTIONS } from "./columns";
import { patchIncomeCost, patchSecondAbord, createManualIncome, deleteIncome, editIncomeDate } from "@/lib/services/consolidador";
import { getWeekRange, shiftWeek, formatWeekLabel, isCurrentWeek } from "@/lib/week";
import { Subsidiary } from "@/lib/types";
import { ConsolidadorRow, ManualKind } from "@/lib/types/consolidador";
import { toast } from "@/lib/toast";
import { SlidersHorizontal, Loader2, PlusCircle, History, AlertTriangle } from "lucide-react";

type TabKey = "por-ruta" | "por-consolidado" | "ingresos" | "buscar" | "auditoria" | "conteo";

function ConsolidadorPage() {
  const [subsidiaryId, setSubsidiaryId] = useState<string>("");
  const [week, setWeek] = useState(() => getWeekRange());
  const [consNumber, setConsNumber] = useState("");
  const [routeId, setRouteId] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addDefaultTracking, setAddDefaultTracking] = useState<string | undefined>(undefined);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [anomaliesOpen, setAnomaliesOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("por-ruta");
  // "Conteo manual vs sistema" es solo para superadmin (expone detalle interno y prompt).
  const role = String(useAuthStore((s) => s.user)?.role ?? "").toLowerCase();
  const isGlobal = ["superadmin", "superamin", "owner"].includes(role);

  // Consulta filtrada (server: consolidado/ruta) → tabla plana + KPIs.
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

  const openAddForTracking = useCallback((tracking: string) => {
    setAddDefaultTracking(tracking);
    setAddOpen(true);
  }, []);

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
      <div className="relative flex min-h-screen flex-col gap-4 p-4 md:p-5">
        {isLoading && tab === "ingresos" && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-lg">
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
              <Button onClick={() => { setAddDefaultTracking(undefined); setAddOpen(true); }} disabled={!subsidiaryId} className="gap-2">
                <PlusCircle className="h-4 w-4" /> Agregar ingreso
              </Button>
            </div>
          }
        />

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

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="por-ruta">Por ruta</TabsTrigger>
            <TabsTrigger value="por-consolidado">Por consolidado</TabsTrigger>
            <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
            <TabsTrigger value="buscar">Buscar paquete</TabsTrigger>
            <TabsTrigger value="auditoria">Auditoría de cobros</TabsTrigger>
            {isGlobal && <TabsTrigger value="conteo">Conteo manual</TabsTrigger>}
          </TabsList>

          <TabsContent value="por-ruta" className="mt-4">
            <GroupsView mode="route" subsidiaryId={subsidiaryId} from={week.from} to={week.to} active={tab === "por-ruta"} onFixed={() => mutate()} />
          </TabsContent>

          <TabsContent value="por-consolidado" className="mt-4">
            <GroupsView mode="consolidado" subsidiaryId={subsidiaryId} from={week.from} to={week.to} active={tab === "por-consolidado"} onFixed={() => mutate()} />
          </TabsContent>

          <TabsContent value="ingresos" className="mt-4 flex flex-col gap-4">
            <ConsolidadorKpis buckets={data?.buckets} />
            {!subsidiaryId ? (
              <div className="rounded-md border bg-white py-16 text-center text-sm text-slate-400">
                Selecciona una sucursal para comenzar
              </div>
            ) : (
              <DataTable columns={columns} data={data?.rows ?? []} filters={tableFilters} autoResetPageIndex={false} />
            )}
          </TabsContent>

          <TabsContent value="buscar" className="mt-4">
            <SearchPackageView selectedSubsidiaryId={subsidiaryId} onFixed={() => mutate()} onAddIncome={openAddForTracking} />
          </TabsContent>

          <TabsContent value="auditoria" className="mt-4">
            <CobrosAuditPanel subsidiaryId={subsidiaryId} from={week.from} to={week.to} active={tab === "auditoria"} onFixed={() => mutate()} />
          </TabsContent>

          {isGlobal && (
            <TabsContent value="conteo" className="mt-4">
              <ManualCountPanel subsidiaryId={subsidiaryId} from={week.from} to={week.to} />
            </TabsContent>
          )}
        </Tabs>

        <AddIncomeDialog open={addOpen} onOpenChange={setAddOpen} week={week} defaultTracking={addDefaultTracking} onSubmit={handleAddIncome} />
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
