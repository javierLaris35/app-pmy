"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { osrmRoute, osrmTrip, type LatLng } from "@/lib/routing/osrm";
import type { RouteStop } from "@/lib/services/monitoring/route-monitor";

const STATUS_COLOR: Record<string, string> = {
  entregado: "#16A34A",
  entregado_por_fedex: "#16A34A",
  entregado_en_bodega: "#16A34A",
  rechazado: "#DC2626",
  devuelto_a_fedex: "#DC2626",
  retorno_abandono_fedex: "#DC2626",
  cliente_no_disponible: "#D97706",
  direccion_incorrecta: "#D97706",
  cambio_fecha_solicitado: "#D97706",
  desconocido: "#64748B",
};
const colorFor = (status?: string | null) => STATUS_COLOR[String(status || "").toLowerCase()] || "#2563EB"; // azul = en tránsito/pendiente

function createStopIcon(L: any, color: string, sequence: number | null) {
  const dashed = sequence == null;
  const label = sequence != null ? String(sequence) : "";
  return L.divIcon({
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${dashed ? "#fff" : color};border:2.5px ${dashed ? "dashed" : "solid"} ${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(0,0,0,.3);font:700 10px ui-monospace,monospace;color:${dashed ? color : "#fff"}">${label}</div>`,
    className: "route-stop-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

/** Ángulo (bearing) entre dos puntos [lat,lng], en grados, para orientar la flecha. */
function bearing([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function createArrowIcon(L: any, color: string, angle: number) {
  return L.divIcon({
    html: `<div style="width:14px;height:14px;transform:rotate(${angle}deg)"><svg viewBox="0 0 14 14"><polygon points="7,1 13,12 7,9 1,12" fill="${color}" stroke="white" stroke-width="0.8"/></svg></div>`,
    className: "route-arrow-marker",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

type StopWithCoords = RouteStop & { lat: number | null; lng: number | null };

type OverlayKey = "priority" | "address";
const OVERLAYS: { key: OverlayKey; label: string; color: string }[] = [
  { key: "priority", label: "Sugerida · por vencimiento", color: "#7C3AED" },
  { key: "address", label: "Sugerida · por dirección", color: "#EA580C" },
];

interface RouteLiveMapProps {
  stops: StopWithCoords[];
  /** true mientras el geocoding de la ruta sigue en curso en segundo plano (no bloquea el resto de la pantalla). */
  loading?: boolean;
  /** Punto de partida (sucursal) para las rutas sugeridas; sin esto se usa la primera parada. */
  origin?: LatLng | null;
}

function RouteLiveMapImpl({ stops, loading, origin }: RouteLiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const pathLayerRef = useRef<any>(null);
  const overlayLayerRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [active, setActive] = useState<Set<OverlayKey>>(new Set());
  const [overlayData, setOverlayData] = useState<Record<OverlayKey, { coordinates: [number, number][]; distanceKm: number; durationMin: number } | null>>({ priority: null, address: null });
  const [overlayLoading, setOverlayLoading] = useState<Set<OverlayKey>>(new Set());

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (!isClient) return;
    let cancelled = false;
    (async () => {
      const el = mapRef.current;
      if (!el || mapInstanceRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;
      leafletRef.current = L;
      const map = L.map(el).setView([26.5, -111.0], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors" }).addTo(map);
      pathLayerRef.current = L.layerGroup().addTo(map);
      overlayLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      setMapReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      markersLayerRef.current = null;
      pathLayerRef.current = null;
      overlayLayerRef.current = null;
      leafletRef.current = null;
      setMapReady(false);
    };
  }, [isClient]);

  const stopsWithCoords = useMemo(() => stops.filter((s) => s.lat != null && s.lng != null), [stops]);

  // Marcadores + recorrido REAL reconstruido (dashed, numerado) — siempre visible.
  useEffect(() => {
    const L = leafletRef.current;
    const layer = markersLayerRef.current;
    const pathLayer = pathLayerRef.current;
    const map = mapInstanceRef.current;
    if (!mapReady || !L || !layer) return;

    layer.clearLayers();
    pathLayer.clearLayers();

    stopsWithCoords.forEach((s) => {
      const marker = L.marker([s.lat, s.lng], { icon: createStopIcon(L, colorFor(s.headlineStatus), s.sequence) });
      const pkgList = s.packages.map((p) => `${p.trackingNumber} — ${p.fedexStatus || p.status}`).join("<br/>");
      marker.bindPopup(
        `<div style="font-size:12px;line-height:1.4;max-width:220px">
          <strong>${s.recipientName || "—"}</strong><br/>
          ${s.recipientAddress || ""}<br/>
          <span style="color:#64748B">${s.packageCount} guía(s):</span><br/>${pkgList}
        </div>`,
      );
      layer.addLayer(marker);
    });

    const visitedOrdered = stopsWithCoords.filter((s) => s.sequence != null).sort((a, b) => (a.sequence! - b.sequence!));
    if (visitedOrdered.length > 1) {
      const line = L.polyline(visitedOrdered.map((s) => [s.lat, s.lng]), { color: "#0EA5A8", weight: 2.5, dashArray: "1 7", lineCap: "round" });
      pathLayer.addLayer(line);
    }

    if (stopsWithCoords.length) {
      const bounds = L.latLngBounds(stopsWithCoords.map((s) => [s.lat, s.lng]));
      map.fitBounds(bounds.pad(0.2));
    }
  }, [mapReady, stopsWithCoords]);

  // Overlays sugeridos: caminos REALES (OSRM) + flechas de dirección.
  useEffect(() => {
    const L = leafletRef.current;
    const layer = overlayLayerRef.current;
    if (!mapReady || !L || !layer) return;
    layer.clearLayers();

    for (const { key, color } of OVERLAYS) {
      if (!active.has(key)) continue;
      const data = overlayData[key];
      if (!data?.coordinates?.length) continue;

      L.polyline(data.coordinates, { color, weight: 4, opacity: 0.85 }).addTo(layer);

      // Flechas cada ~1/6 del camino, orientadas con el bearing real hacia el siguiente punto.
      const coords = data.coordinates;
      const step = Math.max(1, Math.floor(coords.length / 6));
      for (let i = step; i < coords.length - 1; i += step) {
        const angle = bearing(coords[i - 1], coords[i + 1] || coords[i]);
        L.marker(coords[i], { icon: createArrowIcon(L, color, angle), interactive: false }).addTo(layer);
      }
    }
  }, [mapReady, active, overlayData]);

  const computeOverlay = async (key: OverlayKey) => {
    if (overlayData[key] || overlayLoading.has(key) || stopsWithCoords.length < 1) return;
    setOverlayLoading((s) => new Set(s).add(key));
    try {
      const originPt: LatLng = origin || { lat: stopsWithCoords[0].lat!, lng: stopsWithCoords[0].lng! };
      let ordered: StopWithCoords[];
      let result;
      if (key === "priority") {
        // Orden por vencimiento (commitDateTime más próximo primero); sin fecha → al final.
        const withDeadline = (s: StopWithCoords) => Math.min(...s.packages.map((p) => (p.commitDateTime ? new Date(p.commitDateTime).getTime() : Infinity)));
        ordered = [...stopsWithCoords].sort((a, b) => withDeadline(a) - withDeadline(b));
        result = await osrmRoute([originPt, ...ordered.map((s) => ({ lat: s.lat!, lng: s.lng! }))]);
      } else {
        // Orden óptimo por geografía (TSP real vía OSRM).
        result = await osrmTrip([originPt, ...stopsWithCoords.map((s) => ({ lat: s.lat!, lng: s.lng! }))]);
      }
      setOverlayData((prev) => ({ ...prev, [key]: { coordinates: result.coordinates, distanceKm: result.distanceKm, durationMin: result.durationMin } }));
    } catch {
      // Si OSRM falla (demo público, sin SLA), simplemente no se dibuja esa sugerida.
    } finally {
      setOverlayLoading((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  };

  const toggle = (key: OverlayKey) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else { next.add(key); computeOverlay(key); }
      return next;
    });
  };

  if (!isClient) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" /> Cargando mapa…</CardTitle></CardHeader>
        <CardContent><div className="h-[300px] flex items-center justify-center bg-muted rounded-lg"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div></CardContent>
      </Card>
    );
  }

  const withoutCoords = stops.filter((s) => s.lat == null || s.lng == null).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-teal-600" /> Recorrido</span>
          {loading ? (
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Ubicando paradas…</span>
          ) : withoutCoords > 0 ? (
            <span className="text-xs font-normal text-muted-foreground">{withoutCoords} sin ubicar</span>
          ) : null}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
            <span className="h-1.5 w-1.5 rounded-full border border-dashed border-teal-600" /> Real (reconstruido)
          </span>
          {OVERLAYS.map((o) => (
            <button
              key={o.key}
              onClick={() => toggle(o.key)}
              disabled={overlayLoading.has(o.key)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors",
                active.has(o.key) ? "text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
              style={active.has(o.key) ? { backgroundColor: o.color, borderColor: o.color } : undefined}
            >
              {overlayLoading.has(o.key) ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active.has(o.key) ? "#fff" : o.color }} />}
              {o.label}
              {active.has(o.key) && overlayData[o.key] && (
                <span className="opacity-85">· {overlayData[o.key]!.distanceKm.toFixed(1)} km</span>
              )}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {/* El tablero ya está usable aunque esto siga cargando: el mapa se llena solo cuando lleguen las coordenadas. */}
        <div ref={mapRef} className="relative z-0 h-[320px] w-full overflow-hidden rounded-lg border [isolation:isolate]" />
      </CardContent>
    </Card>
  );
}

export const RouteLiveMap = memo(RouteLiveMapImpl);
