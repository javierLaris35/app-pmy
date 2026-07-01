"use client"

import { memo, useEffect, useRef, useState } from "react"
import "leaflet/dist/leaflet.css"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SubsidiaryMetrics } from "@/lib/types"

interface InteractiveMapProps {
  branches: SubsidiaryMetrics[]
  /** Si es false, oculta ingresos/utilidad en el panel (deja operativo + gastos). */
  canSeeRevenue?: boolean
}

/** Marcador circular coloreado por eficiencia (todos usan divIcon, no el icono por defecto de Leaflet). */
function createCustomIcon(L: any, efficiency: number) {
  const color = efficiency >= 95 ? "#22c55e" : efficiency >= 90 ? "#eab308" : "#ef4444"
  return L.divIcon({
    html: `
      <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
        <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
      </div>
    `,
    className: "custom-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function InteractiveMapImpl({ branches, canSeeRevenue = true }: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // 1) Inicializar el mapa UNA sola vez (no se reconstruye al cambiar `branches`).
  useEffect(() => {
    if (!isClient) return
    let cancelled = false

    const initializeMap = async () => {
      const el = mapRef.current
      if (!el || mapInstanceRef.current) return
      const L = (await import("leaflet")).default
      if (cancelled || !mapRef.current || mapInstanceRef.current) return

      leafletRef.current = L
      const mapInstance = L.map(el).setView([26.5, -111.0], 6)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapInstance)

      // Capa dedicada para los marcadores: así se sincronizan sin recrear el mapa.
      markersLayerRef.current = L.layerGroup().addTo(mapInstance)
      mapInstanceRef.current = mapInstance
      setMapReady(true)
    }

    initializeMap()

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      markersLayerRef.current = null
      leafletRef.current = null
      setMapReady(false)
    }
  }, [isClient])

  // 2) Sincronizar SOLO los marcadores cuando cambian las sucursales.
  useEffect(() => {
    const L = leafletRef.current
    const layer = markersLayerRef.current
    if (!mapReady || !L || !layer) return

    layer.clearLayers()
    branches.forEach((branch) => {
      // Coordenadas desde la BD (subsidiary.latitude/longitude). Sin coords no
      // se puede ubicar el marcador → se omite (la sucursal aún sale en cards/tabla).
      if (branch.latitude == null || branch.longitude == null) {
        console.warn(`⚠️ Sucursal "${branch.subsidiaryName}" sin coordenadas en la BD; no se dibuja en el mapa.`)
        return
      }

      const marker = L.marker([branch.latitude, branch.longitude], {
        icon: createCustomIcon(L, branch.averageEfficiency),
      })
      marker.on("click", () => setSelectedBranch(branch))
      layer.addLayer(marker)
    })
  }, [mapReady, branches])

  const getPerformanceBadge = (eff: number) =>
    eff >= 95 ? "Excelente" : eff >= 90 ? "Bueno" : "Necesita Mejora"

  if (!isClient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex gap-2 text-slate-800 text-lg font-semibold">
            <MapPin className="h-5 w-5 text-orange-600" /> Cargando mapa...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center bg-orange-100 rounded-lg">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg w-full md:w-3/5">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-600" /> Mapa Interactivo de Sucursales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={mapRef}
            className="relative z-0 h-[500px] w-full overflow-hidden rounded-lg border-2 border-orange-200 [isolation:isolate]"
          />
        </CardContent>
      </Card>

      {selectedBranch && (
        <CardContent>
          <div className="space-y-4">
            <div className="text-center border-b pb-4 border-orange-100">
              <h3 className="font-semibold text-lg text-slate-800">
                {selectedBranch.subsidiaryName}
              </h3>
              <p className="text-sm text-slate-600">{selectedBranch.state}</p>
              <Badge className="mt-2">{getPerformanceBadge(selectedBranch.averageEfficiency)}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
              {canSeeRevenue && (
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-xs text-orange-600 font-semibold">Ingresos</div>
                  <div className="font-bold">${(selectedBranch.totalRevenue / 1000).toFixed(0)}K</div>
                </div>
              )}
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-xs text-blue-600 font-semibold">Gastos</div>
                <div className="font-bold">${(selectedBranch.totalExpenses / 1000).toFixed(0)}K</div>
              </div>
              {canSeeRevenue && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-xs text-green-600 font-semibold">Utilidad</div>
                  <div className="font-bold">${(selectedBranch.totalProfit / 1000).toFixed(0)}K</div>
                </div>
              )}
              {canSeeRevenue && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-xs text-yellow-600 font-semibold">Prom. Ingreso x Paquete</div>
                  <div className="font-bold">${selectedBranch.averageRevenuePerPackage.toFixed(2)}</div>
                </div>
              )}
              <div className="bg-amber-50 p-3 rounded-lg">
                <div className="text-xs text-amber-600 font-semibold">Paquetes Totales</div>
                <div className="font-bold">{selectedBranch.totalPackages.toLocaleString()}</div>
              </div>
              <div className="bg-indigo-50 p-3 rounded-lg">
                <div className="text-xs text-indigo-600 font-semibold">Entregados (PODs)</div>
                <div className="font-bold">{selectedBranch.deliveredPackages.toLocaleString()}</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-xs text-red-600 font-semibold">DEX (No entregados)</div>
                <div className="font-bold">{selectedBranch.undeliveredPackages.toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="text-xs text-slate-600 font-semibold">En tránsito</div>
                <div className="font-bold">{selectedBranch.inTransitPackages.toLocaleString()}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-xs text-purple-600 font-semibold">Cargas</div>
                <div className="font-bold">{selectedBranch.totalCharges}</div>
              </div>
              <div className="bg-pink-50 p-3 rounded-lg">
                <div className="text-xs text-pink-600 font-semibold">Consolidados</div>
                <div className="font-bold">
                  Total: {selectedBranch.consolidations.total} <br />
                  Ordinario: {selectedBranch.consolidations.ordinary} <br />
                  Aéreo: {selectedBranch.consolidations.air}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-orange-100">
              <div className="text-xs text-slate-600 font-semibold mb-1">Detalle DEX por código:</div>
              <ul className="text-sm text-slate-700 pl-4 list-disc space-y-1">
                <li>DEX 07: {selectedBranch.undeliveredDetails.byExceptionCode.code07}</li>
                <li>DEX 08: {selectedBranch.undeliveredDetails.byExceptionCode.code08}</li>
                <li>DEX 03: {selectedBranch.undeliveredDetails.byExceptionCode.code03}</li>
                <li>Desconocido: {selectedBranch.undeliveredDetails.byExceptionCode.unknown}</li>
              </ul>
            </div>
          </div>
        </CardContent>

      )}

      <style jsx global>{`
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }
        .custom-popup .leaflet-popup-tip {
          background: white;
        }
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  )
}

/** Memoizado: el mapa (Leaflet) se reconstruye al cambiar `branches`; con memo y
 *  la ref estable de SWR no se reconstruye en re-renders no relacionados. */
export const InteractiveMap = memo(InteractiveMapImpl)