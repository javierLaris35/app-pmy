"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPackageTimeline, TimelineEvent } from "@/lib/services/consolidador";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Route, PackageCheck, Inbox, DollarSign, Truck } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracking: string | null;
}

const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const KIND: Record<string, { label: string; icon: typeof Route; dot: string; text: string }> = {
  recibido: { label: "Recibido", icon: Inbox, dot: "bg-slate-400", text: "text-slate-700" },
  consolidado: { label: "Consolidado", icon: PackageCheck, dot: "bg-violet-500", text: "text-violet-700" },
  salida_ruta: { label: "Salida a ruta", icon: Route, dot: "bg-blue-500", text: "text-blue-700" },
  estatus: { label: "Estatus FedEx", icon: Truck, dot: "bg-sky-400", text: "text-sky-700" },
  ingreso: { label: "Ingreso", icon: DollarSign, dot: "bg-emerald-500", text: "text-emerald-700" },
};

export function StatusTimelineDialog({ open, onOpenChange, tracking }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !tracking) return;
    let active = true;
    setLoading(true);
    getPackageTimeline(tracking)
      .then((r) => active && setEvents(r.events ?? []))
      .catch(() => active && setEvents([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, tracking]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-4 w-4 text-slate-500" />
            Trazabilidad del paquete
            {tracking ? <span className="text-sm font-normal text-slate-400">· {tracking}</span> : null}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Sin eventos para este paquete.</p>
        ) : (
          <ScrollArea className="max-h-[65vh]">
            <ol className="relative ml-2 space-y-4 border-l border-slate-200 pl-5 pr-2 py-1">
              {events.map((e, i) => {
                const k = KIND[e.kind] ?? { label: e.kind, icon: Truck, dot: "bg-slate-300", text: "text-slate-600" };
                const Icon = k.icon;
                return (
                  <li key={i} className="relative">
                    <span className={`absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full ${k.dot}`}>
                      <Icon className="h-2.5 w-2.5 text-white" />
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold uppercase tracking-wide ${k.text}`}>{k.label}</span>
                        </div>
                        <div className="text-sm text-slate-700">{e.label}</div>
                        {e.meta?.cost != null && (
                          <div className="text-xs text-emerald-600">
                            {formatCurrency(e.meta.cost)}
                            {e.meta.subsidiary ? ` · ${e.meta.subsidiary}` : ""}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-slate-500">{fmtDateTime(e.date)}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
