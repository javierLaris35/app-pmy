"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusHistoryEntry } from "@/lib/types/consolidador";
import { ListOrdered } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracking: string | null;
  history: StatusHistoryEntry[];
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

/** Muestra la secuencia de estatus del envío (con fecha y hora) para entender la anomalía. */
export function StatusTimelineDialog({ open, onOpenChange, tracking, history }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-slate-500" />
            Historial de estatus {tracking ? <span className="text-sm font-normal text-slate-400">· {tracking}</span> : null}
          </DialogTitle>
        </DialogHeader>
        {history.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Sin eventos de estatus.</p>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <ol className="relative space-y-3 pl-4 pr-2">
              {history.map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-4 top-1.5 h-2 w-2 rounded-full bg-slate-300" />
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="whitespace-nowrap bg-slate-50 text-slate-700 border-slate-200 font-normal">
                      {e.status.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs tabular-nums text-slate-500">{fmtDateTime(e.timestamp)}</span>
                  </div>
                </li>
              ))}
            </ol>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
