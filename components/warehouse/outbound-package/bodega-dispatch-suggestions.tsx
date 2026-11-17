"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DispatchSuggestedPanel } from "@/components/package-dispatch/dispatch-suggested-panel"
import { axiosConfig } from "@/lib/axios-config"
import { getDriversBySucursalId } from "@/lib/services/drivers"
import { getVehiclesBySucursalId } from "@/lib/services/vehicles"
import { getRouteSuggestions, type SuggestionsResult } from "@/lib/services/route-suggestions"
import { resolveId } from "@/components/warehouse/shared/resolve-id"

interface HintsProps {
  warehouseId: string
  routes: { id: string; name: string }[]
  /** Lo que tiene la sesión de Bodega (objetos de chofer y unidad, o ids). */
  drivers: unknown[]
  vehicle: unknown
  /** Recibe los objetos completos, igual que los selectores de Bodega. */
  onApplyDefaults: (drivers: any[], vehicle: any | null) => void
  kms: number | null
  /** "defaults": chofer/unidad sugeridos (arriba del tipo de salida); "kms": último kilometraje (junto a sus campos). */
  part: "defaults" | "kms"
}

/**
 * Pistas de Bodega → Salida a ruta junto a sus campos: chofer/unidad que suelen ir a las rutas
 * elegidas (con "Usar sugerencia") y el último kilometraje de la unidad.
 */
export function BodegaDispatchSuggestions({ warehouseId, routes, drivers: currentDrivers, vehicle, onApplyDefaults, kms, part }: HintsProps) {
  const driverIds = (currentDrivers ?? []).map(resolveId).filter(Boolean)
  const vehicleId = resolveId(vehicle)
  const routeKey = useMemo(() => routes.map((r) => r.id).sort().join(","), [routes])

  // Chofer y unidad que más han ido a estas rutas.
  const { data: defaults } = useSWR(
    warehouseId && routeKey ? ["dispatch-defaults", warehouseId, routeKey] : null,
    async () =>
      (
        await axiosConfig.get<{ driverIds: string[]; vehicleId: string | null; driverHits: number; sample: number }>("/route-suggestions/dispatch-defaults", {
          params: { subsidiaryId: warehouseId, routeIds: routeKey },
        })
      ).data,
    { revalidateOnFocus: false },
  )
  const { data: drivers } = useSWR(warehouseId ? ["drivers", warehouseId] : null, () => getDriversBySucursalId(warehouseId), { revalidateOnFocus: false })
  const { data: vehicles } = useSWR(warehouseId ? ["vehicles", warehouseId] : null, () => getVehiclesBySucursalId(warehouseId), { revalidateOnFocus: false })

  const sugDrivers = (defaults?.driverIds ?? []).map((id) => (drivers as any[] | undefined)?.find((d) => d.id === id)).filter(Boolean) as { id: string; name: string }[]
  const sugVehicle = defaults?.vehicleId ? ((vehicles as any[] | undefined)?.find((v) => v.id === defaults.vehicleId) as { id: string; name: string } | undefined) : undefined
  const alreadyApplied = (!sugDrivers.length || sugDrivers.every((d) => driverIds.includes(d.id))) && (!sugVehicle || vehicleId === sugVehicle.id)
  const showDefaults = (sugDrivers.length > 0 || !!sugVehicle) && !alreadyApplied

  // Último kilometraje de la unidad elegida (referencia; avisa si el capturado es menor).
  const { data: kmInfo } = useSWR(
    vehicleId ? ["vehicle-kms", vehicleId] : null,
    async () => (await axiosConfig.get<{ lastKms: number | null }>("/route-suggestions/vehicle-kms", { params: { vehicleId } })).data,
    { revalidateOnFocus: false },
  )
  const kmsLower = !!kmInfo?.lastKms && !!kms && kms > 0 && kms < kmInfo.lastKms

  if (!routes.length) return null

  if (part === "defaults") {
    if (!showDefaults) return null
    return (
      <div className="flex items-center gap-2 rounded-lg border-[1.5px] border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
        <Sparkles className="h-4 w-4 shrink-0 text-violet-600" />
        <span className="min-w-0 flex-1">
          Sugerido por sus últimas salidas: <b>{[sugDrivers.map((d) => d.name).join(", "), sugVehicle?.name].filter(Boolean).join(" y ")}</b>
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 shrink-0 border-violet-300 bg-background px-2.5 text-xs text-violet-800"
          onClick={() => onApplyDefaults(sugDrivers, sugVehicle ?? null)}
        >
          Usar sugerencia
        </Button>
      </div>
    )
  }

  if (!kmInfo?.lastKms) return null

  return (
    <div className="space-y-1.5 md:col-span-2">
      {kmInfo?.lastKms ? (
        <p className={kmsLower ? "text-[11px] font-medium text-amber-700" : "text-[11px] text-muted-foreground"}>
          {kmsLower
            ? `El kilometraje capturado es menor al último registrado de la unidad (${kmInfo.lastKms.toLocaleString("es-MX")}). Revísalo.`
            : `Último kilometraje registrado de la unidad: ${kmInfo.lastKms.toLocaleString("es-MX")} km`}
        </p>
      ) : null}
    </div>
  )
}

interface ButtonProps {
  warehouseId: string
  routes: { id: string; name: string }[]
  /** Códigos que ya están en la salida (o rechazados): no se cuentan ni se sugieren. */
  inDispatch: Set<string>
  disabled?: boolean
  onAdd: (codes: string[]) => Promise<void>
}

/** Cuenta urgentes y resto de las rutas elegidas, con las mismas reglas del panel. */
function countFor(data: SuggestionsResult | undefined, routeIds: Set<string>, inDispatch: Set<string>) {
  let urgent = 0
  let rest = 0
  if (!data || !routeIds.size) return { urgent, rest }
  const seen = new Set<string>()
  for (const r of data.routes) {
    if (!routeIds.has(r.routeId)) continue
    for (const p of r.packages) {
      if (seen.has(p.pieceKey) || inDispatch.has(p.scanCode) || inDispatch.has(p.pieceKey)) continue
      seen.add(p.pieceKey)
      if (p.bucket === "vencido" || p.bucket === "hoy") urgent++
      else rest++
    }
  }
  return { urgent, rest }
}

/**
 * Botón "Sugeridos" de la barra del inventario de Bodega → Salida: muestra los urgentes de las
 * rutas elegidas y abre, por encima de la pantalla, el mismo panel de Operaciones.
 */
export function BodegaSuggestedButton({ warehouseId, routes, inDispatch, disabled, onAdd }: ButtonProps) {
  const [open, setOpen] = useState(false)
  const routeIds = useMemo(() => new Set(routes.map((r) => r.id)), [routes])
  const { data } = useSWR(warehouseId ? ["route-suggestions", warehouseId] : null, () => getRouteSuggestions(warehouseId), { revalidateOnFocus: false })
  const counts = useMemo(() => countFor(data, routeIds, inDispatch), [data, routeIds, inDispatch])
  const noRoutes = routes.length === 0

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 border-violet-300 px-2.5 text-xs text-violet-800 hover:bg-violet-50"
        disabled={noRoutes}
        title={noRoutes ? "Elige una ruta para ver los paquetes sugeridos" : "Paquetes en bodega de los CPs de las rutas elegidas"}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-3.5 w-3.5 text-violet-600" />
        Sugeridos
        {!noRoutes && data &&
          (counts.urgent > 0 ? (
            <span className="rounded-full bg-red-100 px-1.5 text-[11px] font-semibold text-red-700">{counts.urgent} urgentes</span>
          ) : (
            <span className="rounded-full bg-violet-100 px-1.5 text-[11px] font-semibold text-violet-800">{counts.rest}</span>
          ))}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-3 p-4 sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>Sugeridos de {routes.map((r) => r.name).join(", ")}</SheetTitle>
            <SheetDescription>Agrega uno, varios o todos; se validan igual que al escanear.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">
            <DispatchSuggestedPanel subsidiaryId={warehouseId} routes={routes} inDispatch={inDispatch} disabled={disabled} onAdd={onAdd} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
