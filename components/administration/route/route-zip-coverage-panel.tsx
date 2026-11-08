"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { Check, MapPin, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TextField, SelectField } from "@/components/ui/field"
import { PmySpinner } from "@/components/ui/pmy-loader"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"
import { apiError } from "@/components/maintenance/shared/confirm-action"
import {
  addRouteZip,
  getRouteZipCoverage,
  RouteZipRow,
  RouteZipStatus,
  setRouteZipStatus,
} from "@/lib/services/route-zip-coverage"

/** Llave SWR compartida con el header de la página (Recalcular revalida esta llave). */
export const routeZipKey = (subsidiaryId: string) => (subsidiaryId ? ["route-zip-coverage", subsidiaryId] : null)

const UNASSIGNED = "__sin_ruta__"
/** Una ruta "comparte" un CP solo si se lleva al menos este porcentaje. */
const SHARED_MIN = 0.05

type StatusFilter = "todos" | RouteZipStatus

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "sugerido", label: "Por revisar" },
  { value: "confirmado", label: "Confirmados" },
  { value: "excluido", label: "Excluidos" },
]

const STATUS_BADGE: Record<RouteZipStatus, { label: string; className: string }> = {
  sugerido: { label: "Sugerido", className: "bg-slate-100 text-slate-700" },
  confirmado: { label: "Confirmado", className: "bg-green-100 text-green-700" },
  excluido: { label: "Excluido", className: "bg-red-100 text-red-700" },
}

const pct = (n: number) => `${Math.round(n * 100)}%`
const titleCase = (s: string | null) =>
  (s ?? "").toLocaleLowerCase("es-MX").replace(/(^|\s)(\p{L})/gu, (_, sp: string, ch: string) => sp + ch.toLocaleUpperCase("es-MX"))

interface Props {
  subsidiaryId: string
  isAdmin: boolean
  addOpen: boolean
  onAddOpenChange: (open: boolean) => void
}

export function RouteZipCoveragePanel({ subsidiaryId, isAdmin, addOpen, onAddOpenChange }: Props) {
  const { data, isLoading, error, mutate } = useSWR(routeZipKey(subsidiaryId), () => getRouteZipCoverage(subsidiaryId))
  const [selected, setSelected] = useState<string>("")
  const [filter, setFilter] = useState<StatusFilter>("todos")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [prefillZip, setPrefillZip] = useState("")

  // Al cambiar de sucursal (o al cargar), elegir la primera ruta.
  useEffect(() => {
    if (!data) return
    if (selected === UNASSIGNED || data.routes.some((r) => r.id === selected)) return
    setSelected(data.routes[0]?.id ?? "")
  }, [data, selected])

  const route = data?.routes.find((r) => r.id === selected)
  const rows = useMemo(
    () =>
      (data?.rows ?? [])
        .filter((r) => r.routeId === selected && (filter === "todos" || r.status === filter))
        .sort((a, b) => b.share - a.share || b.shipmentCount - a.shipmentCount),
    [data, selected, filter],
  )
  const hasAnyRow = (data?.rows.length ?? 0) > 0

  const changeStatus = async (row: RouteZipRow, status: RouteZipStatus) => {
    setBusyId(row.id)
    try {
      await setRouteZipStatus(row.id, status)
      await mutate()
    } catch (e) {
      toast.error(apiError(e, "No se pudo cambiar el estado"))
    } finally {
      setBusyId(null)
    }
  }

  const openAssign = (zip: string) => {
    setPrefillZip(zip)
    onAddOpenChange(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <PmySpinner className="h-4 w-4" /> Cargando CPs de las rutas…
      </div>
    )
  }
  if (error) return <p className="py-8 text-sm text-red-600">{apiError(error, "No se pudieron cargar los CPs de las rutas.")}</p>
  if (!data) return null

  return (
    <>
      {!hasAnyRow && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Esta sucursal todavía no tiene CPs por ruta. Usa <strong>Recalcular con historial</strong> para armarlos con las salidas de los últimos 6
          meses. Si las guías llegan sin código postal (por ejemplo “N/A”), no se podrán calcular y hay que agregarlos a mano.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Rutas */}
        <nav aria-label="Rutas" className="h-fit overflow-hidden rounded-lg border bg-background">
          <div className="border-b px-3 py-2 text-sm font-semibold">Rutas ({data.routes.length})</div>
          {data.routes.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r.id)}
              className={cn(
                "flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50",
                selected === r.id && "border-l-2 border-l-primary bg-muted font-medium",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
              {r.pending > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-[10.5px] font-semibold text-amber-700">{r.pending}</span>}
              <span className="shrink-0 text-xs text-muted-foreground">{r.zips} CPs</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelected(UNASSIGNED)}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-violet-700 hover:bg-violet-50",
              selected === UNASSIGNED && "border-l-2 border-l-violet-600 bg-violet-50 font-medium",
            )}
          >
            <span className="flex-1">CPs sin ruta</span>
            <span className="rounded-full bg-violet-100 px-1.5 text-[10.5px] font-semibold">{data.unassigned.length}</span>
          </button>
        </nav>

        {/* Detalle */}
        <section className="min-w-0 overflow-hidden rounded-lg border bg-background">
          {selected === UNASSIGNED ? (
            <>
              <div className="border-b px-3 py-2">
                <div className="text-sm font-semibold text-violet-700">CPs sin ruta</div>
                <div className="text-xs text-muted-foreground">CPs donde la sucursal entrega paquetes pero ninguna ruta los tiene. Asígnalos para que aparezcan en las sugerencias.</div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 px-3">CP</TableHead>
                      <TableHead className="h-8 px-3">Ciudad</TableHead>
                      <TableHead className="h-8 px-3 text-right">Guías</TableHead>
                      <TableHead className="h-8 px-3 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.unassigned.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">Todos los CPs de la sucursal tienen ruta.</TableCell>
                      </TableRow>
                    ) : (
                      data.unassigned.map((z) => (
                        <TableRow key={z.zip}>
                          <TableCell className="px-3 py-1.5 font-semibold tabular-nums">{z.zip}</TableCell>
                          <TableCell className="px-3 py-1.5">{titleCase(z.city) || "—"}</TableCell>
                          <TableCell className="px-3 py-1.5 text-right tabular-nums">{z.shipmentCount.toLocaleString("es-MX")}</TableCell>
                          <TableCell className="px-3 py-1.5 text-right">
                            {isAdmin && (
                              <Button size="sm" variant="outline" className="h-7" onClick={() => openAssign(z.zip)}>
                                Asignar a una ruta
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
                <span className="text-sm font-semibold">{route?.name ?? "Elige una ruta"}</span>
                {route && <span className="text-xs text-muted-foreground">· {route.shipments.toLocaleString("es-MX")} guías en 6 meses</span>}
                <div className="ml-auto inline-flex rounded-lg border bg-background p-0.5">
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFilter(f.value)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        filter === f.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 px-3">CP</TableHead>
                      <TableHead className="h-8 min-w-[220px] px-3">Ciudad</TableHead>
                      <TableHead className="h-8 px-3 text-right">Guías</TableHead>
                      <TableHead className="h-8 min-w-[200px] px-3">De este CP, cuánto va a esta ruta</TableHead>
                      <TableHead className="h-8 px-3">Origen</TableHead>
                      <TableHead className="h-8 px-3">Estado</TableHead>
                      <TableHead className="h-8 px-3 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                          {filter === "todos" ? "Esta ruta no tiene CPs todavía." : "No hay CPs con este estado."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((r) => {
                        // Solo rutas que de verdad comparten el CP (≥5%); el resto es ruido de salidas con muchas rutas.
                        const relevant = r.sharedWith.filter((s) => s.share >= SHARED_MIN).sort((a, b) => b.share - a.share)
                        const shared = relevant.length > 0
                        const minor = r.sharedWith.length - relevant.length
                        const excluded = r.status === "excluido"
                        return (
                          <TableRow key={r.id} className={cn(shared && !excluded && "bg-violet-50/50", excluded && "text-muted-foreground")}>
                            <TableCell className="px-3 py-1.5 font-semibold tabular-nums">{r.zip}</TableCell>
                            <TableCell className="px-3 py-1.5">
                              <div>{titleCase(r.city) || "—"}</div>
                              {shared && (
                                <div className="text-xs text-violet-700">
                                  Compartido con {relevant.slice(0, 3).map((s) => `${s.routeName} ${pct(s.share)}`).join(", ")}
                                  {relevant.length > 3 && ` y ${relevant.length - 3} más`}
                                </div>
                              )}
                              {minor > 0 && (
                                <div className="text-[11px] text-muted-foreground">
                                  {shared ? "+" : ""}{minor} ruta{minor === 1 ? "" : "s"} con menos de 5%
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="px-3 py-1.5 text-right tabular-nums">{r.shipmentCount.toLocaleString("es-MX")}</TableCell>
                            <TableCell className="px-3 py-1.5">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 rounded-full bg-muted">
                                  <div
                                    className={cn("h-1.5 rounded-full", excluded ? "bg-slate-400" : shared ? "bg-violet-600" : "bg-primary")}
                                    style={{ width: pct(r.share) }}
                                  />
                                </div>
                                <span className="w-10 text-right text-xs tabular-nums">{pct(r.share)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-1.5 text-muted-foreground">{r.source === "manual" ? "Manual" : "Historial"}</TableCell>
                            <TableCell className="px-3 py-1.5">
                              <Badge variant="secondary" className={cn("font-semibold", STATUS_BADGE[r.status].className)}>
                                {STATUS_BADGE[r.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-3 py-1.5 text-right">
                              {isAdmin && (
                                <div className="inline-flex gap-1">
                                  {busyId === r.id ? (
                                    <PmySpinner className="h-4 w-4" />
                                  ) : excluded ? (
                                    <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => changeStatus(r, "sugerido")}>
                                      <RotateCcw className="h-3.5 w-3.5" /> Reactivar
                                    </Button>
                                  ) : (
                                    <>
                                      {r.status === "sugerido" && (
                                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-green-700" onClick={() => changeStatus(r, "confirmado")}>
                                          <Check className="h-3.5 w-3.5" /> Confirmar
                                        </Button>
                                      )}
                                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-muted-foreground" onClick={() => changeStatus(r, "excluido")}>
                                        <X className="h-3.5 w-3.5" /> Excluir
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span>Confirmado y Excluido no se pierden al recalcular.</span>
                <span>Un CP puede estar en varias rutas; la sugerencia lo muestra en todas con su %.</span>
                <span>Se recalcula solo cada mañana.</span>
              </div>
            </>
          )}
        </section>
      </div>

      <AddZipDialog
        open={addOpen}
        onOpenChange={(o) => {
          onAddOpenChange(o)
          if (!o) setPrefillZip("")
        }}
        routes={data.routes}
        defaultRouteId={selected !== UNASSIGNED ? selected : ""}
        defaultZip={prefillZip}
        onSaved={async (routeId) => {
          await mutate()
          setSelected(routeId)
        }}
      />
    </>
  )
}

function AddZipDialog({
  open,
  onOpenChange,
  routes,
  defaultRouteId,
  defaultZip,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  routes: { id: string; name: string }[]
  defaultRouteId: string
  defaultZip: string
  onSaved: (routeId: string) => Promise<void>
}) {
  const [zip, setZip] = useState("")
  const [routeId, setRouteId] = useState("")
  const [city, setCity] = useState("")
  const [errors, setErrors] = useState<{ zip?: string; routeId?: string }>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setZip(defaultZip)
    setRouteId(defaultRouteId)
    setCity("")
    setErrors({})
  }, [open, defaultZip, defaultRouteId])

  const save = async () => {
    const next: typeof errors = {}
    if (!/^\d{5}$/.test(zip.trim())) next.zip = "Escribe un código postal de 5 dígitos"
    if (!routeId) next.routeId = "Elige la ruta"
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    try {
      await addRouteZip({ zip: zip.trim(), routeId, city: city.trim() || undefined })
      toast.success("CP agregado a la ruta")
      await onSaved(routeId)
      onOpenChange(false)
    } catch (e) {
      toast.error(apiError(e, "No se pudo agregar el CP"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar CP a una ruta</DialogTitle>
          <DialogDescription>Queda confirmado y se usa en las sugerencias de salida.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <TextField
            label="Código postal"
            required
            icon={MapPin}
            inputMode="numeric"
            maxLength={5}
            value={zip}
            onChange={(e) => {
              setZip(e.target.value.replace(/\D/g, ""))
              setErrors((p) => ({ ...p, zip: undefined }))
            }}
            error={errors.zip}
          />
          <SelectField
            label="Ruta"
            required
            value={routeId}
            onValueChange={(v) => {
              setRouteId(v)
              setErrors((p) => ({ ...p, routeId: undefined }))
            }}
            options={routes.map((r) => ({ value: r.id, label: r.name }))}
            placeholder="Elige la ruta"
            error={errors.routeId}
          />
          <TextField label="Colonia o ciudad (opcional)" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving && <PmySpinner className="h-4 w-4" />} Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
