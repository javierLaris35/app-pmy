"use client";

import { useMemo, useState } from "react";
import { GroupCard, GroupRowHandlers } from "@/components/consolidador/group-card";
import { HistoryDialog } from "@/components/consolidador/history-dialog";
import { StatusTimelineDialog } from "@/components/consolidador/status-timeline-dialog";
import { useConsolidadorGroups, GroupsMode } from "@/hooks/services/consolidador/use-consolidador-groups";
import { useWarehouseKpi } from "@/hooks/services/consolidador/use-warehouse-kpi";
import {
  fixPackageStatus,
  deleteIncome,
  patchIncomeCost,
  patchSecondAbord,
  editIncomeDate,
  repairPackageIncome,
} from "@/lib/services/consolidador";
import { ConsolidadorGroup, ConsolidadorGroupRow, SuggestedAction } from "@/lib/types/consolidador";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Route, PackageCheck, Search, X, Warehouse } from "lucide-react";

interface Props {
  mode: GroupsMode;
  subsidiaryId: string;
  from: string;
  to: string;
  active: boolean;
  onFixed: () => void;
}

type EstadoFilter = "todos" | "anomalias" | "descuadre" | "faltantes" | "ok";

const VERDICT_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Todos los veredictos" },
  { value: "income_missing", label: "Falta cobrar" },
  { value: "fedex_delivery_doubtful", label: "Cobro dudoso" },
  { value: "delivered_by_us", label: "Lo entregamos nosotros" },
  { value: "income_without_support", label: "Cobro sin respaldo" },
  { value: "status_regressed", label: "Volvió a tránsito" },
  { value: "date_mismatch", label: "Fecha no coincide" },
];

const ESTADO_OPTIONS: { value: EstadoFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "anomalias", label: "Con anomalías" },
  { value: "descuadre", label: "Con descuadre" },
  { value: "faltantes", label: "Con faltantes de cobro" },
  { value: "ok", label: "Todo OK" },
];

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-800">{value}</p>
    </div>
  );
}

function WarehouseStat({ subsidiaryId, active }: { subsidiaryId: string; active: boolean }) {
  const { data } = useWarehouseKpi(subsidiaryId, active);
  const potential = data?.potentialAmount ?? 0;
  const count = data?.count ?? 0;
  const d3to5 = data?.aging.d3to5 ?? 0;
  const d6plus = data?.aging.d6plus ?? 0;
  const aged = d3to5 + d6plus;
  return (
    <div className={`rounded-lg border px-3 py-2 ${aged > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        <Warehouse className="h-3 w-3" /> En bodega (44/67)
      </p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${aged > 0 ? "text-amber-700" : "text-slate-800"}`}>
        {formatCurrency(potential)}
      </p>
      <p className="text-[10px] text-slate-500">
        {count} paquetes{aged > 0 ? ` · ${d3to5} de 3-5 d · ${d6plus} de 6+ d` : ""}
      </p>
    </div>
  );
}

export function GroupsView({ mode, subsidiaryId, from, to, active, onFixed }: Props) {
  const { data, isLoading, mutate } = useConsolidadorGroups(mode, subsidiaryId, from, to, active);
  const groups = useMemo(() => data?.groups ?? [], [data]);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [timelineTracking, setTimelineTracking] = useState<string | null>(null);

  const [estado, setEstado] = useState<EstadoFilter>("todos");
  const [query, setQuery] = useState("");
  const [driver, setDriver] = useState("all");
  const [verdict, setVerdict] = useState("all");

  const driverOptions = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => g.meta.driver && set.add(g.meta.driver));
    return [...set].sort();
  }, [groups]);

  // Aplica filtros: por fila (guía/veredicto) y por grupo (estado/chofer).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rowFilterActive = !!q || verdict !== "all";
    const out: { group: ConsolidadorGroup; rows: ConsolidadorGroupRow[] }[] = [];
    for (const g of groups) {
      if (driver !== "all" && g.meta.driver !== driver) continue;
      if (estado === "anomalias" && g.kpis.anomalyCount === 0) continue;
      if (estado === "descuadre" && g.kpis.chargeDiscrepancy === 0) continue;
      if (estado === "faltantes" && !(g.kpis.chargeMissing > 0 || g.rows.some((r) => r.verdict.code === "income_missing"))) continue;
      if (estado === "ok" && !(g.kpis.anomalyCount === 0 && g.kpis.chargeDiscrepancy === 0)) continue;

      let rows = g.rows;
      if (q) rows = rows.filter((r) => (r.tracking ?? "").toLowerCase().includes(q));
      if (verdict !== "all") rows = rows.filter((r) => r.verdict.code === verdict);
      if (rowFilterActive && rows.length === 0) continue;
      out.push({ group: g, rows });
    }
    return out;
  }, [groups, estado, query, driver, verdict]);

  const rowFilterActive = !!query.trim() || verdict !== "all";
  const hasFilters = estado !== "todos" || !!query.trim() || driver !== "all" || verdict !== "all";
  const clearFilters = () => {
    setEstado("todos");
    setQuery("");
    setDriver("all");
    setVerdict("all");
  };

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, { group: g }) => ({
          delivered: acc.delivered + g.kpis.delivered,
          notDelivered: acc.notDelivered + g.kpis.notDelivered,
          income: acc.income + g.kpis.incomeAmount,
          anomalies: acc.anomalies + g.kpis.anomalyCount,
        }),
        { delivered: 0, notDelivered: 0, income: 0, anomalies: 0 },
      ),
    [filtered],
  );

  const refresh = async () => {
    await mutate();
    onFixed();
  };

  const handlers: GroupRowHandlers = useMemo(
    () => ({
      onVerdictAction: async (row: ConsolidadorGroupRow, action: SuggestedAction, reason: string) => {
        try {
          if (action.kind === "fix_status" && row.shipmentId) {
            await fixPackageStatus(row.shipmentId, action.to, reason);
            toast.success(`Estatus corregido: ${row.tracking}`);
          } else if (action.kind === "repair_income" && row.shipmentId) {
            const res = await repairPackageIncome(row.shipmentId, reason);
            if (res.created) toast.success(`Cobro generado: ${row.tracking}`);
            else toast.error(res.reason ?? "No se generó el cobro");
          } else if (action.kind === "delete_income" && row.income) {
            await deleteIncome(row.income.id, reason);
            toast.success(`Cobro eliminado: ${row.tracking}`);
          }
          await refresh();
        } catch (e: any) {
          toast.error(e?.response?.data?.message ?? "No se pudo aplicar la acción");
        }
      },
      onEditCost: async (id, cost, reason) => {
        try {
          await patchIncomeCost(id, cost, reason);
          await refresh();
          toast.success("Costo actualizado");
        } catch {
          toast.error("No se pudo actualizar el costo");
        }
      },
      onToggleSecondAbord: async (id, enabled, reason) => {
        try {
          await patchSecondAbord(id, enabled, reason);
          await refresh();
          toast.success(enabled ? "2º a bordo agregado" : "2º a bordo quitado");
        } catch {
          toast.error("No se pudo ajustar el 2º a bordo");
        }
      },
      onEditDate: async (id, date, reason) => {
        try {
          await editIncomeDate(id, date, reason);
          await refresh();
          toast.success("Fecha actualizada");
        } catch {
          toast.error("No se pudo actualizar la fecha");
        }
      },
      onDelete: async (id, reason) => {
        try {
          await deleteIncome(id, reason);
          await refresh();
          toast.success("Ingreso eliminado");
        } catch {
          toast.error("No se pudo eliminar el ingreso");
        }
      },
      onHistory: (incomeId) => setHistoryId(incomeId),
      onTimeline: (tracking) => setTimelineTracking(tracking),
      onLocate: (tracking) => setQuery(tracking),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutate, onFixed],
  );

  if (!subsidiaryId) {
    return <div className="rounded-md border bg-white py-16 text-center text-sm text-slate-400">Selecciona una sucursal para comenzar</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> Cargando {mode === "route" ? "rutas" : "consolidados"}…
      </div>
    );
  }

  if (groups.length === 0) {
    const Icon = mode === "route" ? Route : PackageCheck;
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border bg-white py-16 text-center text-slate-400">
        <Icon className="h-8 w-8 opacity-40" />
        <p className="text-sm">Sin {mode === "route" ? "rutas" : "consolidados"} esta semana.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar guía…" className="h-9 pl-8" />
        </div>
        <Select value={estado} onValueChange={(v) => setEstado(v as EstadoFilter)}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ESTADO_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={verdict} onValueChange={setVerdict}>
          <SelectTrigger className="h-9 w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {VERDICT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {mode === "route" && driverOptions.length > 0 && (
          <Select value={driver} onValueChange={setDriver}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Chofer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los choferes</SelectItem>
              {driverOptions.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 gap-1 text-slate-500" onClick={clearFilters}>
            <X className="h-4 w-4" /> Limpiar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        <SummaryStat label="Entregados" value={String(totals.delivered)} />
        <SummaryStat label="No entregados" value={String(totals.notDelivered)} />
        <SummaryStat label="Ingresos" value={formatCurrency(totals.income)} />
        <SummaryStat label="Anomalías" value={String(totals.anomalies)} />
        <WarehouseStat subsidiaryId={subsidiaryId} active={active} />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border bg-white py-12 text-center text-sm text-slate-400">Ningún {mode === "route" ? "ruta" : "consolidado"} coincide con los filtros.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(({ group, rows }) => (
            <GroupCard
              key={group.id}
              group={group}
              icon={mode === "route" ? "route" : "consolidado"}
              handlers={handlers}
              visibleRows={rows}
              defaultOpen={rowFilterActive}
              highlight={query}
            />
          ))}
        </div>
      )}

      <HistoryDialog incomeId={historyId} open={!!historyId} onOpenChange={(o) => !o && setHistoryId(null)} />
      <StatusTimelineDialog open={!!timelineTracking} onOpenChange={(o) => !o && setTimelineTracking(null)} tracking={timelineTracking} />
    </div>
  );
}
