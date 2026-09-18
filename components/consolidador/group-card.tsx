"use client";

import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { VerdictBadge } from "@/components/consolidador/verdict-badge";
import { formatCurrency } from "@/lib/utils";
import { ConsolidadorGroup, ConsolidadorGroupRow, SuggestedAction } from "@/lib/types/consolidador";
import { ChevronDown, Route, PackageCheck, User, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  group: ConsolidadorGroup;
  icon?: "route" | "consolidado";
  onAction: (row: ConsolidadorGroupRow, action: SuggestedAction, reason: string) => Promise<void>;
}

// Día de negocio (00:00Z): se muestra solo la fecha por su día UTC para no correrlo 7h.
const fmtDay = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "sin fecha";

const fmtStatus = (s: string | null) => (s ? s.replace(/_/g, " ") : "—");

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: "slate" | "emerald" | "amber" | "rose" }) {
  const tones = {
    slate: "text-slate-800",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  }[tone];
  return (
    <div className="rounded-lg bg-slate-50 p-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums ${tones}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

export function GroupCard({ group, icon = "route", onAction }: Props) {
  const [open, setOpen] = useState(false);
  const { kpis, meta } = group;
  const HeadIcon = icon === "route" ? Route : PackageCheck;
  const [busyRow, setBusyRow] = useState<string | null>(null);

  const handle = async (row: ConsolidadorGroupRow, action: SuggestedAction, reason: string) => {
    setBusyRow(row.shipmentId ?? row.tracking ?? "");
    try {
      await onAction(row, action, reason);
    } finally {
      setBusyRow(null);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-slate-200 bg-white">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-t-xl px-4 py-3 text-left hover:bg-slate-50/70">
        <div className="flex min-w-0 items-center gap-3">
          <HeadIcon className="h-5 w-5 shrink-0 text-sky-600" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-800">{group.label}</div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{fmtDay(group.date)}</span>
              {meta.driver && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> {meta.driver}
                </span>
              )}
              <span>· {meta.shipmentCount} guías</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {kpis.anomalyCount > 0 ? (
            <Badge variant="outline" className="gap-1 border-rose-200 bg-rose-50 font-normal text-rose-700">
              <AlertTriangle className="h-3 w-3" /> {kpis.anomalyCount}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 font-normal text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> OK
            </Badge>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </CollapsibleTrigger>

      <div className="grid grid-cols-2 gap-2 px-4 pb-3 md:grid-cols-4">
        <Kpi label="Entregados" value={String(kpis.delivered)} sub={`${kpis.notDelivered} no entregados`} tone="emerald" />
        <Kpi label="No entregados" value={String(kpis.notDelivered)} tone={kpis.notDelivered > 0 ? "amber" : "slate"} />
        <Kpi label="Ingresos" value={formatCurrency(kpis.incomeAmount)} sub={`${kpis.incomeCount} ingresos`} tone="slate" />
        <Kpi label="Descuadre" value={formatCurrency(kpis.chargeDiscrepancy)} tone={kpis.chargeDiscrepancy > 0 ? "rose" : "slate"} />
      </div>

      <CollapsibleContent>
        <div className="border-t border-slate-100">
          {group.rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">Este grupo no tiene envíos con guía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-2 font-medium">Guía</th>
                    <th className="px-4 py-2 font-medium">Estatus</th>
                    <th className="px-4 py-2 font-medium">Ingreso</th>
                    <th className="px-4 py-2 font-medium">Veredicto</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((r) => (
                    <tr key={r.shipmentId ?? r.tracking} className="border-t border-slate-100">
                      <td className="whitespace-nowrap px-4 py-2 font-medium tabular-nums text-slate-700">{r.tracking ?? "—"}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="whitespace-nowrap border-slate-200 bg-slate-50 font-normal text-slate-600">
                          {fmtStatus(r.status)}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-slate-700">
                        {r.income ? formatCurrency(r.income.cost) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-2">
                        <VerdictBadge verdict={r.verdict} onAction={(a, reason) => handle(r, a, reason)} busy={busyRow === (r.shipmentId ?? r.tracking)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
