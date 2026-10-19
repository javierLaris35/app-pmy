"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { AlertTriangle, CalendarCheck2, ChevronDown, PlusCircle, Search, SlidersHorizontal } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConsolidadorToolbar } from "@/components/consolidador/consolidador-toolbar";
import { AddIncomeDialog } from "@/components/consolidador/add-income-dialog";
import { AnomaliesDialog } from "@/components/consolidador/anomalies-dialog";
import { ManualCountPanel } from "@/components/consolidador/manual-count-panel";
import { DateRealignDialog } from "@/components/consolidador/date-realign-dialog";
import { ScopeSwitcher } from "@/components/consolidador/scope-switcher";
import { SubsidiaryPills } from "@/components/consolidador/subsidiary-pills";
import { SearchSheet } from "@/components/consolidador/search-sheet";
import { SummaryView } from "@/components/consolidador/summary-view";
import { AuditTab } from "@/components/consolidador/audit-tab";
import { DetailTab } from "@/components/consolidador/detail-tab";
import { useScopedView } from "@/hooks/services/consolidador/use-scoped-view";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/access/permissions";
import { createManualIncome } from "@/lib/services/consolidador";
import { EMPTY_SCOPE, loadScope, saveScope, scopeReady, type ConsolidadorScope } from "@/lib/consolidador/scope";
import { errorText, focusParts, sumParts } from "@/lib/consolidador/zone-merge";
import { getWeekRange, shiftWeek, formatWeekLabel, isCurrentWeek } from "@/lib/week";
import type { ManualKind } from "@/lib/types/consolidador";
import type { ScopeSubsidiary, SubsidiarySummary } from "@/lib/types/consolidador-zone";
import { toast } from "@/lib/toast";

type TabKey = "resumen" | "conteo" | "auditoria" | "detalle";

const isConsolidadorKey = (key: unknown) =>
  typeof key === "string" ? key.startsWith("/consolidador") : Array.isArray(key) && String(key[0] ?? "").startsWith("/consolidador");

const Count = ({ n, tone }: { n: number; tone: "rose" | "amber" }) =>
  n ? (
    <span className={`ml-1.5 rounded-full px-1.5 text-[10px] font-semibold ${tone === "rose" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{n}</span>
  ) : null;

function ConsolidadorPage() {
  const [scope, setScopeState] = useState<ConsolidadorScope>(EMPTY_SCOPE);
  const [week, setWeek] = useState(() => getWeekRange());
  const [tab, setTab] = useState<TabKey>("resumen");
  const [addOpen, setAddOpen] = useState(false);
  const [addDefaultTracking, setAddDefaultTracking] = useState<string | undefined>(undefined);
  const [anomaliesOpen, setAnomaliesOpen] = useState(false);
  const [realignOpen, setRealignOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const role = String(user?.role ?? "").toLowerCase();
  const isGlobal = ["superadmin", "superamin", "owner"].includes(role);
  const canCount = hasPermission(user as any, "finanzas.consolidador.conteoManual");
  const { subsidiaries } = useSubsidiaries();
  const { mutate: globalMutate } = useSWRConfig();

  // El alcance se recuerda por navegador (se lee al montar para no chocar con el render del servidor).
  useEffect(() => setScopeState(loadScope()), []);
  const setScope = useCallback((s: ConsolidadorScope) => {
    setScopeState(s);
    saveScope(s);
  }, []);

  const ready = scopeReady(scope);
  const summary = useScopedView<SubsidiarySummary>(scope, week.from, week.to, "summary", ready, (subsidiaries ?? []).find((s: any) => s.id === scope.subsidiaryId)?.name ?? "");
  const focus = scope.mode === "zone" ? scope.focusSubsidiaryId : null;
  const shown = focusParts(summary.parts, focus);
  // Sucursal concreta para las acciones que trabajan sobre una sola (agregar ingreso, anomalías, corregir fechas).
  const actionSubId = scope.mode === "subsidiary" ? scope.subsidiaryId : focus ?? "";
  const actionSubName = (subsidiaries ?? []).find((s: any) => s.id === actionSubId)?.name;
  const needsSub = !actionSubId ? "Elige una sucursal en las pastillas de abajo" : undefined;

  const detailSubs = useMemo<ScopeSubsidiary[]>(() => {
    if (scope.mode === "subsidiary") return scope.subsidiaryId ? [{ id: scope.subsidiaryId, name: actionSubName ?? "" }] : [];
    return shown.map((p) => ({ id: p.subsidiaryId, name: p.subsidiaryName }));
  }, [scope.mode, scope.subsidiaryId, actionSubName, shown]);

  const refreshAll = useCallback(() => void globalMutate(isConsolidadorKey), [globalMutate]);

  // Ctrl K abre el buscador de guías.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (tab === "conteo" && !canCount) setTab("resumen");
  }, [tab, canCount]);

  const handleAddIncome = useCallback(
    async (payload: { kind: ManualKind; trackingNumber?: string; cost: number; date: string; reason: string }) => {
      try {
        await createManualIncome({ subsidiaryId: actionSubId, ...payload });
        refreshAll();
        toast.success("Ingreso agregado");
      } catch (e: any) {
        if (e?.response?.status === 409) toast.error("Ya existe un ingreso equivalente ese día para esa guía");
        else toast.error(errorText(e, "No se pudo agregar el ingreso"));
        throw e; // el dialog no cierra si falló
      }
    },
    [actionSubId, refreshAll],
  );

  const openAddForTracking = useCallback((tracking: string) => {
    setAddDefaultTracking(tracking);
    setAddOpen(true);
  }, []);

  const zoneError = summary.error ? errorText(summary.error, "No se pudo cargar la zona") : null;

  return (
    <AppLayout>
      <div className="relative flex min-h-screen flex-col gap-3 p-4 md:p-5">
        <OperationHeader
          icon={SlidersHorizontal}
          title="Consolidador de Finanzas"
          description="Revisa cobros por zona o por sucursal, semana lunes a domingo"
          actions={
            <div className="flex items-center gap-2">
              <ScopeSwitcher scope={scope} onChange={setScope} />
              <Button variant="outline" size="icon" className="h-8 w-8 text-slate-600" onClick={() => setSearchOpen(true)} title="Buscar guía (Ctrl K)" aria-label="Buscar guía">
                <Search className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    Más acciones <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled={!actionSubId} onSelect={() => setAnomaliesOpen(true)} title={needsSub}>
                    <AlertTriangle className="mr-2 h-4 w-4 text-amber-600" /> Anomalías{actionSubName ? ` · ${actionSubName}` : ""}
                  </DropdownMenuItem>
                  {isGlobal && (
                    <DropdownMenuItem disabled={!actionSubId} onSelect={() => setRealignOpen(true)} title={needsSub}>
                      <CalendarCheck2 className="mr-2 h-4 w-4 text-sky-600" /> Corregir fechas{actionSubName ? ` · ${actionSubName}` : ""}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => {
                  setAddDefaultTracking(undefined);
                  setAddOpen(true);
                }}
                disabled={!actionSubId}
                title={needsSub}
                size="sm"
                className="gap-2"
              >
                <PlusCircle className="h-4 w-4" /> Agregar ingreso
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <ConsolidadorToolbar
            weekLabel={formatWeekLabel(week)}
            isCurrentWeek={isCurrentWeek(week)}
            onPrevWeek={() => setWeek((w) => shiftWeek(w, -1))}
            onNextWeek={() => setWeek((w) => shiftWeek(w, 1))}
            consNumber=""
            routeId=""
            onConsChange={() => undefined}
            onRouteChange={() => undefined}
            consOptions={[]}
            routeOptions={[]}
            hideFilters
          />
          {scope.mode === "zone" && (
            <SubsidiaryPills parts={summary.parts} focus={scope.focusSubsidiaryId} onFocus={(id) => setScope({ ...scope, focusSubsidiaryId: id })} />
          )}
        </div>

        {!ready ? (
          <div className="rounded-md border bg-white py-16 text-center text-sm text-slate-400">Elige una zona o una sucursal para comenzar</div>
        ) : zoneError ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 py-10 text-center text-sm text-amber-800">{zoneError}</div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList>
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
              {canCount && <TabsTrigger value="conteo">Conteo manual</TabsTrigger>}
              <TabsTrigger value="auditoria">
                Auditoría de cobros
                <Count n={sumParts(shown, (s) => s.missing.count + s.extra.count)} tone="amber" />
              </TabsTrigger>
              <TabsTrigger value="detalle">Detalle</TabsTrigger>
            </TabsList>

            <TabsContent value="resumen" className="mt-3">
              <SummaryView
                parts={shown}
                isLoading={summary.isLoading}
                weekLabel={formatWeekLabel(week)}
                onRetry={() => void summary.mutate()}
                onFocus={(id) => scope.mode === "zone" && setScope({ ...scope, focusSubsidiaryId: id })}
              />
            </TabsContent>

            {canCount && (
              <TabsContent value="conteo" className="mt-3">
                <ManualCountPanel
                  key={`${scope.mode}-${scope.zoneId}-${actionSubId}`}
                  subsidiaryId={actionSubId}
                  zoneId={scope.mode === "zone" ? scope.zoneId : null}
                  from={week.from}
                  to={week.to}
                />
              </TabsContent>
            )}

            <TabsContent value="auditoria" className="mt-3">
              <AuditTab scope={scope} from={week.from} to={week.to} active={tab === "auditoria"} summary={summary.parts} onChanged={refreshAll} />
            </TabsContent>

            <TabsContent value="detalle" className="mt-3">
              <DetailTab subsidiaries={detailSubs} summary={summary.parts} from={week.from} to={week.to} active={tab === "detalle"} onChanged={refreshAll} />
            </TabsContent>
          </Tabs>
        )}

        <AddIncomeDialog open={addOpen} onOpenChange={setAddOpen} week={week} defaultTracking={addDefaultTracking} onSubmit={handleAddIncome} />
        <SearchSheet open={searchOpen} onOpenChange={setSearchOpen} subsidiaryId={actionSubId} onFixed={refreshAll} onAddIncome={openAddForTracking} />
        <AnomaliesDialog open={anomaliesOpen} onOpenChange={setAnomaliesOpen} subsidiaryId={actionSubId} week={week} onChanged={refreshAll} />
        {isGlobal && <DateRealignDialog open={realignOpen} onOpenChange={setRealignOpen} subsidiaryId={actionSubId} week={week} onChanged={refreshAll} />}
      </div>
    </AppLayout>
  );
}

export default withAuth(ConsolidadorPage, "finanzas.consolidador");
