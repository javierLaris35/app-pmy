"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Building2, TrendingUp, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Branch {
  id: string
  name: string
  revenue: number
  orders: number
  efficiency: number
  lat: number
  lng: number
  expenses: number
  profit: number
  activeShipments: number
  completedToday: number
}

interface BranchMapProps {
  branches: Branch[]
}

export function BranchMap({ branches }: BranchMapProps) {
  // Calculate bounds for the map view
  const lats = branches.map((b) => b.lat)
  const lngs = branches.map((b) => b.lng)
  const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2
  const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2

  const getPerformanceColor = (efficiency: number) => {
    if (efficiency >= 95) return "bg-green-500"
    if (efficiency >= 90) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getPerformanceBadge = (efficiency: number) => {
    if (efficiency >= 95) return "Excelente"
    if (efficiency >= 90) return "Bueno"
    return "Necesita Mejora"
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
          Mapa de Sucursales y Rendimiento
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Visualization */}
          <Card className="lg:col-span-2 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orange-600" />
                Ubicaciones de Sucursales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-96 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg overflow-hidden">
                {/* Simplified map representation */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100">
                  <svg viewBox="0 0 400 300" className="w-full h-full">
                    {/* Mexico outline (simplified) */}
                    <path
                      d="M50 150 L100 120 L150 100 L200 110 L250 120 L300 130 L350 140 L380 160 L370 200 L350 220 L300 230 L250 240 L200 235 L150 230 L100 220 L70 200 Z"
                      fill="#e5e7eb"
                      stroke="#9ca3af"
                      strokeWidth="2"
                    />

                    {/* Branch locations */}
                    {branches.map((branch, index) => {
                      // Convert lat/lng to SVG coordinates (simplified mapping)
                      const x = ((branch.lng + 115) / 6) * 400
                      const y = ((32 - branch.lat) / 10) * 300

                      return (
                        <g key={branch.id}>
                          <circle
                            cx={x}
                            cy={y}
                            r="8"
                            className={`${getPerformanceColor(branch.efficiency)} opacity-80`}
                            stroke="white"
                            strokeWidth="2"
                          />
                          <text x={x} y={y - 15} textAnchor="middle" className="text-xs font-medium fill-slate-700">
                            {branch.name}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </div>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Rendimiento</h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-slate-600">≥95% Excelente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-xs text-slate-600">90-94% Bueno</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-xs text-slate-600">{"<90% Necesita Mejora"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Branch Performance List */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-600" />
                Rendimiento por Sucursal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {branches
                  .sort((a, b) => b.efficiency - a.efficiency)
                  .map((branch) => (
                    <div
                      key={branch.id}
                      className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-800">{branch.name}</h4>
                        <Badge
                          variant={
                            branch.efficiency >= 95 ? "default" : branch.efficiency >= 90 ? "secondary" : "destructive"
                          }
                          className="text-xs"
                        >
                          {getPerformanceBadge(branch.efficiency)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />${(branch.revenue / 1000).toFixed(0)}K
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {branch.orders}
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Eficiencia</span>
                          <span>{branch.efficiency}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${getPerformanceColor(branch.efficiency)}`}
                            style={{ width: `${branch.efficiency}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
