"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { PanelRightClose, PanelRightOpen, RefreshCw, Search, Sparkles, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { PmySpinner } from "@/components/ui/pmy-loader"
import { cn } from "@/lib/utils"
import { CommitBucket, getRouteSuggestions, SuggestedPackage } from "@/lib/services/route-suggestions"

type Scope = "hoy" | "manana"

const BUCKET_CHIP: Record<CommitBucket, { label: string; className: string }> = {
  vencido: { label: "Vencido", className: "bg-red-100 text-red-700" },
  hoy: { label: "Hoy", className: "bg-red-100 text-red-700" },
  manana: { label: "Mañana", className: "bg-amber-100 text-amber-800" },
  despues: { label: "Después", className: "bg-slate-100 text-slate-600" },
  sin_fecha: { label: "Sin fecha", className: "bg-slate-100 text-slate-600" },
}

const inScope = (b: CommitBucket, scope: Scope) => b === "vencido" || b === "hoy" || (scope === "manana" && b === "manana")

interface Props {
  subsidiaryId: string | null
  routes: { id: string; name: string }[]
  /** Códigos (dhlUniqueId o guía) que ya están en la salida o en "Por revisar": no se vuelven a sugerir. */
  inDispatch: Set<string>
  disabled?: boolean
  /** Agrega con la misma validación del escáner. */
  onAdd: (codes: string[]) => Promise<void>
  /** Panel oculto: solo se ve un botón angosto para volver a mostrarlo. */
  hidden?: boolean
  onHiddenChange?: (hidden: boolean) => void
}

/**
 * Panel de sugeridos de la nueva salida, con dos pestañas separadas: "Urgentes" (vencidos, hoy y,
 * si se elige, mañana) y "Resto en bodega" (lo demás; ningún paquete sale en las dos). Solo CPs que le tocan a las rutas elegidas y nada que ya esté en la
 * salida. Se agregan uno, varios o todos.
 */
export function DispatchSuggestedPanel({ subsidiaryId, routes, inDispatch, disabled, onAdd, hidden, onHiddenChange }: Props) {
  const [scope, setScope] = useState<Scope>("hoy")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState("")
  // Dos sugerencias que no se repiten: urgentes (según alcance) y el resto en bodega.
  const [tab, setTab] = useState<"vencer" | "bodega">("vencer")

  const { data, isLoading, isValidating, error, mutate } = useSWR(
    subsidiaryId ? ["route-suggestions", subsidiaryId] : null,
    () => getRouteSuggestions(subsidiaryId as string),
    { revalidateOnFocus: false },
  )

  const routeIds = useMemo(() => new Set(routes.map((r) => r.id)), [routes])
  const routeName = useMemo(() => new Map(routes.map((r) => [r.id, r.name])), [routes])

  /**
   * Paquetes que le TOCAN a las rutas elegidas: solo los de CPs cuya ruta asignada es una de
   * ellas (confirmada o la de mayor historial). Los de CPs que se asignan a otra ruta no se
   * sugieren aunque esta ruta también pase por ahí. Tampoco los que ya están en la salida.
   */
  const base = useMemo(() => {
    if (!data || routeIds.size === 0) return [] as { pkg: SuggestedPackage; routeId: string }[]
    // Busca por CP, guía, código de pieza, destinatario o dirección (varias palabras = todas).
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    const matches = (p: SuggestedPackage) => {
      if (!terms.length) return true
      const hay = [p.zip, p.trackingNumber, p.scanCode, p.recipientName, p.recipientAddress].filter(Boolean).join(" ").toLowerCase()
      return terms.every((t) => hay.includes(t))
    }
    const seen = new Set<string>()
    const rows: { pkg: SuggestedPackage; routeId: string }[] = []
    for (const r of data.routes) {
      if (!routeIds.has(r.routeId)) continue
      for (const pkg of r.packages) {
        if (seen.has(pkg.pieceKey) || !matches(pkg)) continue
        if (inDispatch.has(pkg.scanCode) || inDispatch.has(pkg.pieceKey)) continue
        seen.add(pkg.pieceKey)
        rows.push({ pkg, routeId: r.routeId })
      }
    }
    return rows
  }, [data, routeIds, inDispatch, query])

  const dueRows = useMemo(() => base.filter((r) => inScope(r.pkg.bucket, scope)), [base, scope])
  // "Resto en bodega": lo que NO es urgente, para que ningún paquete salga en las dos pestañas.
  const restRows = useMemo(() => base.filter((r) => !inScope(r.pkg.bucket, scope)), [base, scope])

  // Si no hay urgentes (al elegir rutas o después de agregarlos todos), se pasa solo a
  // "Resto en bodega" para que el panel no se quede vacío. Si el usuario sigue en Urgentes
  // y sí hay, no se le mueve.
  const loaded = !!data
  const [pickedUrgent, setPickedUrgent] = useState(false)
  // Clave estable de las rutas elegidas (el arreglo llega nuevo en cada render del padre).
  const routeKey = useMemo(() => [...routeIds].sort().join(","), [routeIds])
  useEffect(() => setPickedUrgent(false), [routeKey])
  useEffect(() => {
    if (!loaded || !routeKey || query || pickedUrgent) return
    if (tab === "vencer" && dueRows.length === 0 && restRows.length > 0) setTab("bodega")
  }, [loaded, routeKey, query, pickedUrgent, tab, dueRows.length, restRows.length])

  /** Conteos de "Todo en bodega" por vencimiento (para el resumen de la pestaña). */
  const counts = useMemo(() => {
    const c: Record<CommitBucket, number> = { vencido: 0, hoy: 0, manana: 0, despues: 0, sin_fecha: 0 }
    for (const r of restRows) c[r.pkg.bucket]++
    return c
  }, [restRows])

  const groups = useMemo(() => {
    const rows = tab === "vencer" ? dueRows : restRows
    const byZip = new Map<string, { zip: string; label: string; items: SuggestedPackage[] }>()
    for (const { pkg, routeId } of rows) {
      const zip = pkg.zip ?? "—"
      if (!byZip.has(zip)) byZip.set(zip, { zip, label: routeName.get(routeId) ?? "", items: [] })
      byZip.get(zip)!.items.push(pkg)
    }
    const urg: Record<CommitBucket, number> = { vencido: 0, hoy: 1, manana: 2, despues: 3, sin_fecha: 4 }
    return [...byZip.values()]
      .map((g) => ({
        ...g,
        label: tab === "bodega" ? `${g.items.length} ${g.items.length === 1 ? "paquete" : "paquetes"}` : g.label,
        items: g.items.sort((a, b) => urg[a.bucket] - urg[b.bucket] || (a.commitDateTime ?? "").localeCompare(b.commitDateTime ?? "")),
      }))
      .sort((a, b) => b.items.length - a.items.length || a.zip.localeCompare(b.zip))
  }, [tab, dueRows, restRows, routeName])

  const all = useMemo(() => groups.flatMap((g) => g.items), [groups])

  // Quitar de la selección lo que ya no está en la lista (agregado, cambio de ruta o de alcance).
  useEffect(() => {
    const visible = new Set(all.map((p) => p.scanCode))
    setSelected((prev) => {
      const next = new Set([...prev].filter((c) => visible.has(c)))
      return next.size === prev.size ? prev : next
    })
  }, [all])

  const toggle = (code: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  const allChecked = all.length > 0 && selected.size === all.length

  const add = async (codes: string[]) => {
    if (!codes.length) return
    setAdding(true)
    try {
      await onAdd(codes)
      setSelected(new Set())
    } finally {
      setAdding(false)
    }
  }

  if (hidden) {
    const pending = dueRows.length + restRows.length
    return (
      <button
        type="button"
        onClick={() => onHiddenChange?.(false)}
        title="Mostrar el panel de sugeridos"
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-100 2xl:sticky 2xl:top-4 2xl:h-[calc(100vh-7rem)] 2xl:flex-col 2xl:px-1 2xl:py-4"
      >
        <PanelRightOpen className="h-4 w-4 shrink-0" />
        <span className="2xl:[writing-mode:vertical-rl]">Mostrar sugeridos{routes.length > 0 ? ` (${pending})` : ""}</span>
      </button>
    )
  }

  return (
    <aside className="flex min-h-[320px] flex-col overflow-hidden rounded-lg border-2 border-violet-200 bg-background xl:sticky xl:top-4 xl:max-h-[calc(100vh-7rem)]">
      <div className="space-y-2 border-b border-violet-100 bg-violet-50 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" />
          <span className="text-base font-semibold text-violet-900">Sugeridos de tus rutas</span>
          <Button size="icon" variant="ghost" className="ml-auto h-7 w-7 text-violet-700" onClick={() => mutate()} disabled={isValidating} aria-label="Actualizar">
            {isValidating ? <PmySpinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
          {onHiddenChange && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-violet-700" onClick={() => onHiddenChange(true)} title="Ocultar el panel de sugeridos">
              <PanelRightClose className="h-3.5 w-3.5" /> Ocultar
            </Button>
          )}
        </div>
        {routes.length > 0 && (
          <div className="grid grid-cols-2 rounded-lg border border-violet-200 bg-background p-0.5">
            {(
              [
                { v: "vencer", label: `Urgentes · ${dueRows.length}` },
                { v: "bodega", label: `Resto en bodega · ${restRows.length}` },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => {
                  setTab(o.v)
                  // Si el usuario elige Urgentes a mano, no lo regresamos solos a Resto.
                  setPickedUrgent(o.v === "vencer")
                }}
                className={cn(
                  "rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
                  tab === o.v ? (o.v === "vencer" ? "bg-violet-600 text-white shadow-sm" : "bg-blue-700 text-white shadow-sm") : "text-violet-800 hover:bg-violet-100",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs leading-snug text-violet-700">
          {routes.length === 0
            ? "Elige una o más rutas y aquí aparecen los paquetes en bodega de sus CPs que están por vencer."
            : tab === "vencer"
              ? `Solo paquetes de los CPs que le tocan a ${routes.map((r) => r.name).join(", ")} y que todavía no están en la salida.`
              : `Lo demás en bodega de los CPs de ${routes.map((r) => r.name).join(", ")}: vence después o no trae fecha.`}
        </p>
        {routes.length > 0 && tab === "bodega" && (
          <div className="flex flex-wrap gap-1 text-[11px]">
            {(
              [
                ["vencido", "Vencidos", "bg-red-100 text-red-800"],
                ["hoy", "Hoy", "bg-red-100 text-red-700"],
                ["manana", "Mañana", "bg-amber-100 text-amber-800"],
                ["despues", "Después", "bg-slate-100 text-slate-700"],
                ["sin_fecha", "Sin fecha", "border bg-background text-slate-600"],
              ] as const
            )
              .filter(([b]) => counts[b] > 0)
              .map(([b, label, cls]) => (
                <span key={b} className={cn("rounded-md px-1.5 py-0.5", cls)}>
                  {label} {counts[b]}
                </span>
              ))}
          </div>
        )}
        {routes.length > 0 && tab === "vencer" && (
          <div className="flex items-center gap-1.5">
            <div className="inline-flex rounded-lg border border-violet-200 bg-background p-0.5">
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
                    scope === o.v ? "bg-violet-600 text-white shadow-sm" : "text-violet-700 hover:bg-violet-100",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {routes.length > 0 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar CP, guía, destinatario o dirección"
              className="h-8 bg-background pl-8 pr-8 text-xs"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpiar búsqueda">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {routes.length > 0 && (
        <>
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <PmySpinner className="h-4 w-4" /> Buscando paquetes…
            </div>
          ) : error ? (
            <p className="px-3 py-6 text-sm text-red-600">No se pudieron cargar los paquetes sugeridos.</p>
          ) : all.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              {query
                ? `Ningún paquete coincide con “${query}”.`
                : tab === "bodega"
                  ? "No hay más paquetes en bodega de estas rutas (fuera de los urgentes)."
                  : scope === "hoy"
                  ? "Nada vence hoy en estas rutas. Prueba con “Hoy + mañana”."
                  : "Nada vence hoy ni mañana en estas rutas."}
            </p>
          ) : (
            <>
              <label className="flex cursor-pointer items-center gap-2 border-b bg-muted/40 px-3 py-2 text-sm">
                <Checkbox
                  checked={allChecked ? true : selected.size > 0 ? "indeterminate" : false}
                  onCheckedChange={() => setSelected(allChecked ? new Set() : new Set(all.map((p) => p.scanCode)))}
                  disabled={disabled || adding}
                />
                <span className="font-medium">Seleccionar todos</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {selected.size} de {all.length}
                </span>
              </label>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {groups.map((g) => (
                  <div key={g.zip}>
                    <div className="sticky top-0 z-10 bg-background px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground">
                      CP {g.zip} · {g.label}
                    </div>
                    {g.items.map((p) => (
                      <label key={p.pieceKey} className="flex cursor-pointer items-center gap-2 border-b px-3 py-1.5 text-sm hover:bg-muted/40">
                        <Checkbox checked={selected.has(p.scanCode)} onCheckedChange={() => toggle(p.scanCode)} disabled={disabled || adding} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[15px] font-semibold tabular-nums">{p.trackingNumber}</span>
                            {p.carrier === "dhl" && <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">DHL</span>}
                            {p.kind === "charge" && <span className="rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-700">Carga</span>}
                            <span className="ml-auto shrink-0 rounded bg-violet-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-violet-800">CP {p.zip ?? "—"}</span>
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {p.recipientName ? `${p.recipientName} · ` : ""}{p.recipientAddress || "Sin dirección"} · {p.daysInWarehouse} {p.daysInWarehouse === 1 ? "día" : "días"} en bodega
                          </div>
                        </div>
                        <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold", BUCKET_CHIP[p.bucket].className)}>
                          {BUCKET_CHIP[p.bucket].label}
                          {p.commitDateTime && ` ${new Date(p.commitDateTime).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })}`}
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 border-t border-violet-100 px-3 py-2.5">
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="h-9 w-full border-violet-200 text-violet-800 hover:bg-violet-50"
                    onClick={() => add(all.map((p) => p.scanCode))}
                    disabled={disabled || adding}
                  >
                    Agregar todos ({all.length})
                  </Button>
                  <Button
                    className="h-9 w-full gap-2 bg-violet-600 hover:bg-violet-700"
                    onClick={() => add([...selected])}
                    disabled={disabled || adding || selected.size === 0}
                  >
                    {adding && <PmySpinner className="h-4 w-4" />}
                    Agregar seleccionados ({selected.size})
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Se validan igual que si los escanearas. Al agregarse se quitan de esta lista.</p>
              </div>
            </>
          )}
        </>
      )}
    </aside>
  )
}
