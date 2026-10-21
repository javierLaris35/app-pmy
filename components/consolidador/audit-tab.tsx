"use client";

import React, { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { UnderlineTabsList, UnderlineTabsTrigger } from "@/components/ui/underline-tabs";
import { PmySpinner } from "@/components/ui/pmy-loader";
import { CobrosAuditPanel } from "@/components/consolidador/cobros-audit-panel";
import { ChargeGuidesTable, CollectionsAuditTable, NoVanTable } from "@/components/consolidador/audit-extra-tables";
import { SubsidiaryGroup } from "@/components/consolidador/subsidiary-group";
import { useScopedView } from "@/hooks/services/consolidador/use-scoped-view";
import { focusParts, sumParts } from "@/lib/consolidador/zone-merge";
import type { ConsolidadorScope } from "@/lib/consolidador/scope";
import type { ChargeGuidesReport, CollectionsAuditReport, NoVanReport, SubsidiarySummary, ZonePart } from "@/lib/types/consolidador-zone";
import { cn, formatCurrency } from "@/lib/utils";

type Sub = "reglas" | "cargas" | "recolecciones" | "novan";

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "rose" | "amber" }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border bg-white px-3 py-2.5">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className={cn("text-xl font-semibold tabular-nums", tone === "rose" && "text-rose-600", tone === "amber" && "text-amber-600")}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}

interface Props {
  scope: ConsolidadorScope;
  from: string;
  to: string;
  active: boolean;
  /** Resumen ya cargado (KPIs de arriba y nombres de las sucursales). */
  summary: ZonePart<SubsidiarySummary>[];
  onChanged: () => void;
}

/** Pestaña Auditoría de cobros: reglas de cobro + cargas (dobles), recolecciones y No VAN. */
export function AuditTab({ scope, from, to, active, summary, onChanged }: Props) {
  const [sub, setSub] = useState<Sub>("reglas");
  const focus = scope.focusSubsidiaryId;
  const cargas = useScopedView<ChargeGuidesReport>(scope, from, to, "charge-guides", active && sub === "cargas");
  const recs = useScopedView<CollectionsAuditReport>(scope, from, to, "collections", active && sub === "recolecciones");
  const novan = useScopedView<NoVanReport>(scope, from, to, "novan", active && sub === "novan");
  const s = focusParts(summary, focus);
  const refresh = (m: () => Promise<unknown>) => () => {
    void m();
    onChanged();
  };

  const loading = (cargas.isLoading && sub === "cargas") || (recs.isLoading && sub === "recolecciones") || (novan.isLoading && sub === "novan");
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Kpi label="Falta cobrar" value={String(sumParts(s, (x) => x.missing.count))} sub={formatCurrency(sumParts(s, (x) => x.missing.amount))} tone="rose" />
        <Kpi label="Cobra de más" value={String(sumParts(s, (x) => x.extra.count))} sub={formatCurrency(sumParts(s, (x) => x.extra.amount))} tone="amber" />
        <Kpi label="Paquete + carga" value={String(sumParts(s, (x) => x.doubles))} sub="guías en las dos" tone="amber" />
        <Kpi label="Recolecciones" value={String(sumParts(s, (x) => x.collections.registered))} sub={`${sumParts(s, (x) => x.collections.withoutCharge)} sin cobro`} />
        <Kpi label="No VAN" value={String(sumParts(s, (x) => x.novan.total))} sub={`${sumParts(s, (x) => x.novan.withoutCharge)} sin cobro`} />
      </div>

      <Tabs value={sub} onValueChange={(v) => setSub(v as Sub)}>
        <div className="flex items-center gap-3">
          <UnderlineTabsList className="flex-1">
            <UnderlineTabsTrigger size="sm" value="reglas" count={sumParts(s, (x) => x.missing.count + x.extra.count)} tone="amber">Reglas de cobro</UnderlineTabsTrigger>
            <UnderlineTabsTrigger size="sm" value="cargas" count={sumParts(s, (x) => x.doubles)} tone="amber">Cargas</UnderlineTabsTrigger>
            <UnderlineTabsTrigger size="sm" value="recolecciones" count={sumParts(s, (x) => x.collections.withoutCharge)} tone="rose">Recolecciones</UnderlineTabsTrigger>
            <UnderlineTabsTrigger size="sm" value="novan" count={sumParts(s, (x) => x.novan.total)} tone="sky">No VAN</UnderlineTabsTrigger>
          </UnderlineTabsList>
          {loading && <PmySpinner className="h-4 w-4 text-slate-400" />}
        </div>

        <TabsContent value="reglas" className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-slate-500">Entregado, rechazado (07) y no disponible (08, con 3 días distintos en la misma semana).</p>
          {s.length === 1 ? (
            <CobrosAuditPanel subsidiaryId={s[0].subsidiaryId} from={from} to={to} active={active && sub === "reglas"} onFixed={onChanged} hideKpis />
          ) : (
            s.map((p) => (
              <SubsidiaryGroup
                key={p.subsidiaryId}
                name={p.subsidiaryName}
                error={p.error}
                defaultOpen={!!(p.data && (p.data.missing.count || p.data.extra.count))}
                subtitle={p.data ? `${p.data.missing.count} faltan · ${p.data.extra.count} de más` : undefined}
              >
                <div className="p-2">
                  <CobrosAuditPanel subsidiaryId={p.subsidiaryId} from={from} to={to} active={active && sub === "reglas"} onFixed={onChanged} hideKpis />
                </div>
              </SubsidiaryGroup>
            ))
          )}
        </TabsContent>
        <TabsContent value="cargas" className="mt-3">
          <ChargeGuidesTable parts={focusParts(cargas.parts, focus)} onChanged={refresh(cargas.mutate)} />
        </TabsContent>
        <TabsContent value="recolecciones" className="mt-3">
          <CollectionsAuditTable parts={focusParts(recs.parts, focus)} onChanged={refresh(recs.mutate)} />
        </TabsContent>
        <TabsContent value="novan" className="mt-3">
          <NoVanTable parts={focusParts(novan.parts, focus)} onChanged={refresh(novan.mutate)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
