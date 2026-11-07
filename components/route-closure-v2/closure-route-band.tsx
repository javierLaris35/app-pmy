"use client"

import { Layers } from "lucide-react"

export interface ClosureRoutePart {
  id: string
  folio: string
  /** Nombre de la ruta a la que salió ("Centro → Palmilla" si fueron varias). */
  routeName?: string
  packages: number
}

interface Props {
  drivers: string[]
  /** Día de la ruta YYYY-MM-DD. */
  routeDay: string | null
  vehicle?: string | null
  kmsOut?: string | null
  totalPackages: number
  /** Rutas que se cierran (más de una = cierre agrupado). */
  routes: ClosureRoutePart[]
  is315?: boolean
}

/** "ALAN DAVID PERAZA" → "Alan David Peraza" (los nombres vienen capturados de muchas formas). */
export const personName = (name: string) =>
  name.toLocaleLowerCase("es-MX").replace(/(^|\s)(\p{L})/gu, (_, sp: string, ch: string) => sp + ch.toLocaleUpperCase("es-MX"))

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase("es-MX"))
    .join("")

/** "2026-11-02" → "Lunes 02 de noviembre" (día calendario, sin correrse por zona horaria). */
const longDay = (day: string) => {
  const s = new Date(`${day}T12:00:00Z`).toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Banda de arriba del cierre: de quién es, qué día, en qué unidad y qué rutas se cierran. */
export function ClosureRouteBand({ drivers, routeDay, vehicle, kmsOut, totalPackages, routes, is315 }: Props) {
  const driver = drivers[0] ? personName(drivers[0]) : "Sin chofer"
  const extraDrivers = drivers.slice(1).map(personName)
  const facts = [
    routeDay ? longDay(routeDay) : null,
    vehicle ? `Unidad ${vehicle}` : null,
    kmsOut ? `Km de salida ${Number(kmsOut).toLocaleString("es-MX")}` : null,
  ].filter(Boolean)

  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-700">
          {drivers[0] ? initials(driver) : "—"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-slate-900">
            {driver}
            {extraDrivers.length > 0 && <span className="font-normal text-slate-500"> y {extraDrivers.join(", ")}</span>}
          </p>
          <p className="truncate text-xs text-slate-500">
            {facts.join(" · ")}
            {is315 && <span className="ml-2 rounded-full bg-violet-100 px-1.5 py-px text-[11px] font-medium text-violet-700">31.5</span>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-semibold leading-none tabular-nums text-slate-900">{totalPackages}</p>
          <p className="text-xs text-slate-500">paquetes</p>
        </div>
      </div>

      {routes.length > 1 ? (
        <div className="mt-3">
          <p className="mb-1.5 inline-flex items-center gap-1 text-xs text-slate-500">
            <Layers className="h-3.5 w-3.5" /> {routes.length} rutas juntas
          </p>
          {/* Una ficha por ruta: folio completo, a qué ruta salió y cuántos paquetes llevó. */}
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {routes.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm text-slate-900">{r.folio}</p>
                  <p className="truncate text-xs text-slate-500">{r.routeName || "Sin ruta asignada"}</p>
                </div>
                <p className="shrink-0 text-right text-xs text-slate-500">
                  <span className="block text-base font-semibold tabular-nums text-slate-900">{r.packages}</span>
                  paq.
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : routes[0] ? (
        <p className="mt-2 text-xs text-slate-500">
          Salida <span className="font-mono text-slate-700">{routes[0].folio}</span>
          {routes[0].routeName && <> · Ruta <span className="font-medium text-slate-700">{routes[0].routeName}</span></>}
        </p>
      ) : null}
    </div>
  )
}
