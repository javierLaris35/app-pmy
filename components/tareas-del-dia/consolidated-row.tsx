"use client";

import { PmySpinner } from "@/components/ui/pmy-loader";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Check, ChevronDown, ChevronRight, CircleDashed, Clock, Loader, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { hermosilloTime, stepLabel, stepLink, stepVisual } from "@/lib/daily-tasks-view";
import { DayConsolidated, getPackageDetail, PackageDetail, TaskRow } from "@/lib/services/daily-tasks";

export const PILL = {
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  muted: "bg-slate-100 text-slate-600",
} as const;
const DOT = {
  success: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  warning: "bg-amber-50 text-amber-600 ring-amber-200",
  danger: "bg-red-50 text-red-600 ring-red-200",
  muted: "bg-slate-50 text-slate-400 ring-slate-200",
} as const;

export function StepIcon({ status, className }: { status: TaskRow["status"]; className?: string }) {
  const v = stepVisual(status);
  const Icon = v.icon === "done" ? Check : v.icon === "partial" ? Loader : v.icon === "late" ? Clock : CircleDashed;
  return <Icon className={cn("h-3.5 w-3.5 shrink-0", className)} aria-hidden />;
}

const shortName = (n: string | null) => {
  if (!n) return "";
  const [first, last] = n.trim().split(/\s+/);
  return last ? `${first} ${last[0]}.` : first;
};

/** Texto bajo cada punto del recorrido. Sin fracciones donde el total no se conoce de antemano. */
function stepDetail(t: TaskRow): string {
  if (t.status === "done") return t.doneAt ? `${hermosilloTime(t.doneAt)}${t.doneByName ? ` · ${shortName(t.doneByName)}` : ""}` : "Listo";
  const late = t.status === "late" ? ` · venció ${hermosilloTime(t.dueAt)}` : "";
  if (t.step === "unloading") return `${t.doneCount} de ${t.totalCount} guías${late}`;
  if (t.step === "dispatch") return t.totalCount ? `${t.doneCount} de ${t.totalCount} guías${late}` : `Esperando desembarque`;
  if (t.step === "closure") return t.totalCount ? `Ruta sin cerrar${late}` : "Sin salida aún";
  return late ? late.slice(3) : "";
}

const STEP_TITLE: Partial<Record<TaskRow["step"], string>> = { upload: "Subido", unloading: "Desembarque", dispatch: "Salida a ruta", closure: "Cierre de ruta" };

/** Recorrido horizontal del consolidado. El último punto (devoluciones) solo informa. */
function Stepper({ tasks, returned }: { tasks: TaskRow[]; returned: number | null }) {
  return (
    <div className="relative flex items-start gap-1 overflow-x-auto px-1 pb-1 pt-1.5">
      <div className="pointer-events-none absolute left-[10%] right-[10%] top-5 h-0.5 bg-border" aria-hidden />
      {tasks.map((t) => {
        const v = stepVisual(t.status);
        return (
          <Link key={t.step} href={stepLink(t.step)} className="relative z-[1] flex min-w-[96px] flex-1 flex-col items-center text-center hover:opacity-80">
            <span className={cn("mb-1 grid h-7 w-7 place-items-center rounded-full ring-1", DOT[v.tone])}>
              <StepIcon status={t.status} />
            </span>
            <span className="text-sm font-medium">{STEP_TITLE[t.step] ?? stepLabel(t.step)}</span>
            <span className={cn("text-xs leading-tight", t.status === "late" ? "text-red-600" : "text-muted-foreground")}>{stepDetail(t)}</span>
          </Link>
        );
      })}
      <Link href="/operaciones/devoluciones" className="relative z-[1] flex min-w-[96px] flex-1 flex-col items-center text-center hover:opacity-80">
        <span className="mb-1 grid h-7 w-7 place-items-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-200">
          <Undo2 className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="text-sm font-medium">Devoluciones</span>
        <span className="text-xs leading-tight text-muted-foreground">{returned === null ? "…" : returned ? `${returned} registradas` : "Ninguna registrada"}</span>
      </Link>
    </div>
  );
}

/** Lista corta de guías con "Ver todas". */
export function GuideList({ title, items, tone = "muted" }: { title: string; items: string[]; tone?: "muted" | "warning" | "danger" }) {
  const [all, setAll] = useState(false);
  if (!items.length) return null;
  const shown = all ? items : items.slice(0, 6);
  return (
    <p className="text-xs leading-relaxed">
      <span className={cn("font-medium", tone === "warning" && "text-amber-700", tone === "danger" && "text-red-700")}>{title}: </span>
      <span className="font-mono text-muted-foreground">{shown.join(", ")}</span>
      {items.length > shown.length && (
        <button type="button" className="ml-1 text-primary hover:underline" onClick={() => setAll(true)}>
          y {items.length - shown.length} más
        </button>
      )}
    </p>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Details({ data }: { data: PackageDetail }) {
  const s = data.summary;
  const dexTotal = Object.values(s.dex).reduce((a, b) => a + b, 0);
  const dexCodes = Object.entries(s.dex).map(([k, n]) => `${k}: ${n}`).join(" · ");
  const stats: { label: string; value: number; hint?: string; warn?: boolean }[] = [
    { label: "Entregados", value: s.delivered },
    { label: "En ruta", value: s.inRoute },
    { label: "DEX", value: dexTotal, hint: dexCodes || undefined },
    { label: "Devueltos a FedEx", value: s.returned },
    { label: "En bodega", value: s.inWarehouse, hint: s.inInventory ? `${s.inInventory} en inventario` : undefined },
    { label: "Posibles LD", value: s.possibleLd, warn: s.possibleLd > 0 },
  ];
  const g = data.guides;
  const notUnloaded = g.filter((x) => x.bucket === "Sin desembarcar").map((x) => x.trackingNumber);
  const waiting = g.filter((x) => x.unloaded && !x.dispatched && x.bucket === "En bodega").map((x) => x.trackingNumber);
  const returned = g.filter((x) => x.returned).map((x) => x.trackingNumber);
  const ld = g.filter((x) => x.ld === "possible_ld").map((x) => x.trackingNumber);
  return (
    <>
      <div className="grid grid-cols-3 gap-2 border-t pt-2 sm:grid-cols-6">
        {stats.map((c) => (
          <div key={c.label} className="min-w-0">
            <p className={cn("truncate text-xs", c.warn ? "text-amber-700" : "text-muted-foreground")}>{c.label}</p>
            <p className={cn("text-sm font-semibold tabular-nums", c.warn && "text-amber-700")}>{c.value}</p>
            {c.hint && <p className="truncate text-xs text-muted-foreground">{c.hint}</p>}
          </div>
        ))}
      </div>
      {(notUnloaded.length + waiting.length + returned.length + ld.length > 0) && (
        <div className="space-y-1 rounded-md bg-muted/40 px-2.5 py-2">
          <GuideList title={`${plural(notUnloaded.length, "guía nunca se escaneó", "guías nunca se escanearon")} en desembarque`} items={notUnloaded} tone="danger" />
          <GuideList title={`${plural(waiting.length, "guía desembarcada no ha", "guías desembarcadas no han")} salido a ruta`} items={waiting} tone="warning" />
          <GuideList title={plural(ld.length, "posible LD", "posibles LD")} items={ld} tone="warning" />
          <GuideList title={plural(returned.length, "devolución registrada", "devoluciones registradas")} items={returned} />
        </div>
      )}
    </>
  );
}

function Expanded({ item }: { item: DayConsolidated }) {
  const { data, error, isLoading } = useSWR(`/daily-tasks/detail/${item.refType}/${item.refId}`, () => getPackageDetail(item.refType, item.refId));
  return (
    <div className="space-y-3 border-t px-3 pb-3 pt-3">
      <Stepper tasks={item.tasks} returned={data ? data.guides.filter((g) => g.returned).length : null} />
      {isLoading ? (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <PmySpinner className="h-3.5 w-3.5" /> Cargando paquetes…
        </p>
      ) : error || !data ? (
        <p className="text-xs text-red-600">No se pudieron cargar los paquetes. Intenta de nuevo.</p>
      ) : (
        <Details data={data} />
      )}
    </div>
  );
}

/** Consolidado como renglón que se abre: recorrido, paquetes y listas de guías. */
export function ConsolidatedRow({ item, defaultOpen }: { item: DayConsolidated; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const done = item.tasks.filter((t) => t.status === "done").length;
  const late = item.tasks.find((t) => t.status === "late");
  const allDone = done === item.tasks.length;
  const name = item.refType === "charge" ? `F2 ${item.consNumber}` : `Consolidado ${item.consNumber}`;
  const kind = item.refType === "charge" ? "Carga" : item.type === "aereo" ? "Aéreo" : item.type === "carga" ? "Carga" : "Ordinario";
  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("rounded-xl border bg-card transition-shadow", open && "shadow-sm")}>
      <CollapsibleTrigger className="flex w-full flex-wrap items-center gap-2 px-3 py-2.5 text-left text-sm">
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <span className={cn("font-semibold", allDone && "text-muted-foreground line-through")}>{name}</span>
        <Badge variant="secondary" className="px-1.5 py-0 text-xs font-normal">
          {item.carrier === "dhl" ? "DHL" : "FedEx"} · {kind} · {item.guides} guías
        </Badge>
        <span className="ml-auto flex items-center gap-1" aria-hidden>
          {item.tasks.map((t) => (
            <span key={t.step} className={cn("grid h-5 w-5 place-items-center rounded-full ring-1", DOT[stepVisual(t.status).tone])}>
              <StepIcon status={t.status} className="h-3 w-3" />
            </span>
          ))}
        </span>
        {allDone ? (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PILL.success)}>Completo</span>
        ) : late ? (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PILL.danger)}>{STEP_TITLE[late.step]} atrasado</span>
        ) : (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PILL.warning)}>
            {done} de {item.tasks.length} pasos
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>{open && <Expanded item={item} />}</CollapsibleContent>
    </Collapsible>
  );
}
