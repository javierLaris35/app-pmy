"use client";

import { useMemo, useState } from "react";
import { fmtDateTime, fmtRelative } from "@/lib/audit-format";
import {
  Building2, RefreshCw, AlertTriangle, Search, Clock, CheckCircle2, ClipboardList,
  PackageCheck, Truck, PackageMinus, Boxes, Undo2, Inbox, ArrowRightLeft, TrendingDown, TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSubsidiariesActivity, useSubsidiaryRecent } from "@/hooks/services/audit/use-audit";
import type { SubsidiaryActivity, SubsidiaryOperation } from "@/lib/services/audit";

/** Umbrales de inactividad (días) para el semáforo. */
const OK_DAYS = 2;
const WARN_DAYS = 7;

type Sev = "ok" | "warn" | "bad" | "never";

const ICONS: Record<string, any> = {
  consolidados: ClipboardList, desembarques: PackageCheck, salidas_ruta: Truck,
  cierre_ruta: PackageMinus, inventarios: Boxes, devoluciones: Undo2,
  recolecciones: Inbox, traslados: ArrowRightLeft, gastos: TrendingDown, ingresos: TrendingUp,
};

function severity(op: SubsidiaryOperation): Sev {
  if (!op.lastAt || op.daysSince === null) return "never";
  if (op.daysSince <= OK_DAYS) return "ok";
  if (op.daysSince <= WARN_DAYS) return "warn";
  return "bad";
}

const DOT: Record<Sev, string> = {
  ok: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-rose-500", never: "bg-muted-foreground/30",
};
const TILE_RING: Record<Sev, string> = {
  ok: "hover:border-emerald-300 hover:bg-emerald-50/60",
  warn: "hover:border-amber-300 hover:bg-amber-50/60",
  bad: "hover:border-rose-300 hover:bg-rose-50/60",
  never: "hover:border-border hover:bg-muted/50",
};
const VALUE_TONE: Record<Sev, string> = {
  ok: "text-emerald-600", warn: "text-amber-600", bad: "text-rose-600", never: "text-muted-foreground",
};
const BAR: Record<Sev, string> = {
  ok: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-rose-500", never: "bg-muted-foreground/25",
};

function tileLabel(op: SubsidiaryOperation): string {
  if (!op.lastAt || op.daysSince === null) return "Nunca";
  if (op.daysSince === 0) return "Hoy";
  if (op.daysSince === 1) return "Ayer";
  if (op.daysSince < 30) return `${op.daysSince} d`;
  if (op.daysSince < 365) return `${Math.floor(op.daysSince / 30)} mes`;
  return `${Math.floor(op.daysSince / 365)} año`;
}

type Health = { sev: Sev; label: string };
function health(s: SubsidiaryActivity): Health {
  if (s.worstDays === null) return { sev: "never", label: "Sin actividad" };
  if (s.worstDays > WARN_DAYS || s.neverCount > 0) return { sev: "bad", label: "Inactiva" };
  if (s.worstDays > OK_DAYS) return { sev: "warn", label: "Atención" };
  return { sev: "ok", label: "Al día" };
}
const HEALTH_BADGE: Record<Sev, string> = {
  ok: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
  warn: "bg-amber-100 text-amber-700 ring-amber-600/20",
  bad: "bg-rose-100 text-rose-700 ring-rose-600/20",
  never: "bg-muted text-muted-foreground ring-border",
};
const ACCENT: Record<Sev, string> = {
  ok: "before:bg-emerald-500", warn: "before:bg-amber-500", bad: "before:bg-rose-500", never: "before:bg-muted-foreground/30",
};

/** Barra de salud segmentada (distribución de operaciones por severidad). */
function HealthBar({ operations }: { operations: SubsidiaryOperation[] }) {
  const counts: Record<Sev, number> = { ok: 0, warn: 0, bad: 0, never: 0 };
  operations.forEach((o) => { counts[severity(o)]++; });
  const order: Sev[] = ["ok", "warn", "bad", "never"];
  return (
    <div className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
      {order.map((sev) =>
        counts[sev] > 0 ? <div key={sev} className={`${BAR[sev]} rounded-full`} style={{ flex: counts[sev] }} /> : null,
      )}
    </div>
  );
}

type Selected = { id: string; name: string; module: string };

/** Diálogo: registros de UNA operación de la sucursal (quién, cuándo, folio), con chips para cambiar de operación. */
function SubsidiaryDetailDialog({ selected, onClose, onFocus }: {
  selected: Selected | null;
  onClose: () => void;
  onFocus: (module: string) => void;
}) {
  const { detail, isLoading } = useSubsidiaryRecent(selected?.id ?? null, 10);
  const ops = detail?.operations ?? [];
  const focus = ops.find((o) => o.module === selected?.module);
  const Icon = focus ? ICONS[focus.module] || Clock : Clock;

  return (
    <Dialog open={!!selected} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-100 text-indigo-600"><Building2 className="h-4 w-4" /></span>
            {selected?.name || "Sucursal"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">Últimos registros · quién lo hizo y cuándo</p>
        </DialogHeader>

        {/* Chips para cambiar de operación */}
        <div className="flex flex-wrap gap-1.5">
          {ops.map((op) => {
            const OpIcon = ICONS[op.module] || Clock;
            const active = op.module === selected?.module;
            return (
              <button
                key={op.module}
                onClick={() => onFocus(op.module)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors
                  ${active ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "text-muted-foreground hover:bg-muted"}`}
              >
                <OpIcon className="h-3 w-3" /> {op.label}
                {op.items.length > 0 && <span className={`ml-0.5 ${active ? "text-indigo-500" : "text-muted-foreground/70"}`}>· {op.items.length}</span>}
              </button>
            );
          })}
        </div>

        <Separator />

        <ScrollArea className="flex-1 -mx-2 px-2">
          {isLoading ? (
            <div className="space-y-2 py-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !focus || focus.items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Icon className="h-9 w-9 mx-auto mb-2 opacity-40" />
              Sin registros recientes de <b>{focus?.label ?? "esta operación"}</b> en esta sucursal.
            </div>
          ) : (
            <div className="py-1">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-semibold">{focus.label}</span>
                <Badge variant="secondary" className="h-5 text-[10px]">{focus.items.length}</Badge>
              </div>
              <div className="rounded-lg border divide-y">
                {focus.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {it.label && <Badge variant="outline" className="font-mono text-[10px] shrink-0 max-w-[160px] truncate">{it.label}</Badge>}
                      <span className="truncate text-muted-foreground">
                        {focus.hasUser ? (it.user ? <>por <b className="text-foreground">{it.user}</b></> : "autor desconocido") : "sin autor registrado"}
                      </span>
                    </div>
                    <span className="shrink-0 text-muted-foreground" title={fmtDateTime(it.date)}>
                      {fmtDateTime(it.date, "dd/MM HH:mm")} · {fmtRelative(it.date)}
                    </span>
                  </div>
                ))}
              </div>
              {!focus.hasUser && (
                <p className="text-[11px] text-muted-foreground pt-2">
                  Esta operación aún no guarda el autor; los registros nuevos sí lo mostrarán.
                </p>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SubsidiaryCard({ s, onSelectOp }: { s: SubsidiaryActivity; onSelectOp: (module: string) => void }) {
  const h = health(s);
  return (
    <Card
      className={`relative overflow-hidden transition-shadow hover:shadow-md
        before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-[''] ${ACCENT[h.sev]}`}
    >
      <CardContent className="p-4 pl-5">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 text-indigo-600">
              <Building2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold leading-tight truncate">{s.name}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {s.lastAnyAt ? `Últ. movimiento ${fmtDateTime(s.lastAnyAt, "dd/MM HH:mm")}` : "Sin movimientos"}
              </p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${HEALTH_BADGE[h.sev]}`}>
            {h.label}
          </span>
        </div>

        <div className="mt-3"><HealthBar operations={s.operations} /></div>

        <Separator className="my-3" />

        {/* Mosaicos por operación */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {s.operations.map((op) => {
            const sev = severity(op);
            const Icon = ICONS[op.module] || Clock;
            return (
              <Tooltip key={op.module}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onSelectOp(op.module)}
                    className={`text-left cursor-pointer rounded-lg border bg-card px-2.5 py-2 transition-colors ${TILE_RING[sev]}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{op.label}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[sev]}`} />
                      <span className={`text-base font-bold leading-none ${VALUE_TONE[sev]}`}>{tileLabel(op)}</span>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-semibold">{op.label}</p>
                  <p>{op.lastAt ? `Última vez: ${fmtDateTime(op.lastAt)}` : "Nunca registrado"}</p>
                  <p className="text-muted-foreground">{op.total.toLocaleString("es-MX")} en total · clic para ver detalle</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: Sev | "neutral" }) {
  const tones: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-600",
    ok: "bg-emerald-100 text-emerald-600",
    warn: "bg-amber-100 text-amber-600",
    bad: "bg-rose-100 text-rose-600",
    never: "bg-muted text-muted-foreground",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SubsidiariesPanel() {
  const { data, isLoading, mutate } = useSubsidiariesActivity();
  const [search, setSearch] = useState("");
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);

  const all = data?.subsidiaries ?? [];

  const stats = useMemo(() => {
    let ok = 0, warn = 0, bad = 0;
    for (const s of all) {
      const h = health(s).sev;
      if (h === "ok") ok++;
      else if (h === "warn") warn++;
      else bad++; // bad + never
    }
    return { total: all.length, ok, warn, bad };
  }, [all]);

  const subsidiaries = useMemo(() => {
    let list = all;
    if (search) list = list.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    if (onlyProblems) list = list.filter((s) => s.neverCount > 0 || (s.worstDays ?? 0) > WARN_DAYS);
    return [...list].sort((a, b) => (b.neverCount - a.neverCount) || ((b.worstDays ?? -1) - (a.worstDays ?? -1)));
  }, [all, search, onlyProblems]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat icon={Building2} label="Sucursales" value={stats.total} tone="neutral" />
          <Stat icon={CheckCircle2} label="Al día" value={stats.ok} tone="ok" />
          <Stat icon={Clock} label="Atención" value={stats.warn} tone="warn" />
          <Stat icon={AlertTriangle} label="Inactivas" value={stats.bad} tone="bad" />
        </div>

        {/* Controles */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" /> Desde cuándo cada sucursal no realiza cada operación
            {data?.generatedAt && <span className="hidden sm:inline text-xs">· actualizado {fmtDateTime(data.generatedAt, "HH:mm")}</span>}
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar sucursal..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full sm:w-[180px] pl-8" />
            </div>
            <Button size="sm" variant={onlyProblems ? "default" : "outline"} onClick={() => setOnlyProblems((v) => !v)} className="h-9 shrink-0">
              <AlertTriangle className="h-4 w-4" /> <span className="ml-1 hidden sm:inline">Alertas{stats.bad ? ` (${stats.bad})` : ""}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => mutate()} className="h-9 shrink-0" title="Actualizar"><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground px-0.5">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Al día (≤{OK_DAYS} d)</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Atención (≤{WARN_DAYS} d)</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Inactivo (&gt;{WARN_DAYS} d)</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" /> Nunca</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52 w-full rounded-xl" />)}</div>
        ) : subsidiaries.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
            {onlyProblems ? "Ninguna sucursal con alertas. ✅" : "Sin sucursales que mostrar."}
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {subsidiaries.map((s) => (
              <SubsidiaryCard key={s.id} s={s} onSelectOp={(module) => setSelected({ id: s.id, name: s.name, module })} />
            ))}
          </div>
        )}

        <SubsidiaryDetailDialog
          selected={selected}
          onClose={() => setSelected(null)}
          onFocus={(module) => setSelected((sel) => (sel ? { ...sel, module } : sel))}
        />
      </div>
    </TooltipProvider>
  );
}
