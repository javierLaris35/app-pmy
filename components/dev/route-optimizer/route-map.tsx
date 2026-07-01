"use client"

import { memo, useEffect, useRef, useState } from "react"
import "leaflet/dist/leaflet.css"

export interface MapRoute {
  id: string
  color: string
  /** Polilínea [lat,lng]. */
  coordinates: [number, number][]
}

export interface MapStop {
  id: string
  lat: number
  lng: number
  label: string
  sublabel?: string
  priority?: boolean
  /** Número de secuencia en la ruta seleccionada (1..n). */
  seq?: number
  /** Ubicación aproximada (solo centroide de CP/ciudad) → marcador hueco/punteado. */
  lowConfidence?: boolean
}

interface RouteMapProps {
  origin?: { lat: number; lng: number; label: string } | null
  stops: MapStop[]
  routes: MapRoute[]
  selectedRouteId?: string | null
  /** Si se define, los marcadores son arrastrables y avisa la nueva posición. */
  onStopMove?: (id: string, lat: number, lng: number) => void
  /** Modo "colocar": el siguiente clic en el mapa reporta la posición. */
  placing?: boolean
  onMapClick?: (lat: number, lng: number) => void
}

function originIcon(L: any) {
  return L.divIcon({
    html: `<div style="background:#2563eb;width:28px;height:28px;border-radius:8px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:13px;">🏠</div>`,
    className: "ro-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function stopIcon(L: any, seq: number | undefined, priority: boolean | undefined, lowConfidence?: boolean) {
  const color = priority ? "#ef4444" : "#0f172a"
  const label = seq != null ? String(seq) : "•"
  // Baja confianza (solo centroide de CP) → hueco con borde punteado (avisa "afíname").
  const style = lowConfidence
    ? `background:#fff;color:${color};border:2px dashed ${color};`
    : `background:${color};color:#fff;border:2px solid #fff;`
  return L.divIcon({
    html: `<div style="${style}min-width:24px;height:24px;padding:0 5px;border-radius:12px;box-shadow:0 2px 4px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;">${label}</div>`,
    className: "ro-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function RouteMapImpl({ origin, stops, routes, selectedRouteId, onStopMove, placing, onMapClick }: RouteMapProps) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const LRef = useRef<any>(null)
  const markersRef = useRef<any>(null)
  const routesRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [isClient, setIsClient] = useState(false)
  // Refs para que el handler de clic del mapa use siempre los últimos valores.
  const placingRef = useRef(placing)
  const onMapClickRef = useRef(onMapClick)
  const onStopMoveRef = useRef(onStopMove)
  useEffect(() => { placingRef.current = placing }, [placing])
  useEffect(() => { onMapClickRef.current = onMapClick }, [onMapClick])
  useEffect(() => { onStopMoveRef.current = onStopMove }, [onStopMove])

  useEffect(() => setIsClient(true), [])

  // Init una sola vez.
  useEffect(() => {
    if (!isClient) return
    let cancelled = false
    const init = async () => {
      const el = elRef.current
      if (!el || mapRef.current) return
      const L = (await import("leaflet")).default
      if (cancelled || !elRef.current || mapRef.current) return
      LRef.current = L
      const map = L.map(el).setView([29.0729, -110.9559], 11) // Hermosillo por default
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map)
      routesRef.current = L.layerGroup().addTo(map)
      markersRef.current = L.layerGroup().addTo(map)
      // Clic en el mapa → si estamos en modo "colocar", reporta la posición.
      map.on("click", (e: any) => {
        if (placingRef.current) onMapClickRef.current?.(e.latlng.lat, e.latlng.lng)
      })
      mapRef.current = map
      setReady(true)
    }
    init()
    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markersRef.current = null
      routesRef.current = null
      LRef.current = null
      setReady(false)
    }
  }, [isClient])

  // Redibujar marcadores + polilíneas al cambiar datos/selección.
  useEffect(() => {
    const L = LRef.current
    const map = mapRef.current
    if (!ready || !L || !map) return

    routesRef.current.clearLayers()
    markersRef.current.clearLayers()

    // Polilíneas: la seleccionada va gruesa/opaca; las demás tenues (debajo).
    const ordered = [...routes].sort((a) => (a.id === selectedRouteId ? 1 : -1))
    ordered.forEach((r) => {
      if (!r.coordinates.length) return
      const selected = r.id === selectedRouteId
      L.polyline(r.coordinates, {
        color: r.color,
        weight: selected ? 6 : 3,
        opacity: selected ? 0.9 : 0.35,
      }).addTo(routesRef.current)
    })

    const bounds: [number, number][] = []

    if (origin) {
      L.marker([origin.lat, origin.lng], { icon: originIcon(L) })
        .bindPopup(`<b>Origen</b><br/>${origin.label}`)
        .addTo(markersRef.current)
      bounds.push([origin.lat, origin.lng])
    }

    // Varias paradas pueden caer al MISMO punto (p. ej. dos direcciones malas que
    // resuelven al centroide del mismo CP). Si se dibujan encima, el marcador de
    // abajo (y su número) se "pierde". Aquí se les aplica un pequeño offset en
    // círculo para que todos sean visibles.
    const seen = new Map<string, number>()
    const OFFSET = 0.00018 // ~20m
    stops.forEach((s) => {
      const key = `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`
      const n = seen.get(key) ?? 0
      seen.set(key, n + 1)
      let lat = s.lat, lng = s.lng
      if (n > 0) {
        const angle = (n * 2.399) // ángulo áureo → reparte sin solaparse
        lat += OFFSET * Math.cos(angle)
        lng += OFFSET * Math.sin(angle)
      }
      const marker = L.marker([lat, lng], { icon: stopIcon(L, s.seq, s.priority, s.lowConfidence), draggable: !!onStopMove })
        .bindPopup(
          `<b>${s.seq != null ? `#${s.seq} · ` : ""}${s.label}</b>${s.priority ? ' <span style="color:#ef4444;font-weight:700">⚠ Prioritario</span>' : ""}${s.lowConfidence ? ' <span style="color:#d97706;font-weight:700">≈ Ubicación aproximada (CP)</span>' : ""}${s.sublabel ? `<br/>${s.sublabel}` : ""}${onStopMove ? '<br/><span style="color:#64748b;font-size:11px">✋ Arrástrame para ajustar</span>' : ""}`,
        )
        .addTo(markersRef.current)
      // Arrastrar = ajuste fino de ubicación.
      marker.on("dragend", () => {
        const ll = marker.getLatLng()
        onStopMoveRef.current?.(s.id, ll.lat, ll.lng)
      })
      bounds.push([lat, lng])
    })

    if (bounds.length > 0) {
      map.fitBounds(bounds as any, { padding: [40, 40], maxZoom: 14 })
    }
  }, [ready, origin, stops, routes, selectedRouteId, onStopMove])

  // Cursor "crosshair" mientras se coloca una parada manualmente.
  useEffect(() => {
    const el = elRef.current
    if (el) el.style.cursor = placing ? "crosshair" : ""
  }, [placing, ready])

  if (!isClient) {
    return <div className="h-[55vh] min-h-[340px] w-full animate-pulse rounded-xl bg-muted lg:h-[600px]" />
  }

  // `isolate` + `relative z-0`: crea un stacking context propio para que los
  // z-index internos de Leaflet (panes/controles ~400-1000) NO se monten por
  // encima de los diálogos (overlay/contenido en z-50), p. ej. el Welcome.
  return <div ref={elRef} className="relative z-0 h-[55vh] min-h-[340px] w-full overflow-hidden rounded-xl border border-border/60 [isolation:isolate] lg:h-[600px]" />
}

export const RouteMap = memo(RouteMapImpl)
