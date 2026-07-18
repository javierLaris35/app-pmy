"use client";

import { useEffect, useMemo, useState, type ReactNode, type ComponentType } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Package, Gauge, User, AlertTriangle, Search, Phone, CalendarClock, Info, Siren, Wallet, CheckCircle2, ArrowLeft, Radio, MapPin, ChevronDown, Clock, Truck } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { OperationHeader } from "@/components/shared/operation-header";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import { toast } from "@/lib/toast";
import {
  fetchActiveRoutes, fetchLiveRouteStatus, fetchRouteStopCoordinates,
  type ActiveRoute, type LiveRouteStatus, type RouteStopCoord, type RouteStop, type RouteAlert, type StopPackage,
} from "@/lib/services/monitoring/route-monitor";
import {
  type Severity, BORDER_LEFT_CLASS, CARD_TINT_CLASS, STRIPE_BG, STRIPE_TEXT, PILL_CLASS,
} from "@/lib/services/monitoring/route-board-severity";
import { RouteLiveMap } from "./route-live-map";
import { RouteDetailSkeleton } from "./route-board-skeleton";
import { SendDriverMessageButton } from "./send-driver-message";
import { getWhatsappSettings, type WhatsappSettings, type DriverMessageContext } from "@/lib/services/whatsapp-settings";

const ROUTES_POLL_MS = 30_000; // lista de rutas: solo BD, barato
const LIVE_POLL_MS = 18_000; // detalle en vivo: el backend coalesce el refresh real a FedEx (~75s)

type Category = "todas" | "entregado" | "transito" | "excepcion" | "sindatos";
// DEX03/08/42/17/05, rechazo, devuelta o retorno-abandono FedEx: ya tienen un
// motivo de FedEx registrado — igual que "entregado", ya no está en riesgo de
// Local Delay (aunque siga apareciendo aquí para dar seguimiento operativo).
const BAD = new Set(["rechazado", "devuelto_a_fedex", "retorno_abandono_fedex", "direccion_incorrecta", "cliente_no_disponible", "empresa_cerrada", "cambio_fecha_solicitado", "restriccion_seguridad_ubicacion"]);
const OK = new Set(["entregado", "entregado_por_fedex", "entregado_en_bodega"]);
/** Estatus "resueltos" para efectos de urgencia: entregado O con motivo de FedEx ya registrado. */
const isResolvedStatus = (s: string) => OK.has(s) || BAD.has(s);

function categoryOf(headlineStatus: string): Category {
  const s = headlineStatus.toLowerCase();
  if (!s || s === "desconocido") return "sindatos";
  if (OK.has(s)) return "entregado";
  if (BAD.has(s)) return "excepcion";
  return "transito";
}

const BADGE_STYLE: Record<Category, string> = {
  todas: "bg-slate-100 text-slate-600 border-slate-200",
  entregado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  transito: "bg-blue-100 text-blue-700 border-blue-200",
  excepcion: "bg-amber-100 text-amber-700 border-amber-200",
  sindatos: "bg-slate-100 text-slate-600 border-slate-200",
};
const CATEGORY_LABEL: Record<Category, string> = {
  todas: "Todas", entregado: "Entregadas", transito: "En tránsito", excepcion: "Excepción", sindatos: "Sin datos",
};
const prettyStatus = (s?: string | null) => (!s ? "—" : s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()));

// Todo el tablero opera en hora de Hermosillo (donde de verdad está la ruta),
// sin importar en qué zona horaria esté el navegador de quien lo está viendo.
const TZ = "America/Hermosillo";
/** Clave de día "YYYY-MM-DD" EN HERMOSILLO — para comparar "¿es hoy/mañana?" sin que la zona del navegador lo descuadre cerca de medianoche. */
const hmoDayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const fmtTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: TZ }) : null);
const fmtDateShort = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: TZ });
/** Fecha+hora SIEMPRE con el día (hora de Hermosillo) — antes solo se veía la hora y no cuadraba si era otro día. */
function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const time = fmtTime(iso);
  if (hmoDayKey(d) === hmoDayKey(now)) return `hoy ${time}`;
  if (hmoDayKey(d) === hmoDayKey(tomorrow)) return `mañana ${time}`;
  return `${fmtDateShort(iso)} ${time}`;
}

type Urgency = "overdue" | "today" | "normal";
/** Semaforización: vencida = roja, vence HOY (aunque falten horas) = ámbar — es la que puede volverse
 * Local Delay si no se actúa hoy mismo — el resto sin urgencia. Ya entregada nunca aplica. */
function dueUrgency(iso: string, resolved: boolean): Urgency {
  if (resolved) return "normal";
  const due = new Date(iso);
  if (due.getTime() < Date.now()) return "overdue";
  if (hmoDayKey(due) === hmoDayKey(new Date())) return "today";
  return "normal";
}
const DUE_TEXT_CLASS: Record<Urgency, string> = {
  overdue: "text-rose-700 font-bold", today: "text-amber-700 font-semibold", normal: "text-muted-foreground",
};

const CARRIER_STYLE: Record<string, string> = {
  fedex: "bg-violet-100 text-violet-700",
  dhl: "bg-red-100 text-red-700",
};
const carrierLabel = (c?: string | null) => (c ? c.toUpperCase() : "OTRO");

const ALERT_TITLE: Record<string, string> = {
  overdue: "Riesgo de Local Delay",
  due_soon: "Por vencer",
  long_gap: "Hueco en el recorrido",
  stalled: "Sin actividad reciente",
  exceptions: "Excepciones sin resolver",
};
const ALERT_ICON: Record<RouteAlert["severity"], typeof AlertTriangle> = {
  critical: Siren, warning: AlertTriangle, info: Info,
};
const ALERT_THEME: Record<RouteAlert["severity"], { border: string; iconBg: string; iconColor: string; title: string }> = {
  critical: { border: "border-l-rose-500", iconBg: "bg-rose-100", iconColor: "text-rose-600", title: "text-rose-700" },
  warning: { border: "border-l-amber-500", iconBg: "bg-amber-100", iconColor: "text-amber-600", title: "text-amber-700" },
  info: { border: "border-l-blue-500", iconBg: "bg-blue-100", iconColor: "text-blue-600", title: "text-blue-700" },
};

/** Reloj de tiempo transcurrido — puramente local, NO dispara ninguna petición. */
function useElapsed(since?: string | null) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (!since) return "—";
  const ms = Date.now() - new Date(since).getTime();
  if (ms < 0) return "—";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
}

/** Pausa el polling cuando la pestaña no está visible (ahorra llamadas de a gratis). */
function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}

interface RouteMonitorBoardProps {
  /** Sucursal de la ruta (contexto fijo — se elige en el tablero general, aquí solo se muestra). */
  subsidiaryId: string;
  /** Ruta que se está viendo AHORA MISMO — viene del URL, es la fuente de verdad. */
  dispatchId: string;
  onBack: () => void;
  /** El usuario eligió otra ruta del combo — el padre actualiza el URL y nos vuelve a pasar el `dispatchId` nuevo. */
  onChangeRoute: (dispatchId: string) => void;
}

export function RouteMonitorBoard({ subsidiaryId, dispatchId, onBack, onChangeRoute }: RouteMonitorBoardProps) {
  const { subsidiaries } = useSubsidiaries();
  const [routes, setRoutes] = useState<ActiveRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [live, setLive] = useState<LiveRouteStatus | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [coords, setCoords] = useState<Map<string, RouteStopCoord>>(new Map());
  const [coordsLoading, setCoordsLoading] = useState(false);
  const [category, setCategory] = useState<Category>("todas");
  const [search, setSearch] = useState("");
  const [waSettings, setWaSettings] = useState<WhatsappSettings | null>(null);
  const isVisible = usePageVisible();
  const elapsed = useElapsed(live?.startTime || live?.createdAt);

  // Config de WhatsApp (número + plantilla) — una sola vez; el botón "Avisar al
  // chofer" solo aparece si la función está activa en Configuración.
  useEffect(() => {
    getWhatsappSettings().then(setWaSettings).catch(() => setWaSettings(null));
  }, []);

  const subsidiaryName = useMemo(() => subsidiaries.find((s: any) => s.id === subsidiaryId)?.name, [subsidiaries, subsidiaryId]);

  // Lista de rutas activas de la sucursal — SOLO alimenta el combo "cambiar de
  // ruta". La ruta que se está viendo (`dispatchId`) es siempre la del URL,
  // esté o no en esta lista (una ruta ya CERRADA no sale aquí pero sigue siendo válida para ver su detalle).
  const loadRoutes = async (silent = false) => {
    if (!subsidiaryId) return;
    if (!silent) setRoutesLoading(true);
    try {
      const data = await fetchActiveRoutes(subsidiaryId);
      setRoutes(data);
    } catch (e: any) {
      if (!silent) toast.error(e?.response?.data?.message || "No se pudieron cargar las rutas activas.");
    } finally {
      if (!silent) setRoutesLoading(false);
    }
  };

  const loadLive = async (silent = false, force = false) => {
    if (!dispatchId) return;
    if (!silent) setLiveLoading(true);
    if (force) setRefreshing(true);
    try {
      const data = await fetchLiveRouteStatus(dispatchId, force);
      setLive(data);
    } catch (e: any) {
      if (!silent) toast.error(e?.response?.data?.message || "No se pudo cargar el estatus de la ruta.");
    } finally {
      if (!silent) setLiveLoading(false);
      if (force) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subsidiaryId]);

  useEffect(() => {
    if (!isVisible || !subsidiaryId) return;
    const id = setInterval(() => loadRoutes(true), ROUTES_POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, subsidiaryId]);

  // `dispatchId` es la única fuente de verdad (viene del URL): cada vez que
  // cambia (llegamos de "Ver detalles" o el usuario elige otra ruta del combo)
  // se recarga el detalle desde cero — sin estado local que reconciliar.
  useEffect(() => {
    setLive(null); setCategory("todas"); setSearch("");
    if (dispatchId) loadLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatchId]);

  useEffect(() => {
    if (!isVisible || !dispatchId) return;
    const id = setInterval(() => loadLive(true), LIVE_POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, dispatchId]);

  // Coordenadas del mapa: en segundo plano, una sola vez por ruta (no en cada
  // poll — las direcciones no cambian). El tablero ya es usable mientras tanto.
  useEffect(() => {
    setCoords(new Map());
    if (!dispatchId) return;
    setCoordsLoading(true);
    fetchRouteStopCoordinates(dispatchId)
      .then((list) => setCoords(new Map(list.map((c) => [c.stopKey, c]))))
      .catch(() => { /* el mapa se queda sin pines; el tablero sigue funcionando */ })
      .finally(() => setCoordsLoading(false));
  }, [dispatchId]);

  const lastCheckLabel = useMemo(() => {
    if (!live?.lastFedexCheckAt) return null;
    const secs = Math.max(0, Math.round((Date.now() - new Date(live.lastFedexCheckAt).getTime()) / 1000));
    return secs < 60 ? `hace ${secs}s` : `hace ${Math.round(secs / 60)}m`;
  }, [live?.lastFedexCheckAt]);

  const counts = useMemo(() => {
    const c: Record<Category, number> = { todas: 0, entregado: 0, transito: 0, excepcion: 0, sindatos: 0 };
    for (const s of live?.stops || []) { c.todas++; c[categoryOf(s.headlineStatus)]++; }
    return c;
  }, [live?.stops]);

  const filteredStops = useMemo(() => {
    let list = live?.stops || [];
    if (category !== "todas") list = list.filter((s) => categoryOf(s.headlineStatus) === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) =>
        (s.recipientName || "").toLowerCase().includes(q) ||
        (s.recipientAddress || "").toLowerCase().includes(q) ||
        s.packages.some((p) => p.trackingNumber.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [live?.stops, category, search]);

  const mapStops = useMemo(
    () => (live?.stops || []).map((s) => ({ ...s, lat: coords.get(s.stopKey)?.lat ?? null, lng: coords.get(s.stopKey)?.lng ?? null })),
    [live?.stops, coords],
  );

  // Origen para las rutas sugeridas: coordenadas de la sucursal seleccionada.
  const origin = useMemo(() => {
    const sub = subsidiaries.find((s: any) => s.id === subsidiaryId);
    return sub?.latitude != null && sub?.longitude != null ? { lat: Number(sub.latitude), lng: Number(sub.longitude) } : null;
  }, [subsidiaries, subsidiaryId]);

  const filters = (
    <>
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Volver al tablero
      </Button>
      {subsidiaryName && (
        <span className="flex items-center gap-1 whitespace-nowrap text-xs font-medium text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {subsidiaryName}
        </span>
      )}
      <Select value={dispatchId} onValueChange={onChangeRoute} disabled={routesLoading || routes.length === 0}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder={routesLoading ? "Cargando…" : "Sin rutas activas"} />
        </SelectTrigger>
        <SelectContent>
          {/* La ruta actual puede ya estar CERRADA (no sale en "activas") — la agregamos aparte para que el combo siempre la muestre seleccionada. */}
          {!routes.some((r) => r.id === dispatchId) && live && (
            <SelectItem value={dispatchId}>{live.routeNames || live.trackingNumber} (cerrada)</SelectItem>
          )}
          {routes.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.routeNames || r.trackingNumber} — {r.driverNames || "sin chofer"} ({r.delivered}/{r.totalStops})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={() => loadRoutes()} disabled={routesLoading}>
        {routesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Rutas
      </Button>
      <Button variant="outline" size="sm" onClick={() => loadLive(false, true)} disabled={refreshing}>
        {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualizar (FedEx)
      </Button>
      {lastCheckLabel && <span className="whitespace-nowrap text-xs text-muted-foreground">Chequeo FedEx: {lastCheckLabel}</span>}
    </>
  );

  return (
    <div className="space-y-4">
      <OperationHeader
        icon={Radio}
        title="Monitoreo de Rutas (experimental)"
        description="Detalle en vivo — chequeo local y confirmación periódica con FedEx"
        actions={<div className="hidden items-center gap-2 lg:flex">{filters}</div>}
      />

      {/* Filtros en pantallas chicas — en desktop viven en el header. */}
      <Card className="lg:hidden">
        <CardContent className="flex flex-wrap items-center gap-2 p-3">{filters}</CardContent>
      </Card>

      {liveLoading && !live ? (
        <RouteDetailSkeleton />
      ) : live ? (
        <>
          {live.analysis.alerts.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {live.analysis.alerts.map((a, i) => {
                const Icon = ALERT_ICON[a.severity];
                const theme = ALERT_THEME[a.severity];
                return (
                  <div key={i} className={cn("flex items-start gap-3 rounded-lg border border-l-4 bg-white p-3 shadow-sm", theme.border)}>
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", theme.iconBg)}>
                      <Icon className={cn("h-4 w-4", theme.iconColor)} />
                    </span>
                    <div className="min-w-0">
                      <p className={cn("text-sm font-bold", theme.title)}>{ALERT_TITLE[a.code] || "Aviso"}</p>
                      <p className="text-sm text-muted-foreground">{a.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>Ruta creada: <strong className="text-foreground">{fmtWhen(live.createdAt)}</strong></span>
            {live.routeClosedAt ? (
              <span className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Cerrada: <strong>{fmtWhen(live.routeClosedAt)}</strong>
              </span>
            ) : (
              <span>Aún no se cierra (cierre de ruta pendiente)</span>
            )}
            <span className="flex items-center gap-1">
              <Package className="h-3.5 w-3.5" />
              <strong className="text-foreground">{live.analysis.normalPackageCount}</strong> guías
              {live.analysis.chargePackageCount > 0 && <> · <strong className="text-foreground">{live.analysis.chargePackageCount}</strong> cargas F2</>}
            </span>
          </div>

          {/* KPIs unificados — operación y cobros en una sola fila. El verde teal de
              "Tiempo en ruta" y el emerald de entregadas/cobros se mantienen siempre. */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="flex items-center gap-3 rounded-xl border-0 bg-gradient-to-br from-teal-600 to-teal-700 p-3 text-white shadow-sm">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/15"><Clock className="h-5 w-5" /></div>
              <div className="min-w-0">
                <div className="font-mono text-xl font-extrabold leading-none tabular-nums">{elapsed}</div>
                <div className="mt-1 text-xs font-semibold text-teal-50/90">Tiempo en ruta</div>
                <div className="truncate text-[11px] text-teal-50/70">{live.startTime ? `Salió ${fmtTime(live.startTime)}` : "Sin salida"}</div>
              </div>
            </div>
            <DetailKpi icon={CheckCircle2} iconClass="bg-emerald-100 text-emerald-700" numClass="text-emerald-600"
              value={`${counts.entregado}/${counts.todas}`} label="Entregadas"
              sub={`${counts.todas ? Math.round((counts.entregado / counts.todas) * 100) : 0}% completado`} />
            <DetailKpi icon={Truck} iconClass="bg-blue-100 text-blue-700" numClass="text-blue-600"
              value={counts.transito} label="En tránsito" sub="por confirmar" />
            <DetailKpi icon={AlertTriangle} iconClass="bg-amber-100 text-amber-700" numClass="text-amber-600"
              value={counts.excepcion} label="Excepción" sub="revisar" />
            <DetailKpi icon={Gauge} iconClass="bg-indigo-100 text-indigo-700" numClass="text-foreground"
              value={<>{live.analysis.paceCompletedPerHour ?? "—"}<span className="text-sm font-semibold text-muted-foreground">/h</span></>}
              label="Ritmo actual" sub={`${live.analysis.normalPackageCount} guías${live.analysis.chargePackageCount > 0 ? ` · ${live.analysis.chargePackageCount} F2` : ""}`} />
            <DetailKpi icon={Wallet} iconClass="bg-emerald-100 text-emerald-700" numClass="text-emerald-700"
              value={formatCurrency(live.analysis.paymentsCollectedTotal)} label="Cobros en mano"
              sub={live.analysis.paymentsCount > 0 ? `de ${formatCurrency(live.analysis.paymentsTotal)} · ${formatCurrency(live.analysis.paymentsPendingTotal)} pend.` : "sin cobros"} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
            {/* Paradas — contenedor tipo panel: plano, borde definido y barra de encabezado. */}
            <Card className="overflow-hidden rounded-xl border-border bg-card shadow-none">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b bg-muted/60 py-3">
                <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Paradas</CardTitle>
                <span className="text-xs font-semibold text-muted-foreground">{live.stops.length} ({live.stops.reduce((s, r) => s + r.packageCount, 0)} guías)</span>
              </CardHeader>
              <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/20 px-4 py-3">
                {(["todas", "entregado", "transito", "excepcion", "sindatos"] as Category[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                      category === c ? "border-foreground bg-foreground text-background" : "border-border bg-muted/50 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {CATEGORY_LABEL[c]} {counts[c]}
                  </button>
                ))}
                <div className="relative ml-auto min-w-[160px]">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar guía o cliente…" className="h-8 pl-8 text-xs" />
                </div>
              </div>
              {/* El SCROLL vive en este div, NO en el grid. Si el grid es a la vez
                  el contenedor con max-height + overflow, calcula mal la altura de
                  las filas y las tarjetas se enciman entre sí. Separándolos, el grid
                  queda como grid normal y cada fila se dimensiona a su contenido. */}
              <CardContent className="p-0">
                <div className="max-h-[560px] overflow-y-auto p-3">
                  {filteredStops.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">Sin paradas para este filtro.</p>
                  ) : (
                    <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2">
                      {filteredStops.map((s) => (
                        <StopCard key={s.stopKey} stop={s} waSettings={waSettings} routeName={live.routeNames} driverName={live.driverNames} />
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mapa + análisis del chofer */}
            <div className="flex flex-col gap-4">
              <RouteLiveMap stops={mapStops} loading={coordsLoading && coords.size === 0} origin={origin} />
              <DriverAnalysis live={live} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Tile de KPI unificado del detalle — mismo lenguaje visual que el tablero general. */
function DetailKpi({ icon: Icon, iconClass, numClass, value, label, sub }: {
  icon: ComponentType<{ className?: string }>; iconClass: string; numClass: string;
  value: ReactNode; label: string; sub: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
      <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", iconClass)}><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <div className={cn("font-mono text-xl font-extrabold leading-none tabular-nums", numClass)}>{value}</div>
        <div className="mt-1 text-xs font-semibold text-muted-foreground">{label}</div>
        <div className="truncate text-[11px] text-muted-foreground/70">{sub}</div>
      </div>
    </div>
  );
}

/** Severidad visual de una parada — mismos 4 colores que las tarjetas del tablero general. */
function stopSeverityOf(cat: Category, urgency: Urgency, deliveredCount: number, packageCount: number): Severity {
  if (urgency === "overdue") return "crit";
  if (cat === "entregado" && deliveredCount === packageCount) return "done";
  if (cat === "excepcion" || urgency === "today") return "warn";
  return "normal";
}

function StopCard({ stop, waSettings, routeName, driverName }: {
  stop: RouteStop; waSettings: WhatsappSettings | null; routeName: string | null; driverName: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const cat = categoryOf(stop.headlineStatus);
  // "Resuelto" = entregado O ya tiene un motivo de FedEx registrado (DEX/rechazo/devuelta/retorno)
  // — en ambos casos ya no sigue en riesgo de Local Delay, aunque siga pidiendo seguimiento operativo.
  const resolved = cat === "excepcion" || (cat === "entregado" && stop.deliveredCount === stop.packageCount);
  const phone = stop.packages.find((p) => p.recipientPhone)?.recipientPhone;
  const nextDue = stop.packages
    .map((p) => p.commitDateTime)
    .filter((d): d is string => !!d)
    .sort()[0];
  const urgency = nextDue ? dueUrgency(nextDue, resolved) : "normal";
  const sev = stopSeverityOf(cat, urgency, stop.deliveredCount, stop.packageCount);
  const carriers = Array.from(new Set(stop.packages.map((p) => String(p.carrier || "").toLowerCase()).filter(Boolean)));
  const hasCharges = stop.packages.some((p) => p.isCharge);
  const cobros = stop.packages.filter((p) => p.payment && p.payment.amount > 0);
  // El escaneo de llegada a estación local (67 o 44, según la config de la sucursal)
  // solo aplica a FedEx — sin esto ninguna guía DHL "falta" el escaneo.
  const fedexPkgs = stop.packages.filter((p) => String(p.carrier || "").toLowerCase() === "fedex");
  const hasScanToday = fedexPkgs.length > 0 && fedexPkgs.every((p) => p.hasScanToday);
  const missingScanToday = fedexPkgs.length > 0 && !hasScanToday && !resolved;
  const isRemesa = stop.packageCount > 1;

  // "Avisar al chofer": solo en paradas EN RIESGO de Local Delay hoy — vencidas o
  // que vencen hoy y aún sin resolver. Y solo si la función está activa en Configuración.
  const atRisk = !resolved && (urgency === "overdue" || urgency === "today");
  const canNotify = !!waSettings?.enabled && atRisk;
  const messageContext: DriverMessageContext = {
    cliente: stop.recipientName || "—",
    direccion: stop.recipientAddress || "—",
    cp: stop.recipientZip || "—",
    guias: stop.packages.map((p) => p.trackingNumber).join(", "),
    vence: nextDue ? fmtWhen(nextDue) : "hoy",
    ruta: routeName || "—",
    chofer: driverName || "chofer",
  };

  return (
    <div className={cn(
      // `min-w-0` es CRÍTICO: sin esto los ítems de grid tienen `min-width:auto`
      // y una guía larga (font-mono, no parte) desborda la columna y encima la
      // tarjeta vecina ("grid blowout"). Con min-w-0 la tarjeta respeta su columna.
      "min-w-0 overflow-hidden rounded-xl border border-l-4 shadow-sm transition-shadow hover:shadow-md",
      BORDER_LEFT_CLASS[sev], CARD_TINT_CLASS[sev],
    )}>
      <div className={cn("flex items-center justify-between gap-2 px-3 py-2", STRIPE_BG[sev])}>
        <span className={cn("flex shrink-0 items-center gap-1.5 text-xs font-bold", STRIPE_TEXT[sev])}>
          {stop.sequence != null ? (
            <><CheckCircle2 className="h-3.5 w-3.5" /> Visita #{stop.sequence}</>
          ) : (
            <><Clock className="h-3.5 w-3.5" /> Pendiente</>
          )}
        </span>
        <span className={cn("truncate rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide", PILL_CLASS[sev])}>
          {urgency === "overdue" ? "VENCIDA" : prettyStatus(stop.headlineStatus).toUpperCase()}
        </span>
      </div>

      <div className="space-y-2 p-3">
        <div>
          <p className="truncate text-[15px] font-bold">{stop.recipientName || "—"}</p>
          <p className="truncate text-xs text-muted-foreground">{stop.recipientAddress || "—"} {stop.recipientZip ? `· CP ${stop.recipientZip}` : ""}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {isRemesa ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 rounded font-mono text-sm font-semibold text-foreground/80 hover:text-primary"
            >
              {stop.packageCount} guías (remesa) <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
            </button>
          ) : (
            <p className="max-w-full truncate font-mono text-sm font-medium text-foreground/80">{stop.packages[0]?.trackingNumber}</p>
          )}
          {carriers.map((c) => (
            <span key={c} className={cn("rounded px-1.5 py-0.5 text-[11px] font-bold leading-4", CARRIER_STYLE[c] || "bg-slate-100 text-slate-600")}>
              {carrierLabel(c)}
            </span>
          ))}
          {hasCharges && (
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[11px] font-bold leading-4 text-indigo-700">F2/CARGA</span>
          )}
          {fedexPkgs.length > 0 && (
            <span className={cn(
              "rounded px-1.5 py-0.5 text-[11px] font-bold leading-4",
              hasScanToday ? "bg-emerald-100 text-emerald-700" : missingScanToday ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500",
            )}>
              {hasScanToday ? "CON SCAN HOY" : "SIN SCAN HOY"}
            </span>
          )}
        </div>

        {/* Remesa: cada guía con su propio estatus, cobro y F2, para saber
            exactamente cuáles paquetes componen la parada y cómo va cada una.
            Se muestra un resumen y se despliega la lista completa al dar clic. */}
        {isRemesa && (
          <div className="rounded-lg border bg-white/70">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            >
              <span>{stop.deliveredCount}/{stop.packageCount} entregadas en esta parada</span>
              <span className="flex items-center gap-1">{expanded ? "Ocultar" : "Ver guías"} <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} /></span>
            </button>
            {expanded && (
              <ul className="flex flex-col gap-0.5 border-t p-1.5">
                {stop.packages.map((p) => <PackageRow key={p.trackingNumber} pkg={p} />)}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {phone && <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {phone}</span>}
          {nextDue && (
            <span className={cn("flex items-center gap-1", DUE_TEXT_CLASS[urgency])}>
              <CalendarClock className="h-3.5 w-3.5" /> vence {fmtWhen(nextDue)}
            </span>
          )}
          {cobros.length > 0 && (
            <span className="flex items-center gap-1 font-semibold text-emerald-700">
              <Wallet className="h-3.5 w-3.5" /> {cobros.map((p) => `$${p.payment!.amount.toFixed(0)} ${p.payment!.type}`).join(", ")}
            </span>
          )}
        </div>

        {canNotify && (
          <div className="pt-0.5">
            <SendDriverMessageButton context={messageContext} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2">
        <span className="text-[11px] text-muted-foreground">
          {isRemesa ? `${stop.packageCount} guías` : "1 guía"}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {stop.lastScanAt ? fmtWhen(stop.lastScanAt) : "sin escaneo"}
        </span>
      </div>
    </div>
  );
}

/** Una guía dentro de una remesa expandida: su propio tracking, estatus y cobro. */
function PackageRow({ pkg }: { pkg: StopPackage }) {
  const cat = categoryOf(String(pkg.fedexStatus || pkg.status || "").toLowerCase());
  return (
    <li className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted/50">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-mono">{pkg.trackingNumber}</span>
        {pkg.isCharge && <span className="shrink-0 rounded bg-indigo-100 px-1 text-[9px] font-bold leading-4 text-indigo-700">F2</span>}
        {String(pkg.carrier || "").toLowerCase() === "fedex" && (
          <span className={cn("shrink-0 rounded px-1 text-[9px] font-bold leading-4", pkg.hasScanToday ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
            {pkg.hasScanToday ? "SCAN" : "SIN SCAN"}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {pkg.payment && pkg.payment.amount > 0 && (
          <span className="font-semibold text-emerald-700">${pkg.payment.amount.toFixed(0)}</span>
        )}
        <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px]", BADGE_STYLE[cat])}>{prettyStatus(pkg.fedexStatus || pkg.status)}</Badge>
      </span>
    </li>
  );
}

function DriverAnalysis({ live }: { live: LiveRouteStatus }) {
  const { analysis } = live;
  const maxGap = analysis.gaps.length ? Math.max(...analysis.gaps.map((g) => g.minutes), 1) : 1;
  return (
    <Card className="overflow-hidden rounded-xl border-border bg-card shadow-none">
      <CardHeader className="border-b bg-muted/60 py-3">
        <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Análisis del chofer</CardTitle>
        <CardDescription>Reconstruido a partir de los escaneos de entrega/DEX de cada parada.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {/* El hueco más largo y demás alertas accionables ya se muestran arriba, al inicio de la pantalla. */}
        <Row label="Tiempo promedio entre paradas" value={analysis.avgGapMinutes != null ? `${analysis.avgGapMinutes} min` : "—"} />
        <Row label="Hueco más largo" value={analysis.longestGap ? `${analysis.longestGap.minutes} min` : "—"} flag={!!analysis.longestGap && analysis.longestGap.minutes >= 30} />
        <Row label="Paradas visitadas / pendientes" value={`${analysis.visitedStops} / ${analysis.pendingStops}`} />
        <Row label="Ritmo actual" value={analysis.paceCompletedPerHour != null ? `${analysis.paceCompletedPerHour} paradas/h` : "—"} />
        {analysis.gaps.length > 1 && (
          <div className="flex h-12 items-end gap-1 pt-1">
            {analysis.gaps.map((g, i) => (
              <div key={i} title={`${g.fromLabel} → ${g.toLabel}: ${g.minutes} min`}
                className={cn("flex-1 rounded-t-sm", g.minutes >= 30 ? "bg-amber-400" : "bg-blue-300")}
                style={{ height: `${Math.max(8, (g.minutes / maxGap) * 100)}%` }} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, flag }: { label: string; value: string; flag?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono font-bold tabular-nums", flag && "text-amber-600")}>{value}</span>
    </div>
  );
}
