"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { AlertTriangle, ClipboardCheck, ClipboardList, ListChecks, Loader2, RefreshCw, Truck, Undo2 } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { SucursalSelector } from "@/components/sucursal-selector";
import { WeekRangePicker } from "@/components/shared/week-range-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth.store";
import { getWeekRange, WeekRange } from "@/lib/week";
import { dayLabel, dayPct, hermosilloTime, hermosilloToday, routesSummary, sortConsolidated, stepLabel, weekDays } from "@/lib/daily-tasks-view";
import { DayTasks, getDayTasks, getWeekTasks, refreshDayTasks, TaskRow, WeekTasks } from "@/lib/services/daily-tasks";
import { ConsolidatedRow, GuideList, PILL } from "./consolidated-row";

function Kpi({ label, value, tone, children }: { label: string; value: string | number; tone?: "danger" | "warning"; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold", tone === "danger" && "text-red-600", tone === "warning" && "text-amber-600")}>{value}</p>
      {children}
    </div>
  );
}

/** Cinta de la semana: "Lunes 12 - Oct" con barra de avance y estado. */
function WeekStrip({ monday, today, selected, data, onPick }: { monday: string; today: string; selected: string; data?: WeekTasks; onPick: (d: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
      {weekDays(monday).map((d) => {
        const info = data?.days.find((x) => x.day === d.day);
        const future = d.day > today;
        const isToday = d.day === today;
        const status = future ? "—" : !info?.total ? "Sin operación" : info.late ? `${info.late} atrasados` : info.pct === 100 ? "Todo listo" : `${info.pct}% listo`;
        return (
          <button
            key={d.day}
            type="button"
            disabled={future}
            onClick={() => onPick(d.day)}
            className={cn(
              "rounded-lg border bg-card px-2.5 py-1.5 text-left transition-colors",
              d.day === selected ? "border-primary ring-1 ring-primary" : "hover:bg-muted",
              isToday && d.day !== selected && "bg-primary/5",
              future && "cursor-not-allowed opacity-40",
            )}
          >
            <p className="truncate text-xs font-semibold">{d.label}</p>
            <div className="my-1 h-1 rounded bg-slate-200">
              {!!info?.total && <div className="h-1 rounded bg-emerald-500" style={{ width: `${info.pct}%` }} />}
            </div>
            <p className={cn("truncate text-[11px]", info?.late ? "text-red-600" : status === "Todo listo" ? "text-emerald-700" : "text-muted-foreground")}>
              {isToday ? `Hoy · ${status}` : status}
            </p>
          </button>
        );
      })}
    </div>
  );
}

const TONE_CARD = { done: "bg-emerald-50/60", late: "bg-red-50", partial: "bg-amber-50/60", pending: "bg-muted/50" } as const;

/** Tarjeta de inventario (inicial o final): se hizo, a qué hora y quién; o su hora límite. */
function InventoryCard({ task, icon: Icon, title }: { task?: TaskRow; icon: React.ComponentType<{ className?: string }>; title: string }) {
  if (!task) return null;
  return (
    <Link href="/operaciones/inventarios" className={cn("rounded-lg px-3 py-2 transition-opacity hover:opacity-80", TONE_CARD[task.status])}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {title}</p>
      {task.status === "done" ? (
        <>
          <p className="mt-1 text-sm font-medium text-emerald-700">Hecho · {task.doneAt ? hermosilloTime(task.doneAt) : ""}</p>
          {task.doneByName && <p className="text-[11px] text-muted-foreground">{task.doneByName}</p>}
        </>
      ) : (
        <>
          <p className={cn("mt-1 text-sm font-medium", task.status === "late" ? "text-red-700" : "text-foreground")}>{task.status === "late" ? "No se hizo a tiempo" : "Pendiente"}</p>
          <p className={cn("text-[11px]", task.status === "late" ? "text-red-600" : "text-muted-foreground")}>Límite {hermosilloTime(task.dueAt)}</p>
        </>
      )}
    </Link>
  );
}

function SubsidiaryPanel({ data }: { data: DayTasks }) {
  const t = (s: TaskRow["step"]) => data.subsidiary.find((x) => x.step === s);
  const closure = t("closure");
  const open = data.routes.filter((r) => !r.closed);
  if (!data.subsidiary.length && !data.routes.length && !data.devolutions.length) {
    return <p className="rounded-xl border bg-card px-3 py-4 text-center text-sm text-muted-foreground">Sin operación este día: no llegaron consolidados ni salieron rutas.</p>;
  }
  return (
    <div className="space-y-2 rounded-xl border bg-card px-3 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Tareas de la sucursal · {dayLabel(data.day)}</span>
        <span className={cn("ml-auto rounded-full px-2 py-0.5 text-xs", PILL[data.subsidiary.some((x) => x.status === "late") ? "danger" : "muted"])}>
          {dayPct(data.subsidiary)}% listo
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <InventoryCard task={t("inventory_initial")} icon={ClipboardCheck} title="Inventario inicial" />
        <Link href="/operaciones/salidas-a-ruta" className={cn("rounded-lg px-3 py-2 transition-opacity hover:opacity-80", closure ? TONE_CARD[closure.status] : TONE_CARD.pending)}>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Truck className="h-3.5 w-3.5" /> Rutas del día</p>
          <p className="mt-1 text-sm font-medium">{routesSummary(data.routes)}</p>
          {closure?.status === "late" && <p className="text-[11px] text-red-600">Cierre límite {hermosilloTime(closure.dueAt)}</p>}
        </Link>
        <Link href="/operaciones/devoluciones" className="rounded-lg bg-muted/50 px-3 py-2 transition-opacity hover:opacity-80">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Undo2 className="h-3.5 w-3.5" /> Devoluciones</p>
          <p className="mt-1 text-sm font-medium">{data.devolutions.length ? `${data.devolutions.length} registradas` : "Ninguna registrada"}</p>
          <p className="text-[11px] text-muted-foreground">Solo informa: no todos los DEX regresan</p>
        </Link>
        <InventoryCard task={t("inventory_final")} icon={ClipboardList} title="Inventario final de día" />
      </div>
      {open.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-red-200">
          <p className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
            <Truck className="h-3.5 w-3.5" /> {open.length === 1 ? "1 ruta sin cerrar" : `${open.length} rutas sin cerrar`}
          </p>
          <ul className="divide-y">
            {open.map((r) => (
              <li key={r.id}>
                <Link href="/operaciones/salidas-a-ruta" className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1.5 text-sm hover:bg-muted/50">
                  <span className="font-mono text-xs">{r.trackingNumber}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.drivers || "Sin chofer asignado"}</span>
                  <span className="text-xs text-muted-foreground">{r.guides} guías</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", PILL.danger)}>Sin cerrar</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.devolutions.length > 0 && (
        <div className="rounded-md bg-muted/40 px-2.5 py-2">
          <GuideList
            title={data.devolutions.length === 1 ? "1 devolución registrada" : `${data.devolutions.length} devoluciones registradas`}
            items={data.devolutions.map((d) => d.trackingNumber)}
          />
        </div>
      )}
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

        <WeekStrip monday={week.from} today={today} selected={day} data={weekData} onPick={setDay} />
        <p className="text-right text-[11px] text-muted-foreground">El sistema se suspende a las 9:30 p. m.</p>

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
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                <p className="font-medium text-amber-800">Pendientes de días anteriores de esta semana</p>
                <ul className="mt-1 space-y-0.5 text-xs text-amber-800">
                  {data.carriedOver.map((c) => (
                    <li key={c.refId}>
                      <button type="button" className="hover:underline" onClick={() => setDay(c.day)}>
                        {c.refType === "charge" ? "F2" : "Consolidado"} {c.consNumber} ({dayLabel(c.day)})
                      </button>
                      {c.lateSteps.length ? ` · ${c.lateSteps.map(stepLabel).join(", ").toLowerCase()} atrasado` : " · a medias"}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <SubsidiaryPanel data={data} />

            {data.possibleLd.length > 0 && (
              <div className="rounded-xl border border-amber-300 bg-card px-3 py-2">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-600" /> {data.isToday ? "Posibles LD hoy" : "LD del día"}
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{data.possibleLd.length}</span>
                </p>
                <p className="mb-1 text-xs text-muted-foreground">Vencen ese día, sin entregar, sin DEX válido y sin movimiento de FedEx</p>
                <GuideList title={`${data.possibleLd.length} guías`} items={data.possibleLd.map((g) => `${g.trackingNumber} (${g.bucket.toLowerCase()})`)} tone="warning" />
              </div>
            )}

            <div className="space-y-2">
              {consolidated.length === 0 ? (
                <p className="rounded-xl border bg-card px-3 py-6 text-center text-sm text-muted-foreground">No llegaron consolidados este día.</p>
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
