"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target } from "lucide-react"
import { SubsidiaryMetrics } from "@/lib/types"

interface Props {
  data: SubsidiaryMetrics[]
}

function getPerformanceColor(efficiency: number) {
  if (efficiency >= 95) return "bg-green-100 text-green-700"
  if (efficiency >= 85) return "bg-yellow-100 text-yellow-700"
  return "bg-red-100 text-red-700"
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-MX")
}

export function SubsidiaryPerformanceList({ data }: Props) {
  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Target className="h-5 w-5 text-green-600" />
          Rendimiento Detallado
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {data
            .filter((d) => d.totalPackages > 0) // opcional: mostrar solo sucursales con actividad
            .sort((a, b) => b.averageEfficiency - a.averageEfficiency)
            .map((branch) => (
              <div
                key={branch.subsidiaryId}
                className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-slate-800">{branch.subsidiaryName}</h4>
                    <p className="text-xs text-slate-500">ID: {branch.subsidiaryId.slice(0, 6)}...</p>
                  </div>
                  <Badge className={getPerformanceColor(branch.averageEfficiency)}>
                    {branch.averageEfficiency.toFixed(0)}%
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-slate-800">
                      ${(branch.totalRevenue / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-slate-500">Ingresos</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-slate-800">
                      {formatNumber(branch.totalPackages)}
                    </div>
                    <div className="text-xs text-slate-500">Paquetes</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-slate-800">
                      {branch.inTransitPackages}
                    </div>
                    <div className="text-xs text-slate-500">Activos</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progreso del día</span>
                    <span>{branch.deliveredPackages} entregados</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                      style={{
                        width: `${
                          branch.totalPackages > 0
                            ? Math.min((branch.deliveredPackages / branch.totalPackages) * 100, 100)
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  )
}
