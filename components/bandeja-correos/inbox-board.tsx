"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import { getTracking, TrackingItem } from "@/lib/services/ops-alerts";
import { Subsidiary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CONS_KIND_LABEL, formatDateTime } from "./labels";
import { TrackingSteps } from "./tracking-steps";
import { InboxRoutes } from "./inbox-routes";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Inbox, Loader2 } from "lucide-react";

interface Props {
  from: string;
  to: string;
  subsidiaryId?: string;
  active: boolean;
  onOpenMessage: (id: string) => void;
}

const HMO_OFFSET = 7 * 3_600_000;
const localDay = (iso: string) => new Date(new Date(iso).getTime() - HMO_OFFSET).toISOString().slice(0, 10);
const dayLabel = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

const isLate = (t: TrackingItem) => t.steps.some((s) => s.late);
const isDone = (t: TrackingItem) => t.steps.length > 0 && t.steps.every((s) => s.done) && t.steps[t.steps.length - 1].step === "closure";

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-md border bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-0.5 text-2xl font-semibold tabular-nums text-slate-900", tone)}>{value}</p>
    </div>
  );
}

/** Seguimiento: cada consolidado que llegó por correo y en qué paso va (subido → desembarque → ruta → cierre). */
export function InboxBoard({ from, to, subsidiaryId, active, onOpenMessage }: Props) {
  const { data, isLoading } = useSWR(active ? ["/ops-alerts/tracking", from, to, subsidiaryId ?? ""] : null, () => getTracking({ from, to, subsidiaryId }), { refreshInterval: 60_000 });
  const { subsidiaries } = useSubsidiaries();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const nameOf = (id: string) => (subsidiaries as Subsidiary[]).find((s) => s.id === id)?.name ?? "Sucursal";

  const { days, totals } = useMemo(() => {
    const rows = data ?? [];
    const byDay = new Map<string, Map<string, TrackingItem[]>>();
    for (const t of rows) {
      const d = localDay(t.receivedAt);
      const m = byDay.get(d) ?? new Map<string, TrackingItem[]>();
      m.set(t.subsidiaryId, [...(m.get(t.subsidiaryId) ?? []), t]);
      byDay.set(d, m);
    }
    return {
      days: [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0])),
      totals: {
        received: rows.length,
        uploaded: rows.filter((t) => t.steps.find((s) => s.step === "upload")?.done ?? t.guides > 0).length,
        late: rows.filter(isLate).length,
        done: rows.filter(isDone).length,
      },
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando…
      </div>
    );
  }
  if (!days.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border bg-white py-16 text-center text-sm text-slate-400">
        <Inbox className="h-6 w-6" /> No llegaron consolidados por correo en estas fechas
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Consolidados recibidos" value={totals.received} />
        <Stat label="Subidos" value={totals.uploaded} tone="text-sky-700" />
        <Stat label="Con algún paso atrasado" value={totals.late} tone={totals.late ? "text-red-600" : undefined} />
        <Stat label="Terminados (ruta cerrada)" value={totals.done} tone="text-emerald-700" />
      </div>

      <InboxRoutes from={from} to={to} subsidiaryId={subsidiaryId} active={active} />

      {days.map(([day, bySub]) => (
        <section key={day} className="rounded-md border bg-white">
          <header className="flex items-baseline gap-3 border-b px-4 py-2">
            <h3 className="text-sm font-semibold capitalize text-slate-800">{dayLabel(day)}</h3>
            <span className="text-xs text-slate-500">{[...bySub.values()].reduce((s, l) => s + l.length, 0)} consolidados</span>
          </header>
          <ul className="divide-y">
            {[...bySub.entries()]
              .sort((a, b) => Number(b[1].some(isLate)) - Number(a[1].some(isLate)) || nameOf(a[0]).localeCompare(nameOf(b[0])))
              .map(([subId, items]) => {
                const key = `${day}|${subId}`;
                const isOpen = open[key] ?? items.some(isLate);
                const late = items.filter(isLate).length;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setOpen((o) => ({ ...o, [key]: !isOpen }))}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                      aria-expanded={isOpen}
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
                      <span className="w-48 shrink-0 truncate text-sm font-medium text-slate-800">{nameOf(subId)}</span>
                      <span className="text-xs text-slate-500">{items.length} consolidado(s)</span>
                      <span className="ml-auto text-xs">
                        {late ? (
                          <span className="inline-flex items-center gap-1 font-medium text-red-600">
                            <AlertTriangle className="h-3.5 w-3.5" /> {late} con atraso
                          </span>
                        ) : items.every(isDone) ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Todo terminado
                          </span>
                        ) : (
                          <span className="text-slate-500">Al corriente</span>
                        )}
                      </span>
                    </button>

                    {isOpen && (
                      <ul className="border-t bg-slate-50/60 px-4 py-1">
                        {items.map((t) => (
                          <li key={t.inboxConsolidationId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-xs">
                            <Badge variant="secondary" className="w-14 justify-center px-1.5 py-0 text-[11px]">
                              {CONS_KIND_LABEL[t.kind] ?? t.kind}
                            </Badge>
                            <span className="w-28 font-mono text-slate-700">{t.consNumber}</span>
                            <span className="w-24 text-slate-500">{t.guides ? `${t.guides} guías` : t.announcedCount ? `${t.announcedCount} anunciadas` : ""}</span>
                            <span className="w-32 text-slate-500">Llegó {formatDateTime(t.receivedAt)}</span>
                            <div className="min-w-0 flex-1">
                              <TrackingSteps item={t} />
                            </div>
                            <Button variant="link" className="h-auto shrink-0 p-0 text-xs" onClick={() => onOpenMessage(t.inboxMessageId)}>
                              Ver correo
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
