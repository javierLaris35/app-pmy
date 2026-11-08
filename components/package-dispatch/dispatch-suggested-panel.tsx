"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { RefreshCw, Sparkles } from "lucide-react"
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
  /** Códigos (dhlUniqueId o guía) que ya están en la salida: no se vuelven a sugerir. */
  inDispatch: Set<string>
  disabled?: boolean
  /** Agrega con la misma validación del escáner. */
  onAdd: (codes: string[]) => Promise<void>
}

/**
 * Panel "Vencen hoy en tus rutas" de la nueva salida: paquetes en bodega de los CPs de las
 * rutas elegidas que vencen hoy (o mañana). Se agregan uno, varios o todos.
 */
export function DispatchSuggestedPanel({ subsidiaryId, routes, inDispatch, disabled, onAdd }: Props) {
  const [scope, setScope] = useState<Scope>("hoy")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)

  const { data, isLoading, isValidating, error, mutate } = useSWR(
    subsidiaryId ? ["route-suggestions", subsidiaryId] : null,
    () => getRouteSuggestions(subsidiaryId as string),
    { revalidateOnFocus: false },
  )

  const routeIds = useMemo(() => new Set(routes.map((r) => r.id)), [routes])
  const routeName = useMemo(() => new Map(routes.map((r) => [r.id, r.name])), [routes])

  /** Paquetes de las rutas elegidas: los que se les asignan y los de CPs que comparten con otra ruta. */
  const groups = useMemo(() => {
    if (!data || routeIds.size === 0) return []
    const seen = new Set<string>()
    const rows: { pkg: SuggestedPackage; ownerId: string | null }[] = []
    const consider = (pkg: SuggestedPackage, ownerId: string | null) => {
      if (seen.has(pkg.pieceKey) || inDispatch.has(pkg.scanCode) || !inScope(pkg.bucket, scope)) return
      const mine = (ownerId && routeIds.has(ownerId)) || pkg.sharedRouteIds.some((id) => routeIds.has(id))
      if (!mine) return
      seen.add(pkg.pieceKey)
      rows.push({ pkg, ownerId })
    }
    for (const r of data.routes) for (const p of r.packages) consider(p, r.routeId)

    const byZip = new Map<string, { zip: string; label: string; items: SuggestedPackage[] }>()
    for (const { pkg, ownerId } of rows) {
      const zip = pkg.zip ?? "—"
      if (!byZip.has(zip)) {
        const routesOfZip = [ownerId, ...pkg.sharedRouteIds].filter((id): id is string => !!id && routeIds.has(id)).map((id) => routeName.get(id))
        const others = pkg.sharedWith.length + (ownerId && !routeIds.has(ownerId) ? 1 : 0)
        const label = `${routesOfZip.join(" / ")}${others > 0 ? " · compartido con otras rutas" : ""}`
        byZip.set(zip, { zip, label, items: [] })
      }
      byZip.get(zip)!.items.push(pkg)
    }
    const urg = (p: SuggestedPackage) => (p.bucket === "vencido" ? 0 : p.bucket === "hoy" ? 1 : 2)
    return [...byZip.values()]
      .map((g) => ({ ...g, items: g.items.sort((a, b) => urg(a) - urg(b) || (a.commitDateTime ?? "").localeCompare(b.commitDateTime ?? "")) }))
      .sort((a, b) => b.items.length - a.items.length || a.zip.localeCompare(b.zip))
  }, [data, routeIds, routeName, inDispatch, scope])

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

  return (
    <aside className="flex min-h-[320px] flex-col overflow-hidden rounded-lg border-2 border-violet-200 bg-background xl:sticky xl:top-4 xl:max-h-[calc(100vh-7rem)]">
      <div className="space-y-2 border-b border-violet-100 bg-violet-50 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" />
          <span className="text-sm font-semibold text-violet-900">{scope === "hoy" ? "Vencen hoy en tus rutas" : "Vencen hoy y mañana en tus rutas"}</span>
          {routes.length > 0 && <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800">{all.length} en bodega</span>}
        </div>
        <p className="text-xs leading-snug text-violet-700">
          {routes.length === 0
            ? "Elige una o más rutas y aquí aparecen los paquetes en bodega de sus CPs que están por vencer."
            : `Paquetes en bodega de los CPs de ${routes.map((r) => r.name).join(", ")} que todavía no están en la salida.`}
        </p>
        {routes.length > 0 && (
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
            <Button size="icon" variant="ghost" className="ml-auto h-7 w-7 text-violet-700" onClick={() => mutate()} disabled={isValidating} aria-label="Actualizar">
              {isValidating ? <PmySpinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
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
              {scope === "hoy" ? "Nada vence hoy en estas rutas. Prueba con “Hoy + mañana”." : "Nada vence hoy ni mañana en estas rutas."}
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
                    <div className="sticky top-0 z-10 bg-background px-3 pb-1 pt-2 text-[11px] font-semibold text-muted-foreground">
                      CP {g.zip} · {g.label}
                    </div>
                    {g.items.map((p) => (
                      <label key={p.pieceKey} className="flex cursor-pointer items-center gap-2 border-b px-3 py-1.5 text-sm hover:bg-muted/40">
                        <Checkbox checked={selected.has(p.scanCode)} onCheckedChange={() => toggle(p.scanCode)} disabled={disabled || adding} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold tabular-nums">{p.trackingNumber}</span>
                            {p.carrier === "dhl" && <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">DHL</span>}
                            {p.kind === "charge" && <span className="rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-700">Carga</span>}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {p.recipientAddress || "Sin dirección"} · {p.daysInWarehouse} {p.daysInWarehouse === 1 ? "día" : "días"} en bodega
                          </div>
                        </div>
                        <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold", BUCKET_CHIP[p.bucket].className)}>
                          {BUCKET_CHIP[p.bucket].label}
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 border-t border-violet-100 px-3 py-2.5">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-9 flex-1 border-violet-200 text-violet-800 hover:bg-violet-50"
                    onClick={() => add(all.map((p) => p.scanCode))}
                    disabled={disabled || adding}
                  >
                    Agregar todos ({all.length})
                  </Button>
                  <Button
                    className="h-9 flex-1 gap-2 bg-violet-600 hover:bg-violet-700"
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
