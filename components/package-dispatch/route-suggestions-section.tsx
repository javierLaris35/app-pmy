"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Combine,
  Eye,
  EyeOff,
  MapPinOff,
  RefreshCw,
  Sparkles,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PmySpinner } from "@/components/ui/pmy-loader";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { RoutePackagesDialog } from "./route-packages-dialog";
import { cn } from "@/lib/utils";
import {
  CommitBucket,
  getRouteSuggestions,
  savePrefillCodes,
  RouteSuggestion,
  SuggestedPackage,
} from "@/lib/services/route-suggestions";

type Scope = "hoy" | "manana";

const MAX_CARDS = 8;

const timeAgo = (iso: string | null) => {
  if (!iso) return "Sin salidas recientes";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  const hm = d.toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (d.toDateString() === today.toDateString())
    return `Última salida: hoy ${hm}`;
  if (d.toDateString() === yesterday.toDateString())
    return `Última salida: ayer ${hm}`;
  return `Última salida: ${d.toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" })}`;
};

/** Cuántos paquetes urgentes tiene una ruta según el alcance elegido. */
const urgentOf = (
  r: { overdue: number; today: number; tomorrow: number },
  scope: Scope,
) => r.overdue + r.today + (scope === "manana" ? r.tomorrow : 0);

/** Lo que NO es urgente (para no repetir paquetes entre secciones). */
const restOf = (
  r: { total: number; overdue: number; today: number; tomorrow: number },
  scope: Scope,
) => r.total - urgentOf(r, scope);

/** ¿El paquete cuenta como urgente con este alcance? */
const isUrgent = (b: CommitBucket, scope: Scope) =>
  b === "vencido" || b === "hoy" || (scope === "manana" && b === "manana");

interface Props {
  subsidiaryId: string;
  subsidiaryName: string;
}

/**
 * Sugerencias de salida del día: paquetes en bodega agrupados por la ruta que atiende su CP,
 * ordenados por vencimiento. "Crear salida" abre la pantalla de nueva salida con la ruta puesta.
 */
export function RouteSuggestionsSection({
  subsidiaryId,
  subsidiaryName,
}: Props) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useLocalStorage<boolean>(
    "dispatch_suggestions_collapsed",
    false,
  );
  const [scope, setScope] = useLocalStorage<Scope>(
    "dispatch_suggestions_scope",
    "hoy",
  );
  const [showAll, setShowAll] = useState(false);
  const [showAllRest, setShowAllRest] = useState(false);
  const [restCollapsed, setRestCollapsed] = useLocalStorage<boolean>(
    "dispatch_warehouse_collapsed",
    false,
  );
  // Mezclar: una sola sección; cada ruta junta lo urgente con todo lo que hay en bodega.
  const [mixed, setMixed] = useLocalStorage<boolean>(
    "dispatch_suggestions_mixed",
    false,
  );
  // Detalles (CPs de cada ruta): ocultos por defecto para que las tarjetas queden limpias.
  const [showDetails, setShowDetails] = useLocalStorage<boolean>(
    "dispatch_suggestions_details",
    false,
  );
  const [viewing, setViewing] = useState<{
    title: string;
    packages: SuggestedPackage[];
    /** Ruta para "Crear salida" desde la ventana (sin ruta = solo consulta). */
    routeId?: string;
  } | null>(null);

  const { data, isLoading, isValidating, error, mutate } = useSWR(
    subsidiaryId ? ["route-suggestions", subsidiaryId] : null,
    () => getRouteSuggestions(subsidiaryId),
    { revalidateOnFocus: false },
  );

  const cards = useMemo(() => {
    const list = [...(data?.routes ?? [])].sort(
      (a, b) =>
        urgentOf(b, scope) - urgentOf(a, scope) ||
        b.total - a.total ||
        a.routeName.localeCompare(b.routeName),
    );
    return showAll ? list : list.slice(0, MAX_CARDS);
  }, [data, scope, showAll]);

  /** Abre la nueva salida con la ruta y con estos paquetes (los elegidos en "Ver") ya agregados. */
  const createDispatchWithCodes = (routeId: string, codes: string[]) => {
    if (!codes.length) return;
    savePrefillCodes(routeId, codes);
    const qs = new URLSearchParams({
      sucursal: subsidiaryId,
      nombre: subsidiaryName,
      ruta: routeId,
      agregar: "lista",
    });
    router.push(`/operaciones/salidas-a-ruta/nueva?${qs.toString()}`);
  };

  /** Abre la nueva salida con la ruta puesta y, al abrir, agrega los urgentes o todo lo de bodega. */
  const createDispatch = (
    r: RouteSuggestion,
    what: "urgentes" | "resto" | "todo" | null,
  ) => {
    const qs = new URLSearchParams({
      sucursal: subsidiaryId,
      nombre: subsidiaryName,
      ruta: r.routeId,
    });
    if (what === "todo" && r.total > 0) qs.set("agregar", "todo");
    else if (what === "resto" && restOf(r, scope) > 0)
      qs.set("agregar", scope === "manana" ? "resto_manana" : "resto_hoy");
    else if (what === "urgentes" && urgentOf(r, scope) > 0)
      qs.set("agregar", scope);
    router.push(`/operaciones/salidas-a-ruta/nueva?${qs.toString()}`);
  };

  // Sección "Resto en bodega": rutas con más paquetes no urgentes primero.
  const restCards = useMemo(() => {
    const list = (data?.routes ?? []).filter((r) => restOf(r, scope) > 0);
    list.sort(
      (a, b) =>
        restOf(b, scope) - restOf(a, scope) ||
        a.routeName.localeCompare(b.routeName),
    );
    return showAllRest ? list : list.slice(0, MAX_CARDS);
  }, [data, scope, showAllRest]);
  const restRoutes = useMemo(
    () => (data?.routes ?? []).filter((r) => restOf(r, scope) > 0).length,
    [data, scope],
  );
  const restTotal = useMemo(
    () => (data?.routes ?? []).reduce((n, r) => n + restOf(r, scope), 0),
    [data, scope],
  );

  const totals = data?.totals;
  const urgentTotal = totals ? urgentOf(totals, scope) : 0;

  return (
    <section className="rounded-lg border bg-background">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <Sparkles className="h-4 w-4 text-violet-600" />
        <span className="text-sm font-semibold">
          {mixed
            ? "Sugerencias: urgentes y todo en bodega"
            : "Sugerencias por vencimiento"}
        </span>
        {totals && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {totals.total} en bodega · {urgentTotal} urgentes · {totals.routes}{" "}
            rutas
          </span>
        )}
        <span className="hidden text-xs text-muted-foreground lg:inline">
          Con los CPs de cada ruta y los vencimientos ·{" "}
          <span className="rounded bg-violet-100 px-1 text-violet-800">CP</span>{" "}
          morado = lo atienden varias rutas
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {!collapsed && (
            <div className="inline-flex rounded-lg border bg-background p-0.5">
              {(
                [
                  { v: "hoy", label: "Hoy" },
                  { v: "manana", label: "Hoy + mañana" },
                ] as const
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setScope(o.v)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    scope === o.v
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {showDetails ? "Ocultar detalles" : "Mostrar detalles"}
          </Button>
          <Button
            size="sm"
            variant={mixed ? "default" : "outline"}
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setMixed(!mixed)}
            title={
              mixed
                ? "Volver a ver las sugerencias separadas"
                : "Juntar en cada ruta lo que vence con todo lo que hay en bodega"
            }
          >
            <Combine className="h-3.5 w-3.5" />
            {mixed
              ? "Separar sugerencias"
              : "Mezclar rutas sugeridas con las de vencimientos"}
          </Button>
          {!collapsed && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => mutate()}
              disabled={isValidating}
              aria-label="Actualizar sugerencias"
            >
              {isValidating ? (
                <PmySpinner className="h-3.5 w-3.5" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
            {collapsed ? "Mostrar" : "Ocultar"}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="border-t px-3 py-3">
          {isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <PmySpinner className="h-4 w-4" /> Buscando paquetes en bodega…
            </div>
          ) : error ? (
            <p className="py-4 text-sm text-red-600">
              No se pudieron cargar las sugerencias. Intenta con el botón de
              actualizar.
            </p>
          ) : !data || data.totals.total === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No hay paquetes en bodega pendientes de salir. Todo al día.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
                {cards.map((r) => {
                  const urgent = urgentOf(r, scope);
                  const tone =
                    r.overdue + r.today > 0
                      ? "urgent"
                      : r.tomorrow > 0
                        ? "soon"
                        : "ok";
                  return (
                    <div
                      key={r.routeId}
                      className={cn(
                        "flex flex-col gap-2 rounded-lg border p-3",
                        tone === "urgent" && "border-red-200",
                        tone === "soon" && "border-amber-200",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="min-w-0 flex-1 truncate text-sm font-semibold"
                          title={r.routeName}
                        >
                          {r.routeName}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            tone === "urgent"
                              ? "bg-red-100 text-red-700"
                              : tone === "soon"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {tone === "urgent"
                            ? "Urgente"
                            : tone === "soon"
                              ? "Mañana"
                              : "Al día"}
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <Stat
                          value={r.overdue + r.today}
                          label={r.overdue ? "vencidos y hoy" : "vencen hoy"}
                          className={
                            r.overdue + r.today
                              ? "text-red-700"
                              : "text-muted-foreground"
                          }
                        />
                        <Stat
                          value={r.tomorrow}
                          label="mañana"
                          className={
                            r.tomorrow
                              ? "text-amber-700"
                              : "text-muted-foreground"
                          }
                        />
                        <Stat value={r.total} label="en bodega" />
                      </div>
                      {mixed && <Breakdown r={r} scope={scope} only="all" />}
                      {showDetails && (
                        <div className="flex flex-wrap gap-1">
                          {r.topZips.map((z) => (
                            <span
                              key={z.zip}
                              className={cn(
                                "rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                                z.shared
                                  ? "bg-violet-100 text-violet-800"
                                  : "bg-muted text-slate-700",
                              )}
                              title={
                                z.shared
                                  ? "CP compartido con otras rutas"
                                  : undefined
                              }
                            >
                              {z.zip}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-[11px] text-muted-foreground">
                        {r.openDispatchesToday > 0
                          ? `Ya tiene ${r.openDispatchesToday} salida abierta hoy`
                          : timeAgo(r.lastDispatchAt)}
                      </div>
                      <div className="mt-auto flex gap-1.5">
                        {urgent > 0 ? (
                          <Button
                            size="sm"
                            className="h-8 flex-1 px-2"
                            onClick={() => createDispatch(r, "urgentes")}
                            title="Crear salida con los urgentes ya agregados"
                          >
                            {mixed
                              ? `Urgentes (${urgent})`
                              : `Crear salida con ${urgent} →`}
                          </Button>
                        ) : (
                          !mixed && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 flex-1 px-2"
                              onClick={() => createDispatch(r, null)}
                            >
                              Crear salida
                            </Button>
                          )
                        )}
                        {mixed && (
                          <Button
                            size="sm"
                            className="h-8 flex-1 bg-blue-700 px-2 hover:bg-blue-800"
                            onClick={() => createDispatch(r, "todo")}
                            title="Crear salida con todo lo de bodega ya agregado"
                          >
                            Todo ({r.total})
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() =>
                            setViewing({
                              title: r.routeName,
                              packages: r.packages,
                              routeId: r.routeId,
                            })
                          }
                        >
                          Ver
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {data.unassigned.total > 0 && (
                  <div className="flex flex-col gap-2 rounded-lg border border-dashed border-violet-300 bg-violet-50 p-3">
                    <span className="text-sm font-semibold text-violet-800">
                      CP sin ruta
                    </span>
                    <div className="flex gap-4">
                      <Stat
                        value={data.unassigned.overdue + data.unassigned.today}
                        label={
                          data.unassigned.overdue
                            ? "vencidos y hoy"
                            : "vencen hoy"
                        }
                        className={
                          data.unassigned.overdue + data.unassigned.today
                            ? "text-red-700"
                            : "text-muted-foreground"
                        }
                      />
                      <Stat value={data.unassigned.total} label="en bodega" />
                    </div>
                    <p className="text-[11px] leading-snug text-violet-700">
                      Su CP no está en ninguna ruta (
                      {data.unassigned.topZips.map((z) => z.zip).join(", ")}).
                      Asígnalos para que aparezcan.
                    </p>
                    <div className="mt-auto flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 flex-1 border-violet-300 text-violet-800"
                        onClick={() => router.push("/administracion/rutas")}
                      >
                        Asignar CPs
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() =>
                          setViewing({
                            title: "CP sin ruta",
                            packages: data.unassigned.packages,
                          })
                        }
                      >
                        Ver
                      </Button>
                    </div>
                  </div>
                )}

                {data.noZip.total > 0 && (
                  <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <MapPinOff className="h-4 w-4 text-muted-foreground" />{" "}
                      Sin código postal
                    </span>
                    <div className="flex gap-4">
                      <Stat
                        value={data.noZip.overdue + data.noZip.today}
                        label={
                          data.noZip.overdue ? "vencidos y hoy" : "vencen hoy"
                        }
                        className={
                          data.noZip.overdue + data.noZip.today
                            ? "text-red-700"
                            : "text-muted-foreground"
                        }
                      />
                      <Stat
                        value={data.noZip.tomorrow}
                        label="mañana"
                        className={
                          data.noZip.tomorrow
                            ? "text-amber-700"
                            : "text-muted-foreground"
                        }
                      />
                      <Stat value={data.noZip.total} label="en bodega" />
                    </div>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      La guía no trae CP, así que no se puede sugerir ruta.
                      Revisa su vencimiento.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-auto h-8"
                      onClick={() =>
                        setViewing({
                          title: "Sin código postal",
                          packages: data.noZip.packages,
                        })
                      }
                    >
                      Ver paquetes
                    </Button>
                  </div>
                )}
              </div>

              {data.routes.length > MAX_CARDS && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-7 text-xs"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll
                    ? "Ver menos rutas"
                    : `Ver las ${data.routes.length} rutas`}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {!mixed && data && restTotal > 0 && (
        <div className="border-t-2 border-blue-200">
          <div className="flex flex-wrap items-center gap-2 bg-blue-50 px-3 py-2">
            <Warehouse className="h-4 w-4 text-blue-700" />
            <span className="text-sm font-semibold text-blue-900">
              Resto en bodega
            </span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] text-blue-900">
              {restTotal} paquetes de {restRoutes} rutas · sin los urgentes de
              arriba
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-7 gap-1 px-2 text-xs text-blue-800"
              onClick={() => setRestCollapsed(!restCollapsed)}
            >
              {restCollapsed ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
              {restCollapsed ? "Mostrar" : "Ocultar"}
            </Button>
          </div>
          {!restCollapsed && (
            <div className="px-3 py-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
                {restCards.map((r) => {
                  const rest = restOf(r, scope);
                  return (
                    <div
                      key={r.routeId}
                      className="flex flex-col gap-2 rounded-lg border border-blue-100 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="min-w-0 flex-1 truncate text-sm font-semibold"
                          title={r.routeName}
                        >
                          {r.routeName}
                        </span>
                        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                          En bodega
                        </span>
                      </div>
                      <div className="flex gap-4">
                        {scope === "hoy" && (
                          <Stat
                            value={r.tomorrow}
                            label="mañana"
                            className={
                              r.tomorrow
                                ? "text-amber-700"
                                : "text-muted-foreground"
                            }
                          />
                        )}
                        <Stat
                          value={r.later ?? 0}
                          label="después"
                          className={
                            r.later ? "text-slate-700" : "text-muted-foreground"
                          }
                        />
                        <Stat
                          value={r.noDate ?? 0}
                          label="sin fecha"
                          className={
                            r.noDate
                              ? "text-slate-700"
                              : "text-muted-foreground"
                          }
                        />
                        <Stat
                          value={rest}
                          label="en total"
                          className="text-blue-900"
                        />
                      </div>
                      <Breakdown r={r} scope={scope} only="rest" />
                      {showDetails && (
                        <div className="flex flex-wrap gap-1">
                          {r.topZips.map((z) => (
                            <span
                              key={z.zip}
                              className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-slate-700"
                            >
                              {z.zip}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-[11px] text-muted-foreground">
                        {r.openDispatchesToday > 0
                          ? `Ya tiene ${r.openDispatchesToday} salida abierta hoy`
                          : timeAgo(r.lastDispatchAt)}
                      </div>
                      <div className="mt-auto flex gap-1.5">
                        <Button
                          size="sm"
                          className="h-8 flex-1 bg-blue-700 px-2 hover:bg-blue-800"
                          onClick={() => createDispatch(r, "resto")}
                        >
                          Crear salida con {rest} →
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() =>
                            setViewing({
                              title: `${r.routeName} · resto en bodega`,
                              routeId: r.routeId,
                              packages: r.packages.filter(
                                (p) => !isUrgent(p.bucket, scope),
                              ),
                            })
                          }
                        >
                          Ver
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Lo que vence después o no trae fecha · ordenadas por cantidad
                  · solo CPs que le tocan a cada ruta
                </span>
                {restRoutes > MAX_CARDS && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-7 text-xs"
                    onClick={() => setShowAllRest(!showAllRest)}
                  >
                    {showAllRest
                      ? "Ver menos rutas"
                      : `Ver las ${restRoutes} rutas`}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <RoutePackagesDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={viewing?.title ?? ""}
        subsidiaryName={subsidiaryName}
        packages={viewing?.packages ?? []}
        onCreate={
          viewing?.routeId
            ? (codes) => createDispatchWithCodes(viewing.routeId!, codes)
            : undefined
        }
      />
    </section>
  );
}

function Stat({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  return (
    <div>
      <div
        className={cn(
          "text-xl font-bold tabular-nums leading-tight",
          className,
        )}
      >
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

/**
 * Barra de color con la proporción por vencimiento (los números van en los contadores).
 * `only="rest"`: solo lo no urgente (Resto en bodega); `only="all"`: todo (vista mezclada).
 */
function Breakdown({
  r,
  scope,
  only,
}: {
  r: RouteSuggestion;
  scope: Scope;
  only: "rest" | "all";
}) {
  const all = [
    { key: "vencido", n: r.overdue, label: "Vencidos", bar: "bg-red-800" },
    { key: "hoy", n: r.today, label: "Hoy", bar: "bg-red-500" },
    { key: "manana", n: r.tomorrow, label: "Mañana", bar: "bg-amber-500" },
    { key: "despues", n: r.later ?? 0, label: "Después", bar: "bg-slate-400" },
    {
      key: "sin_fecha",
      n: r.noDate ?? 0,
      label: "Sin fecha",
      bar: "bg-slate-200",
    },
  ] as const;
  const parts = all.filter(
    (p) => p.n > 0 && (only === "all" || !isUrgent(p.key, scope)),
  );
  const total = Math.max(
    parts.reduce((n, p) => n + p.n, 0),
    1,
  );
  return (
    <div
      className="flex h-2 overflow-hidden rounded-full bg-muted"
      title={parts.map((p) => `${p.label}: ${p.n}`).join(" · ")}
    >
      {parts.map((p) => (
        <span
          key={p.key}
          className={p.bar}
          style={{ width: `${(p.n / total) * 100}%` }}
        />
      ))}
    </div>
  );
}
