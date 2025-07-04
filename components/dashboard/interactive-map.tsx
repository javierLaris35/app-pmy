"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Building2, TrendingUp, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SubsidiaryMetrics } from "@/lib/types"

interface InteractiveMapProps {
  branches: SubsidiaryMetrics[]
}

// Datos extendidos (locales)
const branchData = [
    {
      id: "huatabampo",
      name: "Huatabampo",
      revenue: 450000,
      orders: 2100,
      efficiency: 94.2,
      lat: 26.7897,
      lng: -109.6456,
      expenses: 320000,
      profit: 130000,
      activeShipments: 145,
      completedToday: 89,
      state: "Sonora",
      address: "Av. Álvaro Obregón 123, Centro",
      phone: "+52 644 426 1234",
      manager: "Carlos Mendoza",
      operatingHours: "8:00 AM - 6:00 PM",
      vehicles: 12,
      drivers: 15,
      avgDeliveryTime: 2.1,
      customerSatisfaction: 4.7,
    },
    {
      id: "hermosillo",
      name: "Hermosillo",
      revenue: 850000,
      orders: 4200,
      efficiency: 96.8,
      lat: 29.0729,
      lng: -110.9559,
      expenses: 580000,
      profit: 270000,
      activeShipments: 287,
      completedToday: 156,
      state: "Sonora",
      address: "Blvd. Luis Encinas 456, Col. San Benito",
      phone: "+52 662 213 5678",
      manager: "Ana García",
      operatingHours: "7:00 AM - 7:00 PM",
      vehicles: 25,
      drivers: 32,
      avgDeliveryTime: 1.8,
      customerSatisfaction: 4.9,
    },
    {
      id: "constitucion",
      name: "Constitución",
      revenue: 320000,
      orders: 1800,
      efficiency: 92.1,
      lat: 25.0398,
      lng: -111.6703,
      expenses: 240000,
      profit: 80000,
      activeShipments: 98,
      completedToday: 67,
      state: "Baja California Sur",
      address: "Calle Hidalgo 789, Centro",
      phone: "+52 613 132 9012",
      manager: "Roberto Silva",
      operatingHours: "8:00 AM - 5:00 PM",
      vehicles: 8,
      drivers: 10,
      avgDeliveryTime: 2.5,
      customerSatisfaction: 4.5,
    },
    {
      id: "loreto",
      name: "Loreto",
      revenue: 280000,
      orders: 1400,
      efficiency: 89.5,
      lat: 26.0109,
      lng: -111.3486,
      expenses: 210000,
      profit: 70000,
      activeShipments: 76,
      completedToday: 45,
      state: "Baja California Sur",
      address: "Av. Salvatierra 321, Centro Histórico",
      phone: "+52 613 135 3456",
      manager: "María López",
      operatingHours: "8:30 AM - 5:30 PM",
      vehicles: 6,
      drivers: 8,
      avgDeliveryTime: 2.8,
      customerSatisfaction: 4.3,
    },
    {
      id: "cd-obregon",
      name: "Cd Obregon",
      revenue: 720000,
      orders: 3600,
      efficiency: 95.3,
      lat: 27.4863,
      lng: -109.9305,
      expenses: 490000,
      profit: 230000,
      activeShipments: 234,
      completedToday: 128,
      state: "Sonora",
      address: "Av. Norman Borlaug 654, Col. Benito Juárez",
      phone: "+52 644 414 7890",
      manager: "Luis Rodríguez",
      operatingHours: "7:30 AM - 6:30 PM",
      vehicles: 20,
      drivers: 26,
      avgDeliveryTime: 2.0,
      customerSatisfaction: 4.8,
    },
    {
      id: "cabo-san-lucas",
      name: "Cabo San Lucas",
      revenue: 680000,
      orders: 2800,
      efficiency: 97.2,
      lat: 22.8905,
      lng: -109.9167,
      expenses: 450000,
      profit: 230000,
      activeShipments: 189,
      completedToday: 112,
      state: "Baja California Sur",
      address: "Blvd. Marina 987, Marina",
      phone: "+52 624 143 2345",
      manager: "Patricia Morales",
      operatingHours: "8:00 AM - 6:00 PM",
      vehicles: 15,
      drivers: 20,
      avgDeliveryTime: 1.9,
      customerSatisfaction: 4.9,
    },
    {
      id: "guaymas",
      name: "Guaymas",
      revenue: 520000,
      orders: 2600,
      efficiency: 93.7,
      lat: 27.9202,
      lng: -110.9031,
      expenses: 370000,
      profit: 150000,
      activeShipments: 167,
      completedToday: 98,
      state: "Sonora",
      address: "Malecón Malpica 147, Centro",
      phone: "+52 622 222 6789",
      manager: "Fernando Castro",
      operatingHours: "8:00 AM - 6:00 PM",
      vehicles: 14,
      drivers: 18,
      avgDeliveryTime: 2.2,
      customerSatisfaction: 4.6,
    },
    {
      id: "navojoa",
      name: "Navojoa",
      revenue: 380000,
      orders: 1900,
      efficiency: 91.4,
      lat: 27.0739,
      lng: -109.4444,
      expenses: 280000,
      profit: 100000,
      activeShipments: 123,
      completedToday: 76,
      state: "Sonora",
      address: "Av. Pesqueira 258, Col. Centro",
      phone: "+52 642 422 1357",
      manager: "Sandra Jiménez",
      operatingHours: "8:00 AM - 5:30 PM",
      vehicles: 10,
      drivers: 13,
      avgDeliveryTime: 2.4,
      customerSatisfaction: 4.4,
    },
    {
      id: "puerto-penasco",
      name: "Puerto Peñasco",
      revenue: 420000,
      orders: 2200,
      efficiency: 88.9,
      lat: 31.314,
      lng: -113.5339,
      expenses: 310000,
      profit: 110000,
      activeShipments: 134,
      completedToday: 89,
      state: "Sonora",
      address: "Blvd. Benito Juárez 369, Las Conchas",
      phone: "+52 638 383 4680",
      manager: "Miguel Torres",
      operatingHours: "8:30 AM - 5:30 PM",
      vehicles: 11,
      drivers: 14,
      avgDeliveryTime: 2.6,
      customerSatisfaction: 4.2,
    },
  ]

export function InteractiveMap({ branches }: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !mapRef.current) return

    const initializeMap = async () => {
      const L = (await import("leaflet")).default

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      })

      const mapInstance = L.map(mapRef.current).setView([26.5, -111.0], 6)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapInstance)

      const createCustomIcon = (efficiency: number) => {
        const color =
          efficiency >= 95
            ? "#22c55e"
            : efficiency >= 90
            ? "#eab308"
            : "#ef4444"

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

      branches.forEach((branch) => {
        const extended = branchData.find(
          (b) => b.name.toLowerCase() === branch.subsidiaryName.toLowerCase()
        )

        if (!extended || extended.lat == null || extended.lng == null) {
          console.warn(`❌ No se encontró info de la sucursal "${branch.subsidiaryName}"`)
          return
        }

        const mergedBranch = {
          ...branch,
          ...extended,
        }

        const marker = L.marker([mergedBranch.lat, mergedBranch.lng], {
          icon: createCustomIcon(mergedBranch.averageEfficiency),
        }).addTo(mapInstance)

        marker.on("click", () => {
          setSelectedBranch(mergedBranch)
        })
      })

      mapInstanceRef.current = mapInstance
    }

    initializeMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isClient, branches])

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
            className="h-[500px] w-full rounded-lg overflow-hidden border-2 border-orange-200"
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
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-xs text-orange-600 font-semibold">Ingresos</div>
                <div className="font-bold">${(selectedBranch.totalRevenue / 1000).toFixed(0)}K</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-xs text-blue-600 font-semibold">Gastos</div>
                <div className="font-bold">${(selectedBranch.totalExpenses / 1000).toFixed(0)}K</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-xs text-green-600 font-semibold">Utilidad</div>
                <div className="font-bold">${(selectedBranch.totalProfit / 1000).toFixed(0)}K</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <div className="text-xs text-yellow-600 font-semibold">Prom. Ingreso x Paquete</div>
                <div className="font-bold">${selectedBranch.averageRevenuePerPackage.toFixed(2)}</div>
              </div>
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
                <li>Código 07: {selectedBranch.undeliveredDetails.byExceptionCode.code07}</li>
                <li>Código 08: {selectedBranch.undeliveredDetails.byExceptionCode.code08}</li>
                <li>Código 03: {selectedBranch.undeliveredDetails.byExceptionCode.code03}</li>
                <li>Desconocido: {selectedBranch.undeliveredDetails.byExceptionCode.unknown}</li>
              </ul>
            </div>
          </div>
        </CardContent>

      )}

      <style jsx global>{`
        @import url("https://unpkg.com/leaflet@1.7.1/dist/leaflet.css");
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