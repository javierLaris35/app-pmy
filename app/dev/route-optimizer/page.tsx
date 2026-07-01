"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { AppLayout } from "@/components/app-layout"
import { OperationHeader } from "@/components/shared/operation-header"
import { Route as RouteIcon, MapPin, Fuel, Clock, Navigation, ScanLine, AlertTriangle, Loader2, FlaskConical, RotateCcw, Package, Truck, Gauge, ChevronRight, X, Trash2, Crosshair, Move, Locate } from "lucide-react"
import { withAuth } from "@/hoc/withAuth"
import { useAuthStore } from "@/store/auth.store"
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/lib/toast"
import { toDateInputValue, todayInputValue, addDaysInputValue } from "@/utils/date.utils"
import { osrmTrip, osrmRoute, litersFor, type LatLng } from "@/lib/routing/osrm"
import { RouteMap, type MapStop, type MapRoute } from "@/components/dev/route-optimizer/route-map"
import { validateTrackingNumber } from "@/lib/services/package-dispatchs"
import { geocodeAddress, saveManualGeocode } from "@/lib/services/geocode"
import { normalizeScannedCode, isValidScannedCode } from "@/lib/tracking/normalize-scan"
import { initScannerFeedback, playExpiresTodaySound, playExpiresTomorrowSound, playNotFoundSound, playInvalidSound } from "@/lib/scanner-feedback"
import type { PackageInfo } from "@/lib/types"
import { useRouteOptimizerStore, type Stop, type VariantId } from "@/store/route-optimizer.store"

const IS_DEV = process.env.NODE_ENV === "development"

interface Variant {
  id: VariantId
  label: string
  color: string
  distanceKm: number
  durationMin: number
  orderedStopIds: string[]
  coordinates: [number, number][]
}

const norm = (s?: string) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim()
const stopKeyOf = (name?: string, address?: string, zip?: string) => `${norm(name)}|${norm(address)}|${norm(zip)}`
const isTodayDate = (iso?: string) => { try { return !!iso && toDateInputValue(new Date(iso)) === todayInputValue() } catch { return false } }
const isTomorrowDate = (iso?: string) => { try { return !!iso && toDateInputValue(new Date(iso)) === addDaysInputValue(1) } catch { return false } }

function RouteOptimizerContent() {
  const user = useAuthStore((s) => s.user)
  const { subsidiaries } = useSubsidiaries()

  // Estado PERSISTENTE (Zustand + localStorage) — no se pierde al recargar.
  const subsidiaryId = useRouteOptimizerStore((s) => s.subsidiaryId)
  const stops = useRouteOptimizerStore((s) => s.stops)
  const selectedId = useRouteOptimizerStore((s) => s.selectedId)
  const lPer100 = useRouteOptimizerStore((s) => s.lPer100)
  const pricePerL = useRouteOptimizerStore((s) => s.pricePerL)
  const manualLat = useRouteOptimizerStore((s) => s.manualLat)
  const manualLng = useRouteOptimizerStore((s) => s.manualLng)
  const setSubsidiaryId = useRouteOptimizerStore((s) => s.setSubsidiaryId)
  const setSelectedId = useRouteOptimizerStore((s) => s.setSelectedId)
  const setLPer100 = useRouteOptimizerStore((s) => s.setLPer100)
  const setPricePerL = useRouteOptimizerStore((s) => s.setPricePerL)
  const setManual = useRouteOptimizerStore((s) => s.setManual)

  // Estado TRANSITORIO (no se persiste).
  const [scanValue, setScanValue] = useState("")
  const [validating, setValidating] = useState(false)
  const scanInputRef = useRef<HTMLInputElement>(null)
  const [variants, setVariants] = useState<Variant[]>([])
  const [computing, setComputing] = useState(false)
  const [detailStopId, setDetailStopId] = useState<string | null>(null)
  const [placingStopId, setPlacingStopId] = useState<string | null>(null)
  const recomputeTimer = useRef<any>(null)
  const geoBusy = useRef(false)
  const [geoTick, setGeoTick] = useState(0)

  useEffect(() => { initScannerFeedback() }, [])

  // Default de sucursal = la del usuario (solo si el store está vacío).
  useEffect(() => {
    if (!subsidiaryId && user?.subsidiaryId) setSubsidiaryId(user.subsidiaryId)
  }, [user, subsidiaryId, setSubsidiaryId])

  const subsidiary = useMemo(() => subsidiaries.find((s) => s.id === subsidiaryId), [subsidiaries, subsidiaryId])
  const origin = useMemo(() => {
    if (subsidiary?.latitude != null && subsidiary?.longitude != null) {
      return { lat: Number(subsidiary.latitude), lng: Number(subsidiary.longitude), label: subsidiary.name }
    }
    const la = parseFloat(manualLat), ln = parseFloat(manualLng)
    if (!Number.isNaN(la) && !Number.isNaN(ln)) return { lat: la, lng: ln, label: "Origen manual" }
    return null
  }, [subsidiary, manualLat, manualLng])

  // ---- Geocodificar una parada vía backend (cachea en BD) y parchea el store ----
  const geocodeStop = async (stop: Stop) => {
    let geo: { lat: number; lng: number; source: string } | null = null
    try {
      const data = await geocodeAddress({ address: stop.address, city: stop.city, zip: stop.zip })
      if (Array.isArray(data) && data.length > 0) {
        geo = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), source: data[0].source }
      }
    } catch { /* notfound */ }
    useRouteOptimizerStore.getState().patchStopGeo(stop.id, geo)
  }

  // Geocodifica las paradas 'pending' UNA A LA VEZ (serial → evita el 429 de Nominatim).
  useEffect(() => {
    if (geoBusy.current) return
    const next = stops.find((s) => s.geoStatus === "pending")
    if (!next) return
    geoBusy.current = true
    geocodeStop(next).finally(() => { geoBusy.current = false; setGeoTick((t) => t + 1) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, geoTick])

  // ---- Escaneo: valida, deduplica en paradas (remesa), suena y geocodifica ----
  const handleScan = async () => {
    const raw = scanValue.trim()
    if (!raw) return
    setScanValue("")
    if (!subsidiaryId) { toast.error("Selecciona primero la sucursal."); return }

    const n = normalizeScannedCode(raw)
    if (!isValidScannedCode(n)) { playInvalidSound(); toast.error(`Código inválido: ${raw}`); return }
    const code = n.code

    if (useRouteOptimizerStore.getState().isScanned(code)) { toast.info("Ese paquete ya fue escaneado."); return }

    setValidating(true)
    let info: PackageInfo
    try {
      info = await validateTrackingNumber(code, subsidiaryId)
    } catch {
      playNotFoundSound(); toast.error("Error validando el paquete."); setValidating(false); return
    } finally {
      setValidating(false)
      scanInputRef.current?.focus()
    }

    if (!info?.isValid) { playNotFoundSound(); toast.error(info?.reason || "Paquete no válido."); return }

    const store = useRouteOptimizerStore.getState()
    const pkgKey = (info as any).dhlUniqueId || info.trackingNumber || code
    if (store.isScanned(pkgKey)) { toast.info("Ese paquete ya fue escaneado."); return }
    store.markScanned(pkgKey, code)

    const prio = isTodayDate(info.commitDateTime) || String(info.priority) === "alta"
    if (isTodayDate(info.commitDateTime)) playExpiresTodaySound()
    else if (isTomorrowDate(info.commitDateTime)) playExpiresTomorrowSound()

    const id = stopKeyOf(info.recipientName, info.recipientAddress, info.recipientZip)
    const pkg = { trackingNumber: info.trackingNumber || code, key: pkgKey, commitDateTime: info.commitDateTime, priority: prio }

    const existing = store.stops.find((s) => s.id === id)
    if (existing) {
      store.mergePackage(id, pkg)
      toast.success(`Paquete agregado a parada existente (${existing.packages.length + 1} en remesa).`)
    } else {
      store.addStop({
        id,
        recipientName: info.recipientName || "—",
        address: info.recipientAddress || "",
        city: info.recipientCity || "",
        zip: info.recipientZip || "",
        packages: [pkg],
        priority: prio,
        geoStatus: "pending",
      })
      toast.success(`Nueva parada: ${info.recipientName || "—"}${prio ? " · PRIORITARIO" : ""}`)
    }
  }

  // Demo sin escáner: inyecta paradas de ejemplo (Hermosillo).
  const addDemoStops = () => {
    const demo = [
      { name: "Cliente Centro", address: "Blvd. Luis Encinas 100", zip: "83000", today: true },
      { name: "Cliente Pitic", address: "Av. Rosales 250", zip: "83150", today: false },
      { name: "Cliente Norte", address: "Blvd. Morelos 800", zip: "83177", today: true },
      { name: "Cliente Sur", address: "Calz. de los Ángeles 45", zip: "83100", today: false },
      { name: "Cliente Olivares", address: "Av. de los Olivares 320", zip: "83240", today: false },
      { name: "Cliente Quinta", address: "Blvd. Solidaridad 500", zip: "83280", today: true },
    ]
    if (!origin && !manualLat) setManual("29.0729", "-110.9559")
    const store = useRouteOptimizerStore.getState()
    const existingIds = new Set(store.stops.map((s) => s.id))
    demo.forEach((d, i) => {
      const id = stopKeyOf(d.name, d.address, d.zip)
      if (existingIds.has(id)) return
      existingIds.add(id)
      store.addStop({
        id, recipientName: d.name, address: d.address, city: "Hermosillo", zip: d.zip,
        packages: [{ trackingNumber: `DEMO-${i + 1}`, key: `DEMO-${i + 1}`, commitDateTime: d.today ? new Date().toISOString() : undefined, priority: d.today }],
        priority: d.today, geoStatus: "pending",
      })
    })
    toast.success("Paradas demo agregadas.")
  }

  const handleReset = () => {
    useRouteOptimizerStore.getState().reset()
    setVariants([]); setDetailStopId(null)
    scanInputRef.current?.focus()
  }

  // Re-geocodifica todas las paradas (sin perderlas) con la cascada actual (Photon).
  const handleRegeocode = () => {
    if (useRouteOptimizerStore.getState().stops.length === 0) return
    useRouteOptimizerStore.getState().regeocodeAll()
    setVariants([])
    toast.info("Re-geocodificando todas las paradas…")
  }

  const handleRemoveStop = (id: string) => {
    useRouteOptimizerStore.getState().removeStop(id)
    setDetailStopId(null)
    toast.success("Parada eliminada.")
  }

  const handleRemovePackage = (stopId: string, key: string) => {
    const stop = useRouteOptimizerStore.getState().stops.find((s) => s.id === stopId)
    useRouteOptimizerStore.getState().removePackage(stopId, key)
    if ((stop?.packages.length ?? 0) <= 1) setDetailStopId(null)
  }

  const fmtCommit = (iso?: string) => {
    if (!iso) return "Sin fecha compromiso"
    try { return new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) } catch { return iso }
  }

  // Persiste la corrección manual en BD (aprende para la próxima vez).
  const persistManual = (stop: Stop | undefined, lat: number, lng: number) => {
    if (!stop) return
    saveManualGeocode({ address: stop.address, city: stop.city, zip: stop.zip, lat, lng }).catch(() => undefined)
  }

  // Ajuste fino: arrastrar un marcador ya ubicado.
  const handleStopMove = (id: string, lat: number, lng: number) => {
    const store = useRouteOptimizerStore.getState()
    const stop = store.stops.find((s) => s.id === id)
    store.patchStopGeo(id, { lat, lng, source: "manual" })
    persistManual(stop, lat, lng)
    toast.success("Ubicación ajustada y guardada.")
  }

  // Colocar manualmente: el usuario hace clic en el mapa para ubicar la parada.
  const startPlacing = (id: string) => {
    setPlacingStopId(id)
    setDetailStopId(null)
    toast.info("Haz clic en el mapa para ubicar la parada.")
  }
  const handleMapClick = (lat: number, lng: number) => {
    if (!placingStopId) return
    const store = useRouteOptimizerStore.getState()
    const stop = store.stops.find((s) => s.id === placingStopId)
    store.patchStopGeo(placingStopId, { lat, lng, source: "manual" })
    persistManual(stop, lat, lng)
    setPlacingStopId(null)
    toast.success("Parada ubicada y guardada.")
  }

  // ---- Recalcular las 3 rutas (debounced) cuando cambian las paradas geocodificadas ----
  useEffect(() => {
    if (recomputeTimer.current) clearTimeout(recomputeTimer.current)
    const okStops = stops.filter((s) => s.geoStatus === "ok" && s.lat != null && s.lng != null)
    if (!origin || okStops.length < 1) { setVariants([]); return }

    recomputeTimer.current = setTimeout(async () => {
      setComputing(true)
      try {
        const originLL: LatLng = { lat: origin.lat, lng: origin.lng }
        const toLL = (s: Stop): LatLng => ({ lat: s.lat!, lng: s.lng! })
        const all = [originLL, ...okStops.map(toLL)]

        const scan = await osrmRoute(all)
        const optimal = await osrmTrip(all)
        const optimalIds = optimal.order.filter((i) => i !== 0).map((i) => okStops[i - 1].id)

        const prio = okStops.filter((s) => s.priority)
        const rest = okStops.filter((s) => !s.priority)
        let priorityVariant: Variant
        if (prio.length === 0 || rest.length === 0) {
          priorityVariant = { id: "priority", label: "Prioritarios primero", color: "#f97316", distanceKm: optimal.distanceKm, durationMin: optimal.durationMin, orderedStopIds: optimalIds, coordinates: optimal.coordinates }
        } else {
          const aPts = [originLL, ...prio.map(toLL)]
          const tripA = await osrmTrip(aPts)
          const prioIds = tripA.order.filter((i) => i !== 0).map((i) => prio[i - 1].id)
          const lastPrioLL = aPts[tripA.order[tripA.order.length - 1]]
          const bPts = [lastPrioLL, ...rest.map(toLL)]
          const tripB = await osrmTrip(bPts)
          const restIds = tripB.order.filter((i) => i !== 0).map((i) => rest[i - 1].id)
          priorityVariant = {
            id: "priority", label: "Prioritarios primero", color: "#f97316",
            distanceKm: tripA.distanceKm + tripB.distanceKm,
            durationMin: tripA.durationMin + tripB.durationMin,
            orderedStopIds: [...prioIds, ...restIds],
            coordinates: [...tripA.coordinates, ...tripB.coordinates],
          }
        }

        setVariants([
          { id: "scan", label: "Orden de escaneo", color: "#2563eb", distanceKm: scan.distanceKm, durationMin: scan.durationMin, orderedStopIds: okStops.map((s) => s.id), coordinates: scan.coordinates },
          { id: "optimal", label: "Óptima global", color: "#16a34a", distanceKm: optimal.distanceKm, durationMin: optimal.durationMin, orderedStopIds: optimalIds, coordinates: optimal.coordinates },
          priorityVariant,
        ])
      } catch (err: any) {
        console.warn("Error recalculando rutas:", err?.message)
      } finally {
        setComputing(false)
      }
    }, 700)

    return () => { if (recomputeTimer.current) clearTimeout(recomputeTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, origin?.lat, origin?.lng])

  const selected = variants.find((v) => v.id === selectedId) ?? null
  const seqById = useMemo(() => {
    const m = new Map<string, number>()
    selected?.orderedStopIds.forEach((id, i) => m.set(id, i + 1))
    return m
  }, [selected])

  const sortedStops = [...stops].sort((a, b) => (seqById.get(a.id) ?? 999) - (seqById.get(b.id) ?? 999))
  const mapStops: MapStop[] = sortedStops
    .filter((s) => s.geoStatus === "ok" && s.lat != null && s.lng != null)
    .map((s, i) => ({
      id: s.id,
      lat: s.lat!, lng: s.lng!,
      label: `${s.recipientName} (${s.packages.length} pq)`,
      sublabel: `${s.address}${s.zip ? `, CP ${s.zip}` : ""}`,
      priority: s.priority,
      seq: seqById.get(s.id) ?? i + 1,
      lowConfidence: s.source === "postalcode" || s.source === "city",
    }))
  const mapRoutes: MapRoute[] = variants.map((v) => ({ id: v.id, color: v.color, coordinates: v.coordinates }))

  const totalPackages = stops.reduce((n, s) => n + s.packages.length, 0)
  const okStops = stops.filter((s) => s.geoStatus === "ok").length
  const priorityStops = stops.filter((s) => s.priority).length
  const pendingCount = stops.filter((s) => s.geoStatus === "pending").length
  const notfoundCount = stops.filter((s) => s.geoStatus === "notfound").length
  const placingStop = stops.find((s) => s.id === placingStopId) ?? null
  const lastStopId = selected?.orderedStopIds[selected.orderedStopIds.length - 1]
  const lastStopName = stops.find((s) => s.id === lastStopId)?.recipientName ?? "—"
  const selLiters = selected ? litersFor(selected.distanceKm, lPer100) : 0
  const selCost = selLiters * pricePerL
  const detailStop = stops.find((s) => s.id === detailStopId) ?? null

  const BADGE_SM = "h-5 shrink-0 rounded-full px-1.5 text-[10px] font-medium"
  const geoBadge = (s: Stop) => {
    if (s.geoStatus === "ok") {
      const green = s.source === "address" || s.source === "manual"
      const text = s.source === "manual" ? "manual" : s.source === "address" ? "exacta" : s.source === "postalcode" ? "por CP" : s.source === "city" ? "ciudad" : "aprox"
      return <Badge variant="outline" className={`${BADGE_SM} ${green ? "border-green-300 text-green-700" : "border-amber-300 text-amber-700"}`}>{text}</Badge>
    }
    if (s.geoStatus === "notfound") return <Badge variant="outline" className={`${BADGE_SM} border-red-300 text-red-700`}>sin ubicar</Badge>
    return <Badge variant="outline" className={`${BADGE_SM} gap-1 text-muted-foreground`}><Loader2 className="h-3 w-3 animate-spin" />ubicando</Badge>
  }

  const metricTile = (icon: ReactNode, value: string, label: string) => (
    <div className="rounded-lg border bg-background p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">{icon}<span className="text-[11px] uppercase tracking-wide">{label}</span></div>
      <div className="mt-0.5 text-lg font-bold tabular-nums">{value}</div>
    </div>
  )

  if (!IS_DEV) {
    return (
      <AppLayout>
        <OperationHeader icon={FlaskConical} title="Optimizador de Rutas" description="Herramienta experimental" />
        <div className="mt-6 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Esta pantalla solo está disponible en el entorno de desarrollo.
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-3">
        <OperationHeader
          icon={RouteIcon}
          title="Salida a Ruta Optimizada (Dev)"
          description="Escanea paquetes y traza la mejor ruta"
          titleAccessory={<Badge variant="outline" className="border-purple-300 bg-purple-50 text-purple-700">experimental</Badge>}
          actions={
            <div className="hidden items-center gap-2 lg:flex">
              <div className="w-44"><SucursalSelector value={subsidiaryId} onValueChange={(v) => setSubsidiaryId(v as string)} /></div>
              <Button variant="outline" size="sm" onClick={addDemoStops}>Demo</Button>
              <Button variant="outline" size="sm" onClick={handleRegeocode}><Locate className="mr-1.5 h-4 w-4" />Re-ubicar</Button>
              <Button variant="ghost" size="sm" onClick={handleReset}><RotateCcw className="mr-1.5 h-4 w-4" />Reiniciar</Button>
            </div>
          }
        />

        {/* ---- Escáner ---- */}
        <Card className="rounded-xl border-border/60 shadow-sm">
          <CardContent className="space-y-3 p-3 sm:p-4">
            {/* Toolbar móvil (en desktop estos controles van en el header) */}
            <div className="flex flex-col gap-2 lg:hidden">
              <SucursalSelector value={subsidiaryId} onValueChange={(v) => setSubsidiaryId(v as string)} />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 rounded-lg" onClick={addDemoStops}>Demo</Button>
                <Button variant="outline" size="sm" className="flex-1 rounded-lg" onClick={handleRegeocode}><Locate className="mr-1.5 h-4 w-4" />Re-ubicar</Button>
                <Button variant="ghost" size="sm" className="flex-1 rounded-lg" onClick={handleReset}><RotateCcw className="mr-1.5 h-4 w-4" />Reiniciar</Button>
              </div>
            </div>

            <div className="relative">
              <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={scanInputRef}
                autoFocus
                className="h-11 rounded-xl pl-9 text-base"
                placeholder={subsidiaryId ? "Escanea o teclea la guía y Enter…" : "Selecciona la sucursal…"}
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); handleScan() } }}
                disabled={!subsidiaryId}
              />
              {validating && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />}
            </div>

            {!origin && stops.length > 0 && (
              <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center">
                <span className="flex items-center gap-1.5 text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> Sucursal sin coordenadas. Origen manual:
                </span>
                <div className="flex gap-2">
                  <Input className="h-8 w-full sm:w-28" placeholder="Latitud" value={manualLat} onChange={(e) => setManual(e.target.value, manualLng)} />
                  <Input className="h-8 w-full sm:w-28" placeholder="Longitud" value={manualLng} onChange={(e) => setManual(manualLat, e.target.value)} />
                </div>
              </div>
            )}

            {stops.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <Badge variant="secondary" className="gap-1 rounded-full"><Package className="h-3.5 w-3.5" />{totalPackages} paquetes</Badge>
                <Badge variant="secondary" className="gap-1 rounded-full"><MapPin className="h-3.5 w-3.5" />{stops.length} paradas · {okStops} ubicadas</Badge>
                <Badge className="gap-1 rounded-full bg-red-500 hover:bg-red-500"><AlertTriangle className="h-3.5 w-3.5" />{priorityStops} prioritarias</Badge>
                {computing && <Badge variant="outline" className="gap-1 rounded-full"><Loader2 className="h-3 w-3 animate-spin" />recalculando</Badge>}
              </div>
            )}
            {pendingCount > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground"><span>Geocodificando…</span><span>{okStops}/{stops.length}</span></div>
                <Progress value={stops.length ? (okStops / stops.length) * 100 : 0} className="h-1.5" />
              </div>
            )}
            {notfoundCount > 0 && (
              <Alert variant="destructive" className="rounded-xl py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {notfoundCount} parada(s) sin ubicar. Ábrelas en la lista y usa <b>“Ubicar en el mapa”</b> para colocarlas a mano.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* ---- Panel (lista) + Mapa ---- */}
        <div className="grid gap-3 lg:grid-cols-[380px_1fr]">
          {/* IZQUIERDA */}
          <div className="space-y-3">
            {variants.length > 0 ? (
              <Card className="rounded-xl border-border/60 shadow-sm">
                <CardHeader className="border-b bg-muted/30 px-4 py-3"><CardTitle className="text-sm">Ruta</CardTitle></CardHeader>
                <CardContent className="space-y-3 p-4">
                  {/* Selector: 3 cuadros del MISMO tamaño, texto completo (sin truncar) */}
                  <ToggleGroup
                    type="single"
                    value={selectedId}
                    onValueChange={(v) => v && setSelectedId(v as VariantId)}
                    className="grid grid-cols-3 gap-2"
                  >
                    {variants.map((v) => {
                      const isSel = v.id === selectedId
                      return (
                        <ToggleGroupItem
                          key={v.id}
                          value={v.id}
                          aria-label={v.label}
                          className="flex h-[66px] flex-col items-center justify-center gap-1 rounded-xl border p-1.5 text-center transition-colors data-[state=on]:bg-muted"
                          style={isSel ? { borderColor: v.color, boxShadow: `inset 0 0 0 1px ${v.color}` } : undefined}
                        >
                          <span className="flex items-center justify-center gap-1 text-[11px] font-medium leading-tight">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: v.color }} />
                            <span className="whitespace-normal">{v.label}</span>
                          </span>
                          <span className="text-sm font-bold tabular-nums">{v.distanceKm.toFixed(1)} km</span>
                        </ToggleGroupItem>
                      )
                    })}
                  </ToggleGroup>

                  {/* Origen → última parada */}
                  <div className="flex items-center gap-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase text-muted-foreground">Origen</p>
                      <p className="truncate font-semibold">{origin?.label ?? "—"}</p>
                    </div>
                    <div className="flex flex-1 items-center gap-1 text-muted-foreground">
                      <span className="h-px flex-1 border-t border-dashed" />
                      <Truck className="h-4 w-4 shrink-0 text-primary" />
                      <span className="h-px flex-1 border-t border-dashed" />
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <p className="text-[11px] uppercase text-muted-foreground">Última parada</p>
                      <p className="truncate font-semibold">{lastStopName}</p>
                    </div>
                  </div>

                  {/* Sección unificada: combustible (arriba) + costos/distancia/tiempo */}
                  <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Gauge className="h-3.5 w-3.5" /> Combustible y costos
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1">
                        <Label className="text-[11px] text-muted-foreground">Consumo (L/100km)</Label>
                        <Input type="number" step="0.1" className="h-8" value={lPer100} onChange={(e) => setLPer100(+e.target.value)} />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-[11px] text-muted-foreground">Precio/L (MXN)</Label>
                        <Input type="number" step="0.1" className="h-8" value={pricePerL} onChange={(e) => setPricePerL(+e.target.value)} />
                      </div>
                    </div>
                    {selected && (
                      <div className="grid grid-cols-2 gap-2">
                        {metricTile(<Navigation className="h-3.5 w-3.5" />, `${selected.distanceKm.toFixed(1)} km`, "Distancia")}
                        {metricTile(<Clock className="h-3.5 w-3.5" />, `${Math.round(selected.durationMin)} min`, "Tiempo")}
                        {metricTile(<Fuel className="h-3.5 w-3.5" />, `${selLiters.toFixed(1)} L`, "Combustible")}
                        {metricTile(<span className="text-xs font-bold">$</span>, `$${selCost.toFixed(0)}`, "Costo est.")}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : stops.length > 0 ? (
              <Card className="rounded-xl border-border/60 shadow-sm">
                <CardContent className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {pendingCount > 0 ? "Geocodificando paradas…" : "Calculando rutas…"}
                </CardContent>
              </Card>
            ) : null}

            {/* Timeline de paradas */}
            {stops.length > 0 && (
              <Card className="rounded-xl border-border/60 shadow-sm">
                <CardHeader className="flex-row items-center justify-between space-y-0 border-b bg-muted/30 px-4 py-3">
                  <CardTitle className="text-sm">Paradas {selected ? `· ${selected.label}` : ""}</CardTitle>
                  <Badge variant="secondary" className="rounded-full">{stops.length}</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[440px]">
                    <ol className="px-3 pb-2">
                      {sortedStops.map((s, idx) => (
                        <li key={s.id} className="flex gap-3">
                          <div className="flex flex-col items-center pt-3">
                            <span
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                              style={{ background: s.priority ? "#ef4444" : "#0f172a" }}
                            >
                              {seqById.get(s.id) ?? idx + 1}
                            </span>
                            {idx < sortedStops.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
                          </div>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setDetailStopId(s.id)}
                            className="group flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-medium">{s.recipientName}</span>
                                {s.priority && <Badge className={`${BADGE_SM} bg-red-500 text-white`}>Vence hoy</Badge>}
                              </div>
                              <p className="truncate text-xs text-muted-foreground">
                                {s.address || "—"}{s.zip ? ` · CP ${s.zip}` : ""}
                              </p>
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <Badge variant="secondary" className={`${BADGE_SM} gap-1`}><Package className="h-3 w-3" />{s.packages.length}</Badge>
                                {geoBadge(s)}
                              </div>
                            </div>
                            {s.geoStatus === "notfound" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 shrink-0 gap-1 px-2 text-xs"
                                onClick={(e) => { e.stopPropagation(); startPlacing(s.id) }}
                              >
                                <Crosshair className="h-3.5 w-3.5" />Ubicar
                              </Button>
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* DERECHA: Mapa */}
          {stops.length > 0 ? (
            <Card className="overflow-hidden rounded-xl border-border/60 shadow-sm">
              <CardContent className="space-y-2 p-2 lg:p-3">
                {placingStop && (
                  <div className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
                    <span className="flex items-center gap-1.5 font-medium text-primary">
                      <Crosshair className="h-4 w-4" /> Haz clic en el mapa para ubicar: {placingStop.recipientName}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => setPlacingStopId(null)}>Cancelar</Button>
                  </div>
                )}
                <RouteMap
                  origin={origin}
                  stops={mapStops}
                  routes={mapRoutes}
                  selectedRouteId={selectedId}
                  onStopMove={handleStopMove}
                  placing={!!placingStopId}
                  onMapClick={handleMapClick}
                />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full border-2 border-white bg-slate-900 shadow" /> exacta
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-slate-900 bg-white" /> aproximada (CP) — arrástrala para afinar
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl border-border/60 shadow-sm">
              <CardContent className="flex h-[40vh] min-h-[300px] flex-col items-center justify-center gap-2 text-center text-muted-foreground lg:h-[600px]">
                <ScanLine className="h-10 w-10 opacity-40" />
                Escanea paquetes para comenzar a trazar la ruta.
              </CardContent>
            </Card>
          )}
        </div>

        {/* ---- Detalle de paquetes de una parada (remesa) ---- */}
        <Dialog open={!!detailStop} onOpenChange={(o) => { if (!o) setDetailStopId(null) }}>
          <DialogContent className="max-w-md">
            {detailStop && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span className="truncate">{detailStop.recipientName}</span>
                    {detailStop.priority && <Badge className={`${BADGE_SM} bg-red-500 text-white`}>Vence hoy</Badge>}
                  </DialogTitle>
                  <DialogDescription>
                    {detailStop.address || "—"}{detailStop.zip ? ` · CP ${detailStop.zip}` : ""}{detailStop.city ? ` · ${detailStop.city}` : ""}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Package className="h-4 w-4" />{detailStop.packages.length} paquete(s) · remesa
                  </span>
                  {geoBadge(detailStop)}
                </div>

                <Separator />

                <ScrollArea className="max-h-72 pr-3">
                  <ul className="space-y-2">
                    {detailStop.packages.map((p) => (
                      <li key={p.key} className="flex items-center justify-between gap-2 rounded-md border p-2">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-xs font-medium">{p.trackingNumber}</p>
                          <p className="text-[11px] text-muted-foreground">{fmtCommit(p.commitDateTime)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {p.priority && <Badge className={`${BADGE_SM} bg-red-500 text-white`}>hoy</Badge>}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-red-600"
                            onClick={() => handleRemovePackage(detailStop.id, p.key)}
                            aria-label="Quitar paquete"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>

                <DialogFooter className="gap-2 sm:justify-between">
                  <Button variant="outline" onClick={() => startPlacing(detailStop.id)}>
                    <Move className="mr-2 h-4 w-4" />{detailStop.geoStatus === "ok" ? "Mover en el mapa" : "Ubicar en el mapa"}
                  </Button>
                  <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleRemoveStop(detailStop.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />Quitar parada
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

export default withAuth(RouteOptimizerContent)
