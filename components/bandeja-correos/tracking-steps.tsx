"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { STEP_LABEL, TrackingItem } from "@/lib/services/ops-alerts";
import { cn } from "@/lib/utils";
import { formatDateTime } from "./labels";
import { AlertTriangle, Check, Circle } from "lucide-react";

const COUNT: Record<string, (t: TrackingItem) => number | null> = {
  upload: () => null,
  unloading: (t) => t.progress.unloading,
  dispatch: (t) => t.progress.dispatch,
  closure: (t) => t.progress.closure,
};

/** Pasos del recorrido de un consolidado como pastillas: hecho / vencido / pendiente, con avance. */
export function TrackingSteps({ item, compact = false }: { item: TrackingItem; compact?: boolean }) {
  if (!item.steps.length) return <span className="text-xs text-slate-400">Sin pasos configurados</span>;
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap items-center gap-1">
        {item.steps.map((s, i) => {
          const n = COUNT[s.step]?.(item);
          const state = s.done ? "done" : s.late ? "late" : "pending";
          const Icon = state === "done" ? Check : state === "late" ? AlertTriangle : Circle;
          return (
            <Tooltip key={s.step}>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    state === "done" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                    state === "late" && "border-red-200 bg-red-50 text-red-700",
                    state === "pending" && "border-slate-200 bg-white text-slate-500",
                  )}
                >
                  <Icon className={cn("h-3 w-3", state === "pending" && "h-2.5 w-2.5")} />
                  {STEP_LABEL[s.step]}
                  {!compact && n != null && item.guides > 0 && !s.done && (
                    <span className="tabular-nums opacity-80">
                      {n}/{item.guides}
                    </span>
                  )}
                  {i < item.steps.length - 1 && <span className="sr-only">,</span>}
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {s.done
                  ? `${STEP_LABEL[s.step]}${s.doneAt ? ` el ${formatDateTime(s.doneAt)}` : ""}`
                  : `${s.late ? "Vencido" : "Vence"} ${formatDateTime(s.dueAt)}${s.pct ? ` · va al ${s.pct}%` : ""}`}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
