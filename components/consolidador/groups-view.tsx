"use client";

import { useMemo } from "react";
import { GroupCard } from "@/components/consolidador/group-card";
import { useConsolidadorGroups, GroupsMode } from "@/hooks/services/consolidador/use-consolidador-groups";
import { fixPackageStatus, deleteIncome } from "@/lib/services/consolidador";
import { ConsolidadorGroupRow, SuggestedAction } from "@/lib/types/consolidador";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { Loader2, Route, PackageCheck } from "lucide-react";

interface Props {
  mode: GroupsMode;
  subsidiaryId: string;
  from: string;
  to: string;
  active: boolean;
  onFixed: () => void;
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-800">{value}</p>
    </div>
  );
}

export function GroupsView({ mode, subsidiaryId, from, to, active, onFixed }: Props) {
  const { data, isLoading, mutate } = useConsolidadorGroups(mode, subsidiaryId, from, to, active);
  const groups = data?.groups ?? [];

  const totals = useMemo(() => {
    return groups.reduce(
      (acc, g) => ({
        delivered: acc.delivered + g.kpis.delivered,
        notDelivered: acc.notDelivered + g.kpis.notDelivered,
        income: acc.income + g.kpis.incomeAmount,
        anomalies: acc.anomalies + g.kpis.anomalyCount,
      }),
      { delivered: 0, notDelivered: 0, income: 0, anomalies: 0 },
    );
  }, [groups]);

  const onAction = async (row: ConsolidadorGroupRow, action: SuggestedAction, reason: string) => {
    try {
      if (action.kind === "fix_status" && row.shipmentId) {
        await fixPackageStatus(row.shipmentId, action.to, reason);
        toast.success(`Estatus corregido: ${row.tracking}`);
      } else if (action.kind === "delete_income" && row.income) {
        await deleteIncome(row.income.id, reason);
        toast.success(`Cobro eliminado: ${row.tracking}`);
      }
      await mutate();
      onFixed();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "No se pudo aplicar la acción");
    }
  };

  if (!subsidiaryId) {
    return (
      <div className="rounded-md border bg-white py-16 text-center text-sm text-slate-400">
        Selecciona una sucursal para comenzar
      </div>
    );
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
        <p className="text-sm">Sin {mode === "route" ? "rutas" : "consolidados"} con ingresos esta semana.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <SummaryStat label="Entregados" value={String(totals.delivered)} />
        <SummaryStat label="No entregados" value={String(totals.notDelivered)} />
        <SummaryStat label="Ingresos" value={formatCurrency(totals.income)} />
        <SummaryStat label="Anomalías" value={String(totals.anomalies)} />
      </div>

      <div className="flex flex-col gap-3">
        {groups.map((g) => (
          <GroupCard key={g.id} group={g} icon={mode === "route" ? "route" : "consolidado"} onAction={onAction} />
        ))}
      </div>
    </div>
  );
}
