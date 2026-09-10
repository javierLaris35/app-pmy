"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getIncomeHistory } from "@/lib/services/consolidador";
import { IncomeChangeLogEntry } from "@/lib/types/consolidador";
import { Loader2, ArrowRight, History } from "lucide-react";

const ACTION_LABEL: Record<string, string> = {
  cost_edit: "Editó costo",
  second_abord: "2º a bordo",
  manual_create: "Alta manual",
  status_fix: "Corrigió estatus",
};

const ACTION_CLASS: Record<string, string> = {
  cost_edit: "bg-amber-50 text-amber-700 border-amber-200",
  second_abord: "bg-violet-50 text-violet-700 border-violet-200",
  manual_create: "bg-rose-50 text-rose-700 border-rose-200",
  status_fix: "bg-blue-50 text-blue-700 border-blue-200",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

interface Props {
  incomeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HistoryDialog({ incomeId, open, onOpenChange }: Props) {
  const [entries, setEntries] = useState<IncomeChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !incomeId) return;
    let active = true;
    setLoading(true);
    getIncomeHistory(incomeId)
      .then((data) => active && setEntries(data))
      .catch(() => active && setEntries([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, incomeId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Historial de cambios
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Sin cambios registrados.</p>
        ) : (
          <ScrollArea className="max-h-[360px]">
            <ol className="space-y-3 pr-2">
              {entries.map((e) => (
                <li key={e.id} className="rounded-md border bg-white p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={ACTION_CLASS[e.action] ?? "bg-slate-50 text-slate-600 border-slate-200"}>
                      {ACTION_LABEL[e.action] ?? e.action}
                    </Badge>
                    <span className="text-[11px] text-slate-400">{fmtDate(e.createdAt)}</span>
                  </div>
                  {e.field && <div className="mt-1.5 text-xs font-medium text-slate-500">{e.field}</div>}
                  {(e.oldValue != null || e.newValue != null) && (
                    <div className="mt-1 flex items-center gap-2 text-sm tabular-nums">
                      <span className="text-slate-400 line-through">{e.oldValue ?? "—"}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-900">{e.newValue ?? "—"}</span>
                    </div>
                  )}
                  {e.reason && <div className="mt-1 text-xs text-slate-500 italic">“{e.reason}”</div>}
                  {e.userId && <div className="mt-1 text-[10px] text-slate-400">Usuario: {e.userId}</div>}
                </li>
              ))}
            </ol>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
