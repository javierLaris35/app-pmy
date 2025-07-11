"use client"

import {
  Banknote,
  BarChart3,
  CheckCircle,
  Package,
  PercentCircle,
  Truck,
  Users,
  XOctagon,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SubsidiaryMetrics } from "@/lib/types"


interface Props {
  data: SubsidiaryMetrics[]
}

export function SubsidiaryMetricsGrid({ data }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-4 gap-6">
      {data.map((subsidiary) => (
        <Card key={subsidiary.subsidiaryId} className="bg-white shadow-md rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              {subsidiary.subsidiaryName}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* KPIs principales */}
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-700">
              <div className="flex flex-col gap-1 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>Total Paquetes</span>
                </div>
                <span className="text-xl font-bold text-slate-800">{subsidiary.totalPackages}</span>
              </div>

              <div className="flex flex-col gap-1 p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Entregados</span>
                </div>
                <span className="text-xl font-bold text-slate-800">{subsidiary.deliveredPackages}</span>
              </div>

              <div className="flex flex-col gap-1 p-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <XOctagon className="w-4 h-4 text-yellow-600" />
                  <span>No Entregados</span>
                </div>
                <span className="text-xl font-bold text-slate-800">{subsidiary.undeliveredPackages}</span>
              </div>

              <div className="flex flex-col gap-1 p-2 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-teal-600" />
                  <span>En Ruta</span>
                </div>
                <span className="text-xl font-bold text-slate-800">{subsidiary.inTransitPackages}</span>
              </div>
            </div>

            {/* Indicadores financieros */}
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-700">
              <div className="flex flex-col gap-1 p-2 bg-gradient-to-r from-green-50 to-lime-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-green-700" />
                  <span>Ingresos</span>
                </div>
                <span className="text-xl font-bold text-slate-800">${subsidiary.totalRevenue.toFixed(2)}</span>
              </div>

              <div className="flex flex-col gap-1 p-2 bg-gradient-to-r from-orange-50 to-yellow-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-orange-500" />
                  <span>Gastos</span>
                </div>
                <span className="text-xl font-bold text-slate-800">${subsidiary.totalExpenses.toFixed(2)}</span>
              </div>

              <div className="flex flex-col gap-1 p-2 bg-gradient-to-r from-rose-50 to-pink-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-rose-500" />
                  <span>Utilidad</span>
                </div>
                <span className="text-xl font-bold text-slate-800">${subsidiary.totalProfit.toFixed(2)}</span>
              </div>

              <div className="flex flex-col gap-1 p-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <PercentCircle className="w-4 h-4 text-indigo-600" />
                  <span>Eficiencia</span>
                </div>
                <span className="text-xl font-bold text-slate-800">{subsidiary.averageEfficiency.toFixed(0)}%</span>
              </div>
            </div>

            {/* Consolidados y detalles */}
            <div className="text-xs text-slate-600 pt-2">
              Consolidados:{" "}
              <Badge variant="outline" className="ml-1">
                {subsidiary.consolidations.total}
              </Badge>
            </div>

            {subsidiary.undeliveredPackages > 0 && (
              <div className="pt-2">
                <div className="text-xs font-medium text-slate-500 mb-1">Detalles de No Entregados:</div>
                <ul className="text-xs text-slate-700 pl-4 list-disc space-y-1">
                  <li>DEX 07: {subsidiary.undeliveredDetails.byExceptionCode.code07}</li>
                  <li>DEX 08: {subsidiary.undeliveredDetails.byExceptionCode.code08}</li>
                  <li>DEX 03: {subsidiary.undeliveredDetails.byExceptionCode.code03}</li>
                  <li>Desconocido: {subsidiary.undeliveredDetails.byExceptionCode.unknown}</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
