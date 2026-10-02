"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInboxBoard } from "@/hooks/services/inbox/use-inbox";
import { BoardRow } from "@/lib/types/inbox";
import { cn } from "@/lib/utils";
import { CONS_KIND_LABEL, delayTone, formatDateTime, formatMinutes } from "./labels";
import { CheckCircle2, ChevronDown, ChevronRight, Clock, Inbox, Loader2 } from "lucide-react";

interface Props {
  from: string;
  to: string;
  subsidiaryId?: string;
  active: boolean;
  onOpenMessage: (id: string) => void;
}

const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-0.5 text-2xl font-semibold tabular-nums text-slate-900", tone)}>{value}</p>
    </div>
  );
}

/** Recibido vs subido: lo que FedEx mandó por correo frente a lo que ya se subió, por día y sucursal. */
export function InboxBoard({ from, to, subsidiaryId, active, onOpenMessage }: Props) {
  const { data, isLoading } = useInboxBoard({ from, to, subsidiaryId }, active);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const { days, totals } = useMemo(() => {
    const rows = data ?? [];
    const byDay = new Map<string, BoardRow[]>();
    for (const r of rows) byDay.set(r.day, [...(byDay.get(r.day) ?? []), r]);
    const uploadedItems = rows.flatMap((r) => r.items.filter((i) => i.linkStatus === "subido" && i.minutes != null));
    return {
      days: [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0])),
      totals: {
        received: rows.reduce((s, r) => s + r.received, 0),
        uploaded: rows.reduce((s, r) => s + r.uploaded, 0),
        pending: rows.reduce((s, r) => s + r.pending, 0),
        avg: uploadedItems.length ? Math.round(uploadedItems.reduce((s, i) => s + (i.minutes ?? 0), 0) / uploadedItems.length) : null,
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
        <Stat label="Consolidados recibidos" value={String(totals.received)} />
        <Stat label="Ya subidos" value={String(totals.uploaded)} tone="text-emerald-700" />
        <Stat label="Sin subir" value={String(totals.pending)} tone={totals.pending ? "text-amber-700" : undefined} />
        <Stat label="Tiempo promedio en subir" value={totals.avg == null ? "—" : formatMinutes(totals.avg)} />
      </div>

      {days.map(([day, rows]) => (
        <section key={day} className="rounded-md border bg-white">
          <header className="flex items-baseline gap-3 border-b px-4 py-2">
            <h3 className="text-sm font-semibold capitalize text-slate-800">{dayLabel(day)}</h3>
            <span className="text-xs text-slate-500">
              {rows.reduce((s, r) => s + r.uploaded, 0)} de {rows.reduce((s, r) => s + r.received, 0)} subidos
            </span>
          </header>
          <ul className="divide-y">
            {rows.map((g) => {
              const key = `${g.subsidiaryId ?? "-"}|${g.day}`;
              const isOpen = !!open[key];
              const pct = g.received ? Math.round((g.uploaded / g.received) * 100) : 0;
              const oldestPending = g.items.filter((i) => i.linkStatus === "pendiente").reduce<number | null>((m, i) => (i.minutes != null && (m == null || i.minutes > m) ? i.minutes : m), null);
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                    aria-expanded={isOpen}
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
                    <span className="w-48 shrink-0 truncate text-sm font-medium text-slate-800">{g.subsidiaryName}</span>
                    <div className="flex w-56 shrink-0 items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className={cn("h-full rounded-full", g.pending ? "bg-amber-400" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-20 text-right text-xs tabular-nums text-slate-600">
                        {g.uploaded} de {g.received}
                      </span>
                    </div>
                    <span className="min-w-0 flex-1 truncate text-xs">
                      {g.pending === 0 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Todo subido
                          {g.avgMinutes != null && <span className="text-slate-500">· en promedio {formatMinutes(g.avgMinutes)}</span>}
                        </span>
                      ) : (
                        <span className={cn("inline-flex items-center gap-1", delayTone(oldestPending, true))}>
                          <Clock className="h-3.5 w-3.5" /> Faltan {g.pending}
                          {oldestPending != null && <span>· el más antiguo llegó hace {formatMinutes(oldestPending)}</span>}
                        </span>
                      )}
                    </span>
                  </button>

                  {isOpen && (
                    <ul className="border-t bg-slate-50/60 px-4 py-1">
                      {g.items.map((i) => {
                        const up = i.linkStatus === "subido";
                        return (
                          <li key={i.id} className="flex items-center gap-3 py-1.5 text-xs">
                            <Badge variant="secondary" className="w-16 justify-center px-1.5 py-0 text-[11px]">
                              {CONS_KIND_LABEL[i.kind]}
                            </Badge>
                            <span className="w-32 font-mono text-slate-700">{i.consNumber}</span>
                            <span className="w-20 text-slate-500">{i.announcedCount != null ? `${i.announcedCount} guías` : ""}</span>
                            <span className="w-32 text-slate-500">Llegó {formatDateTime(i.receivedAt)}</span>
                            <span className={cn("min-w-0 flex-1 truncate", up ? "text-emerald-700" : delayTone(i.minutes, true))}>
                              {up
                                ? `Subido ${formatDateTime(i.uploadedAt)}${i.uploadedByName ? ` por ${i.uploadedByName}` : ""} · tardó ${formatMinutes(i.minutes)}${i.uploadedVia === "correo" ? " · desde la bandeja" : ""}`
                                : `Sin subir · lleva ${formatMinutes(i.minutes)} esperando`}
                            </span>
                            <Button variant="link" className="h-auto shrink-0 p-0 text-xs" onClick={() => onOpenMessage(i.inboxMessageId)}>
                              Ver correo
                            </Button>
                          </li>
                        );
                      })}
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
