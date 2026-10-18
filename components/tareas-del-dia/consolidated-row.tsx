"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { AlertTriangle, ChevronDown, ChevronRight, CircleCheck, CircleDashed, CircleDot, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { hermosilloTime, stepLabel, stepLink, stepVisual } from "@/lib/daily-tasks-view";
import { DayConsolidated, getPackageDetail, TaskRow } from "@/lib/services/daily-tasks";

const TONE_TEXT = { success: "text-emerald-600", warning: "text-amber-600", danger: "text-red-600", muted: "text-slate-400" } as const;
const PILL = {
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  muted: "bg-slate-100 text-slate-600",
} as const;

export function StepIcon({ status, className }: { status: TaskRow["status"]; className?: string }) {
  const v = stepVisual(status);
  const Icon = v.icon === "done" ? CircleCheck : v.icon === "partial" ? CircleDot : v.icon === "late" ? Clock : CircleDashed;
  return <Icon className={cn("h-4 w-4 shrink-0", TONE_TEXT[v.tone], className)} aria-hidden />;
}

/** Avance de un paso en una pastilla ("121/124", "vence 20:00"). */
function progressText(t: TaskRow): string | null {
  if (t.step === "upload") return `${t.totalCount} guías`;
  if (t.step === "inventory_initial" || t.step === "inventory_final") return t.status === "done" || t.status === "late" ? null : `antes de ${hermosilloTime(t.dueAt)}`;
  if (!t.totalCount) return t.status === "done" ? "sin pendientes" : null;
  return `${t.doneCount}/${t.totalCount}`;
}

/** Un renglón del checklist: ícono, nombre (tachado si ya está), avance, quién y a qué hora. Solo lectura. */
export function TaskStepRow({ task }: { task: TaskRow }) {
  const v = stepVisual(task.status);
  const prog = progressText(task);
  return (
    <div className="flex items-center gap-2 border-b py-1.5 text-sm last:border-b-0">
      <StepIcon status={task.status} />
      <Link href={stepLink(task.step)} className={cn("hover:underline", v.strike && "text-muted-foreground line-through")}>
        {stepLabel(task.step)}
      </Link>
      {prog && <span className={cn("rounded-full px-2 py-0.5 text-xs", PILL[v.tone])}>{prog}</span>}
      {task.status === "late" && <span className="text-xs text-red-600">venció {hermosilloTime(task.dueAt)}</span>}
      <span className="ml-auto truncate text-xs text-muted-foreground">
        {task.doneAt ? `${hermosilloTime(task.doneAt)}${task.doneByName ? ` · ${task.doneByName}` : ""}` : ""}
      </span>
    </div>
  );
}

function PackageCards({ refType, refId }: { refType: string; refId: string }) {
  const { data, error, isLoading } = useSWR(`/daily-tasks/detail/${refType}/${refId}`, () => getPackageDetail(refType, refId));
  if (isLoading) return <p className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando paquetes…</p>;
  if (error || !data) return <p className="text-xs text-red-600">No se pudieron cargar los paquetes. Intenta de nuevo.</p>;
  const s = data.summary;
  const dexTotal = Object.values(s.dex).reduce((a, b) => a + b, 0);
  const dexCodes = Object.entries(s.dex).map(([k, n]) => `${k}: ${n}`).join(" · ");
  const cards: { label: string; value: number; hint?: string; warn?: boolean }[] = [
    { label: "Entregados", value: s.delivered },
    { label: "En ruta", value: s.inRoute },
    { label: "DEX", value: dexTotal, hint: dexCodes || undefined },
    { label: "Devueltos a FedEx", value: s.returned },
    { label: "En bodega", value: s.inWarehouse, hint: s.inInventory ? `${s.inInventory} en inventario de hoy` : undefined },
    { label: "Posibles LD", value: s.possibleLd, warn: s.possibleLd > 0 },
  ];
  const missing = data.guides.filter((g) => g.bucket === "Sin desembarcar");
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Paquetes de este consolidado</p>
      <div className="grid grid-cols-2 gap-1.5">
        {cards.map((c) => (
          <div key={c.label} className={cn("rounded-md px-2.5 py-1.5", c.warn ? "bg-amber-50" : "bg-muted/60")}>
            <p className={cn("text-xs", c.warn ? "text-amber-700" : "text-muted-foreground")}>{c.label}</p>
            <p className={cn("text-sm font-semibold", c.warn && "text-amber-700")}>{c.value}</p>
            {c.hint && <p className="truncate text-[11px] text-muted-foreground">{c.hint}</p>}
          </div>
        ))}
      </div>
      {missing.length > 0 && (
        <p className="flex items-start gap-1 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>
            {missing.length} guías nunca se escanearon en desembarque: {missing.slice(0, 5).map((g) => g.trackingNumber).join(", ")}
            {missing.length > 5 ? "…" : ""}
          </span>
        </p>
      )}
    </div>
  );
}

/** Consolidado como renglón que se abre: checklist a la izquierda, paquetes a la derecha. */
export function ConsolidatedRow({ item, defaultOpen }: { item: DayConsolidated; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const done = item.tasks.filter((t) => t.status === "done").length;
  const late = item.tasks.find((t) => t.status === "late");
  const allDone = done === item.tasks.length;
  const name = item.refType === "charge" ? `F2 ${item.consNumber}` : `Consolidado ${item.consNumber}`;
  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("rounded-lg border bg-card", open && "border-slate-300")}>
      <CollapsibleTrigger className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-sm">
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <span className={cn("font-medium", allDone && "text-muted-foreground line-through")}>{name}</span>
        <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">
          {item.carrier === "dhl" ? "DHL" : "FedEx"}
          {item.type ? ` · ${item.type}` : ""} · {item.guides} guías
        </Badge>
        <span className="ml-auto flex items-center gap-0.5" aria-hidden>
          {item.tasks.map((t) => <StepIcon key={t.step} status={t.status} className="h-3.5 w-3.5" />)}
        </span>
        {allDone ? (
          <span className={cn("rounded-full px-2 py-0.5 text-xs", PILL.success)}>Completo</span>
        ) : late ? (
          <span className={cn("rounded-full px-2 py-0.5 text-xs", PILL.danger)}>{stepLabel(late.step)} atrasado</span>
        ) : (
          <span className={cn("rounded-full px-2 py-0.5 text-xs", PILL.warning)}>
            {done} de {item.tasks.length} pasos
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-4 border-t px-3 py-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div>{item.tasks.map((t) => <TaskStepRow key={t.step} task={t} />)}</div>
          {open && <PackageCards refType={item.refType} refId={item.refId} />}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
