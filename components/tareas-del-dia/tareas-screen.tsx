"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { AlertTriangle, ListChecks, Loader2, RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { SucursalSelector } from "@/components/sucursal-selector";
import { WeekRangePicker } from "@/components/shared/week-range-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth.store";
import { getWeekRange, WeekRange } from "@/lib/week";
import { dayPct, hermosilloToday, sortConsolidated, stepLabel, weekDays } from "@/lib/daily-tasks-view";
import { getDayTasks, getWeekTasks, refreshDayTasks } from "@/lib/services/daily-tasks";
import { ConsolidatedRow, TaskStepRow } from "./consolidated-row";

function Kpi({ label, value, tone, children }: { label: string; value: string | number; tone?: "danger" | "warning"; children?: React.ReactNode }) {
  return (
    <div className="rounded-md bg-muted/60 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold", tone === "danger" && "text-red-600", tone === "warning" && "text-amber-600")}>{value}</p>
      {children}
    </div>
  );
}

/** Tareas del día: checklist automático por consolidado y por sucursal (solo lectura). */
export default function TareasScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const today = hermosilloToday();

  const [subsidiaryId, setSubsidiaryId] = useState<string>(params.get("sucursal") ?? "");
  const [day, setDay] = useState<string>(params.get("dia") ?? today);
  const [week, setWeek] = useState<WeekRange>(() => getWeekRange(new Date(`${params.get("dia") ?? today}T12:00:00`)));
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!hasHydrated || subsidiaryId) return;
    setSubsidiaryId(user?.subsidiary?.id ?? (user as any)?.subsidiaryId ?? "");
  }, [hasHydrated, user, subsidiaryId]);

  useEffect(() => {
    if (!subsidiaryId) return;
    router.replace(`${pathname}?sucursal=${subsidiaryId}&dia=${day}`, { scroll: false });
  }, [subsidiaryId, day, pathname, router]);

  const weekKey = subsidiaryId ? `/daily-tasks/week?${subsidiaryId}&${week.from}` : null;
  const dayKey = subsidiaryId ? `/daily-tasks/day?${subsidiaryId}&${day}` : null;
  const { data: weekData } = useSWR(weekKey, () => getWeekTasks(subsidiaryId, week.from), { refreshInterval: 5 * 60_000 });
  const { data, error, isLoading, mutate } = useSWR(dayKey, () => getDayTasks(subsidiaryId, day), { refreshInterval: day === today ? 5 * 60_000 : 0 });

  const consolidated = useMemo(() => sortConsolidated(data?.consolidated ?? []), [data]);
  const allTasks = useMemo(() => [...(data?.subsidiary ?? []), ...consolidated.flatMap((c) => c.tasks)], [data, consolidated]);
  const pct = dayPct(allTasks);
  const lateCount = allTasks.filter((t) => t.status === "late").length;
  const readyCons = consolidated.filter((c) => c.tasks.every((t) => t.status === "done")).length;

  function changeWeek(w: WeekRange) {
    setWeek(w);
    setDay(w.from <= today && today <= w.to ? today : w.from);
  }

  async function refresh() {
    if (!subsidiaryId) return;
    setRefreshing(true);
    try {
      await mutate(await refreshDayTasks(subsidiaryId, day), { revalidate: false });
    } catch {
      toast.error("No se pudo revisar el día. Intenta de nuevo.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-3">
        <OperationHeader
          icon={ListChecks}
          title="Tareas del día"
          description="El sistema marca solo lo que ya se hizo"
          actions={
            <div className="flex items-center gap-2">
              <div className="w-40 sm:w-56">
                <SucursalSelector
                  value={subsidiaryId}
                  returnObject
                  onValueChange={(val: any) => {
                    const v = Array.isArray(val) ? val[0] : val;
                    if (typeof v === "string") setSubsidiaryId(v);
                    else if (v?.id) setSubsidiaryId(v.id);
                  }}
                />
              </div>
              <div className="hidden md:block">
                <WeekRangePicker value={week} onChange={changeWeek} />
              </div>
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={refresh} disabled={refreshing || !subsidiaryId} aria-label="Volver a revisar el día" title="Volver a revisar el día">
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          }
        />

        <div className="md:hidden">
          <WeekRangePicker value={week} onChange={changeWeek} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {weekDays(week.from).map((d) => {
            const info = weekData?.days.find((x) => x.day === d.day);
            const future = d.day > today;
            return (
              <button
                key={d.day}
                type="button"
                disabled={future}
                onClick={() => setDay(d.day)}
                className={cn(
                  "flex min-w-[64px] flex-col items-center rounded-md border px-2 py-1 text-xs transition-colors",
                  d.day === day ? "border-primary bg-primary/5 font-semibold" : "hover:bg-muted",
                  future && "cursor-not-allowed opacity-40",
                )}
              >
                <span>
                  {d.letter} {Number(d.day.slice(8))}
                  {d.day === today ? " · hoy" : ""}
                </span>
                <span className={cn("text-[11px]", info?.late ? "text-red-600" : "text-muted-foreground")}>
                  {future || !info?.total ? "—" : info.late ? `${info.pct}% · ${info.late} tarde` : `${info.pct}%`}
                </span>
              </button>
            );
          })}
          <span className="ml-auto text-xs text-muted-foreground">El sistema se suspende 21:30</span>
        </div>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">No se pudieron cargar las tareas. Revisa tu conexión e intenta de nuevo.</p>
        ) : isLoading || !data ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Revisando lo que ya se hizo…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Kpi label="Avance del día" value={`${pct}%`}>
                <div className="mt-1 h-1 rounded bg-slate-200"><div className="h-1 rounded bg-emerald-500" style={{ width: `${pct}%` }} /></div>
              </Kpi>
              <Kpi label="Consolidados" value={`${readyCons} de ${consolidated.length} listos`} />
              <Kpi label="Pasos atrasados" value={lateCount} tone={lateCount ? "danger" : undefined} />
              <Kpi label="Posibles LD" value={data.possibleLd.length} tone={data.possibleLd.length ? "warning" : undefined} />
            </div>

            {data.carriedOver.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                <p className="font-medium text-amber-800">Pendientes de días anteriores de esta semana</p>
                <ul className="mt-1 space-y-0.5 text-xs text-amber-800">
                  {data.carriedOver.map((c) => (
                    <li key={c.refId}>
                      <button type="button" className="hover:underline" onClick={() => setDay(c.day)}>
                        {c.refType === "charge" ? "F2" : "Consolidado"} {c.consNumber} ({Number(c.day.slice(8))}/{Number(c.day.slice(5, 7))})
                      </button>
                      {c.lateSteps.length ? ` · ${c.lateSteps.map(stepLabel).join(", ").toLowerCase()} atrasado` : " · a medias"}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border bg-card px-3 py-2">
                <p className="mb-1 text-xs text-muted-foreground">Tareas de la sucursal</p>
                {data.subsidiary.length ? data.subsidiary.map((t) => <TaskStepRow key={t.step} task={t} />) : <p className="py-2 text-sm text-muted-foreground">Sin tareas de sucursal este día.</p>}
              </div>
              <div className={cn("rounded-lg border bg-card px-3 py-2", data.possibleLd.length > 0 && "border-amber-300")}>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium">{data.isToday ? "Posibles LD hoy" : "LD del día"}</span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{data.possibleLd.length}</span>
                </div>
                <p className="mb-1 text-xs text-muted-foreground">Vencen ese día, sin entregar, sin DEX válido y sin movimiento de FedEx</p>
                {data.possibleLd.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">Ninguna guía en riesgo.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {data.possibleLd.map((g) => (
                      <div key={g.trackingNumber} className="flex items-center gap-2 border-b py-1 text-sm last:border-b-0">
                        <span className="font-mono text-xs">{g.trackingNumber}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{g.bucket}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{g.consNumber ? `cons. ${g.consNumber}` : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {consolidated.length === 0 ? (
                <p className="rounded-lg border bg-card px-3 py-6 text-center text-sm text-muted-foreground">No llegaron consolidados este día.</p>
              ) : (
                consolidated.map((c, i) => <ConsolidatedRow key={`${c.refType}:${c.refId}`} item={c} defaultOpen={i === 0 && !c.tasks.every((t) => t.status === "done")} />)
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
