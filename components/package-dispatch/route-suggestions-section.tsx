"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp, MapPinOff, RefreshCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PmySpinner } from "@/components/ui/pmy-loader"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { cn } from "@/lib/utils"
import { CommitBucket, getRouteSuggestions, RouteSuggestion, SuggestedPackage } from "@/lib/services/route-suggestions"

type Scope = "hoy" | "manana"

const BUCKET_CHIP: Record<CommitBucket, { label: string; className: string }> = {
  vencido: { label: "Vencido", className: "bg-red-100 text-red-700" },
  hoy: { label: "Hoy", className: "bg-red-100 text-red-700" },
  manana: { label: "Mañana", className: "bg-amber-100 text-amber-800" },
  despues: { label: "Después", className: "bg-slate-100 text-slate-600" },
  sin_fecha: { label: "Sin fecha", className: "bg-slate-100 text-slate-600" },
}

const MAX_CARDS = 8

const timeAgo = (iso: string | null) => {
  if (!iso) return "Sin salidas recientes"
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86_400_000)
  const hm = d.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" })
  if (d.toDateString() === today.toDateString()) return `Última salida: hoy ${hm}`
  if (d.toDateString() === yesterday.toDateString()) return `Última salida: ayer ${hm}`
  return `Última salida: ${d.toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" })}`
}

/** Cuántos paquetes urgentes tiene una ruta según el alcance elegido. */
const urgentOf = (r: { overdue: number; today: number; tomorrow: number }, scope: Scope) =>
  r.overdue + r.today + (scope === "manana" ? r.tomorrow : 0)

interface Props {
  subsidiaryId: string
  subsidiaryName: string
}

/**
 * Sugerencias de salida del día: paquetes en bodega agrupados por la ruta que atiende su CP,
 * ordenados por vencimiento. "Crear salida" abre la pantalla de nueva salida con la ruta puesta.
 */
export function RouteSuggestionsSection({ subsidiaryId, subsidiaryName }: Props) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useLocalStorage<boolean>("dispatch_suggestions_collapsed", false)
  const [scope, setScope] = useLocalStorage<Scope>("dispatch_suggestions_scope", "hoy")
  const [showAll, setShowAll] = useState(false)
  const [viewing, setViewing] = useState<{ title: string; packages: SuggestedPackage[] } | null>(null)

  const { data, isLoading, isValidating, error, mutate } = useSWR(
    subsidiaryId ? ["route-suggestions", subsidiaryId] : null,
    () => getRouteSuggestions(subsidiaryId),
    { revalidateOnFocus: false },
  )

  const cards = useMemo(() => {
    const list = [...(data?.routes ?? [])].sort(
      (a, b) => urgentOf(b, scope) - urgentOf(a, scope) || b.total - a.total || a.routeName.localeCompare(b.routeName),
    )
    return showAll ? list : list.slice(0, MAX_CARDS)
  }, [data, scope, showAll])

  const createDispatch = (r: RouteSuggestion) => {
    const qs = new URLSearchParams({ sucursal: subsidiaryId, nombre: subsidiaryName, ruta: r.routeId })
    router.push(`/operaciones/salidas-a-ruta/nueva?${qs.toString()}`)
  }

  const totals = data?.totals
  const urgentTotal = totals ? urgentOf(totals, scope) : 0

  return (
    <section className="rounded-lg border bg-background">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <Sparkles className="h-4 w-4 text-violet-600" />
        <span className="text-sm font-semibold">Sugerencias para hoy</span>
        {totals && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {totals.total} en bodega · {urgentTotal} urgentes · {totals.routes} rutas
          </span>
        )}
        <span className="hidden text-xs text-muted-foreground lg:inline">
          Con los CPs de cada ruta y los vencimientos · <span className="rounded bg-violet-100 px-1 text-violet-800">CP</span> morado = lo atienden varias rutas
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
                    scope === o.v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
          {!collapsed && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => mutate()} disabled={isValidating} aria-label="Actualizar sugerencias">
              {isValidating ? <PmySpinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
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
            <p className="py-4 text-sm text-red-600">No se pudieron cargar las sugerencias. Intenta con el botón de actualizar.</p>
          ) : !data || data.totals.total === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No hay paquetes en bodega pendientes de salir. Todo al día.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
                {cards.map((r) => {
                  const urgent = urgentOf(r, scope)
                  const tone = r.overdue + r.today > 0 ? "urgent" : r.tomorrow > 0 ? "soon" : "ok"
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
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={r.routeName}>{r.routeName}</span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            tone === "urgent" ? "bg-red-100 text-red-700" : tone === "soon" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {tone === "urgent" ? "Urgente" : tone === "soon" ? "Mañana" : "Al día"}
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <Stat value={r.overdue + r.today} label={r.overdue ? "vencidos y hoy" : "vencen hoy"} className={r.overdue + r.today ? "text-red-700" : "text-muted-foreground"} />
                        <Stat value={r.tomorrow} label="mañana" className={r.tomorrow ? "text-amber-700" : "text-muted-foreground"} />
                        <Stat value={r.total} label="en bodega" />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {r.topZips.map((z) => (
                          <span
                            key={z.zip}
                            className={cn("rounded-md px-1.5 py-0.5 text-[11px] tabular-nums", z.shared ? "bg-violet-100 text-violet-800" : "bg-muted text-slate-700")}
                            title={z.shared ? "CP compartido con otras rutas" : undefined}
                          >
                            {z.zip}
                          </span>
                        ))}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.openDispatchesToday > 0 ? `Ya tiene ${r.openDispatchesToday} salida abierta hoy` : timeAgo(r.lastDispatchAt)}
                      </div>
                      <div className="mt-auto flex gap-1.5">
                        {urgent > 0 ? (
                          <Button size="sm" className="h-8 flex-1" onClick={() => createDispatch(r)}>
                            Crear salida con {urgent} →
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8 flex-1" onClick={() => createDispatch(r)}>
                            Crear salida
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setViewing({ title: r.routeName, packages: r.packages })}>
                          Ver
                        </Button>
                      </div>
                    </div>
                  )
                })}

                {data.unassigned.total > 0 && (
                  <div className="flex flex-col gap-2 rounded-lg border border-dashed border-violet-300 bg-violet-50 p-3">
                    <span className="text-sm font-semibold text-violet-800">CP sin ruta</span>
                    <div className="flex gap-4">
                      <Stat
                        value={data.unassigned.overdue + data.unassigned.today}
                        label={data.unassigned.overdue ? "vencidos y hoy" : "vencen hoy"}
                        className={data.unassigned.overdue + data.unassigned.today ? "text-red-700" : "text-muted-foreground"}
                      />
                      <Stat value={data.unassigned.total} label="en bodega" />
                    </div>
                    <p className="text-[11px] leading-snug text-violet-700">
                      Su CP no está en ninguna ruta ({data.unassigned.topZips.map((z) => z.zip).join(", ")}). Asígnalos para que aparezcan.
                    </p>
                    <div className="mt-auto flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-8 flex-1 border-violet-300 text-violet-800" onClick={() => router.push("/administracion/rutas")}>
                        Asignar CPs
                      </Button>
                      <Button size="sm" variant="outline" className="h-8" onClick={() => setViewing({ title: "CP sin ruta", packages: data.unassigned.packages })}>
                        Ver
                      </Button>
                    </div>
                  </div>
                )}

                {data.noZip.total > 0 && (
                  <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <MapPinOff className="h-4 w-4 text-muted-foreground" /> Sin código postal
                    </span>
                    <div className="flex gap-4">
                      <Stat value={data.noZip.overdue + data.noZip.today} label={data.noZip.overdue ? "vencidos y hoy" : "vencen hoy"} className={data.noZip.overdue + data.noZip.today ? "text-red-700" : "text-muted-foreground"} />
                      <Stat value={data.noZip.tomorrow} label="mañana" className={data.noZip.tomorrow ? "text-amber-700" : "text-muted-foreground"} />
                      <Stat value={data.noZip.total} label="en bodega" />
                    </div>
                    <p className="text-[11px] leading-snug text-muted-foreground">La guía no trae CP, así que no se puede sugerir ruta. Revisa su vencimiento.</p>
                    <Button size="sm" variant="outline" className="mt-auto h-8" onClick={() => setViewing({ title: "Sin código postal", packages: data.noZip.packages })}>
                      Ver paquetes
                    </Button>
                  </div>
                )}
              </div>

              {data.routes.length > MAX_CARDS && (
                <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs" onClick={() => setShowAll(!showAll)}>
                  {showAll ? "Ver menos rutas" : `Ver las ${data.routes.length} rutas`}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>{viewing?.title}</DialogTitle>
            <DialogDescription>{viewing?.packages.length ?? 0} paquetes en bodega, primero los más urgentes</DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] divide-y overflow-y-auto">
            {viewing?.packages.map((p) => (
              <div key={p.pieceKey} className="flex items-center gap-3 px-4 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums">{p.trackingNumber}</span>
                    {p.carrier === "dhl" && <span className="rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">DHL</span>}
                    {p.kind === "charge" && <span className="rounded bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-700">Carga</span>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {p.zip ? `CP ${p.zip} · ` : ""}
                    {p.recipientAddress || "Sin dirección"} · {p.daysInWarehouse} {p.daysInWarehouse === 1 ? "día" : "días"} en bodega
                  </div>
                  {p.sharedWith.length > 0 && <div className="text-[11px] text-violet-700">CP compartido con {p.sharedWith.join(", ")}</div>}
                </div>
                <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold", BUCKET_CHIP[p.bucket].className)}>
                  {BUCKET_CHIP[p.bucket].label}
                  {p.commitDateTime && p.bucket !== "sin_fecha" && ` · ${new Date(p.commitDateTime).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}`}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function Stat({ value, label, className }: { value: number; label: string; className?: string }) {
  return (
    <div>
      <div className={cn("text-xl font-bold tabular-nums leading-tight", className)}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  )
}
