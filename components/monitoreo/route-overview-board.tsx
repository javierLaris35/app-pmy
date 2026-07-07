"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Loader2, RefreshCw, ArrowRight, Truck, Radio, Route as RouteIcon, Flame, AlertTriangle, CheckCircle2, Clock,
  LayoutGrid, Table2, BarChart3, Download, FileSpreadsheet, FileText, Package, Wallet, type LucideIcon,
} from "lucide-react";
import { saveAs } from "file-saver";
import { cn, formatCurrency } from "@/lib/utils";
import { SucursalSelector } from "@/components/sucursal-selector";
import { OperationHeader } from "@/components/shared/operation-header";
import { useAuthStore } from "@/store/auth.store";
import { useRouteMonitorBoardStore } from "@/store/route-monitor-board.store";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import { toast } from "@/lib/toast";
import { fetchRoutesBoard, type RouteBoardItem } from "@/lib/services/monitoring/route-monitor";
import {
  type Severity, severityOf, pillLabel,
  STRIPE_BG, STRIPE_TEXT, PILL_CLASS, BORDER_LEFT_CLASS, CARD_TINT_CLASS, PROGRESS_FILL_CLASS,
  KPI_CARD_BG, KPI_ICON_BG, KPI_NUM_CLASS,
} from "@/lib/services/monitoring/route-board-severity";
import { todayHmo, fmtTime, fmtDateTimeShort, formatElapsed, fmtAgo } from "@/lib/services/monitoring/route-board-format";
import { buildRouteBoardExcel, buildRouteBoardPdf } from "@/lib/services/monitoring/route-board-export";
import { RouteBoardSkeleton } from "./route-board-skeleton";
import { RouteBoardTable } from "./route-board-table";
import { RouteBoardCharts } from "./route-board-charts";

const BOARD_POLL_MS = 30_000;
type View = "cards" | "table" | "charts";

/** Reloj compartido: UN solo interval para todo el tablero, no uno por cuadro. */
function useNowTick() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}

export function RouteOverviewBoard({ onSelectRoute }: { onSelectRoute: (subsidiaryId: string, dispatchId: string) => void }) {
  const user = useAuthStore((s) => s.user);
  const { subsidiaries } = useSubsidiaries();
  // Sucursal/fecha/vista en Zustand (no useState local) — así "Volver al
  // tablero" desde el detalle de una ruta regresa a donde el usuario se había
  // quedado, en vez de reiniciar a la sucursal default cada vez.
  const subsidiaryId = useRouteMonitorBoardStore((s) => s.subsidiaryId);
  const setSubsidiaryId = useRouteMonitorBoardStore((s) => s.setSubsidiaryId);
  const date = useRouteMonitorBoardStore((s) => s.date);
  const setDate = useRouteMonitorBoardStore((s) => s.setDate);
  const view = useRouteMonitorBoardStore((s) => s.view);
  const setView = useRouteMonitorBoardStore((s) => s.setView);
  const [items, setItems] = useState<RouteBoardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const isVisible = usePageVisible();
  const now = useNowTick();

  // Primera visita de la sesión (el store arranca vacío): default a la
  // sucursal del usuario y a hoy. Ya con algo elegido, se respeta siempre.
  useEffect(() => {
    if (!subsidiaryId && user?.subsidiary?.id) setSubsidiaryId(user.subsidiary.id);
    if (!date) setDate(todayHmo());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.subsidiary?.id]);

  const load = async (silent = false) => {
    if (!subsidiaryId || !date) return;
    if (!silent) setLoading(true);
    try {
      const data = await fetchRoutesBoard(subsidiaryId, date);
      setItems(data);
      setLastLoadedAt(Date.now());
    } catch (e: any) {
      if (!silent) toast.error(e?.response?.data?.message || "No se pudieron cargar las rutas del tablero.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const subsidiaryName = subsidiaries.find((s: any) => s.id === subsidiaryId)?.name;

  const doExport = async (kind: "excel" | "pdf") => {
    if (items.length === 0) return;
    setExporting(kind);
    try {
      const filename = `tablero_rutas_${subsidiaryName || subsidiaryId}_${date}`.replace(/\s+/g, "_");
      if (kind === "excel") {
        const blob = await buildRouteBoardExcel(items, { subsidiaryName, date });
        saveAs(blob, `${filename}.xlsx`);
      } else {
        const blob = buildRouteBoardPdf(items, { subsidiaryName, date });
        saveAs(blob, `${filename}.pdf`);
      }
    } catch {
      toast.error(`No se pudo exportar el ${kind === "excel" ? "Excel" : "PDF"}.`);
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subsidiaryId, date]);

  useEffect(() => {
    if (!isVisible || !subsidiaryId || !date) return;
    const id = setInterval(() => load(true), BOARD_POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, subsidiaryId, date]);

  const summary = useMemo(() => {
    let critical = 0, warning = 0, closed = 0, normal = 0, cashOnHand = 0;
    for (const it of items) {
      const sev = severityOf(it);
      if (sev === "crit") critical++;
      else if (sev === "warn") warning++;
      else if (sev === "done") closed++;
      else normal++;
      cashOnHand += it.paymentsCollectedTotal;
    }
    return { total: items.length, critical, warning, closed, normal, cashOnHand };
  }, [items]);

  const lastLoadLabel = useMemo(() => {
    if (!lastLoadedAt) return null;
    const secs = Math.max(0, Math.round((now - lastLoadedAt) / 1000));
    return secs < 60 ? `hace ${secs}s` : `hace ${Math.round(secs / 60)}m`;
  }, [lastLoadedAt, now]);

  const liveIndicator = (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      En vivo {lastLoadLabel ? `· ${lastLoadLabel}` : ""}
    </div>
  );

  const filters = (
    <>
      <div className="w-44">
        <SucursalSelector value={subsidiaryId} returnObject={false}
          onValueChange={(v) => setSubsidiaryId(typeof v === "string" ? v : Array.isArray(v) ? (v[0] as any)?.id ?? "" : (v as any)?.id ?? "")} />
      </div>
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-[150px]" />
      <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualizar
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={!!exporting || items.length === 0}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => doExport("excel")}><FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Excel (.xlsx)</DropdownMenuItem>
          <DropdownMenuItem onClick={() => doExport("pdf")}><FileText className="mr-2 h-4 w-4 text-rose-600" /> PDF</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {liveIndicator}
    </>
  );

  return (
    <div className="space-y-4">
      <OperationHeader
        icon={Radio}
        title="Monitoreo de Rutas (experimental)"
        description="Tablero general — todas las rutas de la sucursal en el día seleccionado"
        actions={<div className="hidden items-center gap-2 lg:flex">{filters}</div>}
      />

      {/* Filtros en pantallas chicas — en desktop viven en el header. */}
      <Card className="lg:hidden">
        <CardContent className="flex flex-wrap items-center gap-2 p-3">{filters}</CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard kind="total" icon={RouteIcon} value={summary.total} label="Rutas del día"
          sub={`${summary.normal} en curso · ${summary.closed} cerrada${summary.closed === 1 ? "" : "s"}`} />
        <KpiCard kind="crit" icon={Flame} value={summary.critical} label="En riesgo" sub="Local Delay hoy" />
        <KpiCard kind="warn" icon={AlertTriangle} value={summary.warning} label="Atención" sub="Por vencer o huecos" />
        <KpiCard kind="done" icon={CheckCircle2} value={summary.closed} label="Cerradas" sub="Completadas hoy" />
        <KpiCard kind="cash" icon={Wallet} value={formatCurrency(summary.cashOnHand)} label="Cobros en mano" sub="Entregado con cobro, todas las rutas" />
      </div>

      {loading && items.length === 0 ? (
        <RouteBoardSkeleton />
      ) : items.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Truck className="h-10 w-10 mx-auto mb-2 opacity-40" />
          No hay rutas para esta sucursal en la fecha seleccionada.
        </CardContent></Card>
      ) : (
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="cards" className="gap-1.5"><LayoutGrid className="h-4 w-4" /> Tarjetas</TabsTrigger>
            <TabsTrigger value="table" className="gap-1.5"><Table2 className="h-4 w-4" /> Tabla</TabsTrigger>
            <TabsTrigger value="charts" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Gráficos</TabsTrigger>
          </TabsList>
          <TabsContent value="cards" className="mt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <RouteBoardCard key={item.id} item={item} now={now} onDetails={() => onSelectRoute(subsidiaryId, item.id)} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="table" className="mt-4">
            <RouteBoardTable items={items} now={now} onDetails={(id) => onSelectRoute(subsidiaryId, id)} />
          </TabsContent>
          <TabsContent value="charts" className="mt-4">
            <RouteBoardCharts items={items} now={now} date={date} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function KpiCard({ kind, icon: Icon, value, label, sub }: { kind: "total" | "crit" | "warn" | "done" | "cash"; icon: LucideIcon; value: ReactNode; label: string; sub: string }) {
  return (
    <Card className={cn("overflow-hidden", KPI_CARD_BG[kind])}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-[11px]", KPI_ICON_BG[kind])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className={cn("truncate font-mono text-xl font-extrabold leading-none tabular-nums tracking-tight", KPI_NUM_CLASS[kind])}>{value}</div>
          <div className="mt-1 text-xs font-semibold text-muted-foreground">{label}</div>
          <div className="truncate text-[11px] text-muted-foreground/70">{sub}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function RouteBoardCard({ item, now, onDetails }: { item: RouteBoardItem; now: number; onDetails: () => void }) {
  const sev = severityOf(item);
  const startedAt = item.startTime || item.createdAt;
  const elapsedMs = sev === "done" && item.routeClosedAt
    ? new Date(item.routeClosedAt).getTime() - new Date(startedAt).getTime()
    : now - new Date(startedAt).getTime();
  const pct = item.totalStops > 0 ? Math.round((item.visitedStops / item.totalStops) * 100) : 0;
  const minsSinceActivity = item.lastActivityAt ? Math.round((now - new Date(item.lastActivityAt).getTime()) / 60000) : null;
  const stale = sev !== "done" && minsSinceActivity != null && minsSinceActivity >= 45;
  const ClockIcon = sev === "done" ? CheckCircle2 : Clock;

  return (
    <div className={cn(
      "flex flex-col overflow-hidden rounded-xl border border-l-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
      BORDER_LEFT_CLASS[sev], CARD_TINT_CLASS[sev],
    )}>
      <div className={cn("flex items-center justify-between gap-2 px-3.5 py-2.5", STRIPE_BG[sev])}>
        <span className={cn("flex items-center gap-1.5 font-mono text-[17px] font-bold tabular-nums", STRIPE_TEXT[sev])}>
          <ClockIcon className="h-4 w-4" /> {formatElapsed(elapsedMs)}
        </span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide", PILL_CLASS[sev])}>{pillLabel(item, sev)}</span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold">{item.routeNames || "Ruta sin nombre"}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground/70">{item.trackingNumber}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="truncate text-xs font-semibold">{item.driverNames || "Sin chofer"}</p>
            <p className="text-[10.5px] text-muted-foreground/70">Creada {fmtDateTimeShort(item.createdAt)}</p>
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Truck className="h-3.5 w-3.5 text-muted-foreground/60" />
          {item.vehiclePlate || "Sin vehículo"} <span className="text-slate-300">·</span> {item.startTime ? `Inicio ${fmtTime(item.startTime)}` : "Aún sin salir"}
        </p>

        <div className="flex items-center gap-2.5">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className={cn("h-full rounded-full", PROGRESS_FILL_CLASS[sev])} style={{ width: `${pct}%` }} />
          </div>
          <span className="whitespace-nowrap font-mono text-[11px] font-bold tabular-nums text-muted-foreground">{item.visitedStops}/{item.totalStops}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" /> {item.normalPackageCount} guía{item.normalPackageCount === 1 ? "" : "s"}
            {item.chargePackageCount > 0 && ` · ${item.chargePackageCount} F2`}
          </span>
          {item.paymentsCount > 0 && (
            <span className="flex items-center gap-1 font-semibold text-emerald-700">
              <Wallet className="h-3 w-3" /> {formatCurrency(item.paymentsCollectedTotal)} en mano
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {sev === "done" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
              <CheckCircle2 className="h-3 w-3" /> Cerrada {item.routeClosedAt ? fmtTime(item.routeClosedAt) : ""}
            </span>
          ) : item.criticalAlerts > 0 || item.warningAlerts > 0 ? (
            <>
              {item.criticalAlerts > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800" title={item.topAlert?.message}>
                  <Flame className="h-3 w-3" /> {item.criticalAlerts} crítica{item.criticalAlerts > 1 ? "s" : ""}
                </span>
              )}
              {item.warningAlerts > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800" title={item.topAlert?.message}>
                  <AlertTriangle className="h-3 w-3" /> {item.warningAlerts} atención
                </span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Sin alertas</span>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t bg-muted/30 px-3.5 py-2.5">
        <span className={cn("flex items-center gap-1 text-[11px]", stale ? "font-bold text-rose-700" : "text-muted-foreground")}>
          <Clock className="h-3 w-3" />
          {sev === "done" ? "Cierre de ruta" : stale ? `Sin actividad ${fmtAgo(item.lastActivityAt)}` : `Última actividad: ${fmtAgo(item.lastActivityAt)}`}
        </span>
        <Button size="sm" variant="outline" className="h-7 gap-1 px-2.5 text-xs font-semibold hover:border-slate-900 hover:bg-slate-900 hover:text-white" onClick={onDetails}>
          Ver detalles <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
