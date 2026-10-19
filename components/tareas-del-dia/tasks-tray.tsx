"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { AlertTriangle, ListChecks } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/access/permissions";
import { dayLabel, hermosilloTime, lateItemLabel, trayBadge } from "@/lib/daily-tasks-view";
import { getTasksSummary } from "@/lib/services/daily-tasks";

/** Tareas del día en la barra superior: numerito de pasos atrasados de hoy y resumen rápido. */
export function TasksTray() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const subsidiaryId: string = user?.subsidiary?.id ?? (user as any)?.subsidiaryId ?? "";
  const allowed = hasPermission(user, "operaciones.tareas");
  const { data } = useSWR(allowed && subsidiaryId ? `/daily-tasks/summary?${subsidiaryId}` : null, () => getTasksSummary(subsidiaryId), {
    refreshInterval: 5 * 60_000,
  });
  if (!allowed || !subsidiaryId) return null;

  const badge = trayBadge(data);
  const link = `/operaciones/tareas-del-dia?sucursal=${subsidiaryId}`;
  const pct = data?.total ? Math.round((data.done / data.total) * 100) : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-muted" aria-label="Tareas del día">
              <ListChecks className={cn("h-5 w-5", badge.count > 0 && "text-red-600")} />
              {badge.count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-background">
                  {badge.count > 99 ? "99+" : badge.count}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Tareas del día</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" sideOffset={8} className="w-[340px] overflow-hidden rounded-xl p-0 shadow-xl">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ListChecks className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">Tareas del día</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.subsidiary?.name ?? ""} · {data ? dayLabel(data.day) : "…"}
            </p>
          </div>
        </div>

        {!data ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Revisando…</p>
        ) : data.total === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sin operación hoy todavía.</p>
        ) : (
          <div className="space-y-3 px-4 py-3">
            <div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">Avance de hoy</span>
                <span className="font-semibold tabular-nums">{pct}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded bg-slate-200">
                <div className="h-1.5 rounded bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-red-50 px-2 py-1.5">
                <p className="text-lg font-semibold tabular-nums text-red-700">{data.late}</p>
                <p className="text-xs text-red-700">Atrasados</p>
              </div>
              <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                <p className="text-lg font-semibold tabular-nums">{data.pending}</p>
                <p className="text-xs text-muted-foreground">Por hacer</p>
              </div>
              <div className={cn("rounded-lg px-2 py-1.5", data.possibleLd ? "bg-amber-50" : "bg-muted/60")}>
                <p className={cn("text-lg font-semibold tabular-nums", data.possibleLd > 0 && "text-amber-700")}>{data.possibleLd}</p>
                <p className={cn("text-xs", data.possibleLd ? "text-amber-700" : "text-muted-foreground")}>Posibles LD</p>
              </div>
            </div>
            {data.lateItems.length > 0 && (
              <ul className="divide-y rounded-lg border">
                {data.lateItems.map((i, k) => (
                  <li key={k} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                    <span className="min-w-0 flex-1 truncate">{lateItemLabel(i)}</span>
                    <span className="shrink-0 text-red-600">venció {hermosilloTime(i.dueAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="border-t px-4 py-2.5">
          <Button asChild size="sm" className="w-full">
            <Link href={link} onClick={() => setOpen(false)}>
              Abrir tareas del día
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
