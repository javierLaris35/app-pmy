"use client"

import {
  AlertCircleIcon,
  Banknote,
  BarChart3,
  CheckCircle,
  EyeIcon,
  MapPinCheckInside,
  Package,
  PercentCircle,
  Truck,
  XOctagon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SubsidiaryMetrics } from "@/lib/types"
import { IconTruckLoading } from "@tabler/icons-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { Button } from "../ui/button"

interface Props {
  data: SubsidiaryMetrics[]
}

export function SubsidiaryMetricsGrid({ data }: Props) {
  const kpiBox = (
    bgFrom: string,
    bgTo: string,
    icon: React.ReactNode,
    label: string,
    value: string | number
  ) => (
    <div
      className={`flex flex-col justify-between p-4 bg-gradient-to-r ${bgFrom} ${bgTo} rounded-xl
      shadow-sm border border-white/20 backdrop-blur-md bg-opacity-50 transition-transform duration-300
      hover:scale-105 hover:shadow-lg`}
    >
      <div className="flex items-center justify-endgap-2 space-x-1">
        {icon}
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>
      <div className="flex items-center justify-end">
        <span className="text-xl font-extrabold text-slate-800 drop-shadow-sm">
          {value}
        </span>
      </div>
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-4 gap-6">
      {data.map((subsidiary) => {
        // Determinar color de chip según eficiencia
        let efficiencyColor = "bg-green-500"
        let efficiencyLabel = "Alta"
        if (subsidiary.averageEfficiency < 60) {
          efficiencyColor = "bg-red-500"
          efficiencyLabel = "Baja"
        } else if (subsidiary.averageEfficiency < 80) {
          efficiencyColor = "bg-orange-400"
          efficiencyLabel = "Media"
        }

        return (
          <Card
            key={subsidiary.subsidiaryId}
            className={`relative bg-white/20 backdrop-blur-lg rounded-2xl border border-white/20 
            shadow-md hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]`}
          >
            {/* Chip de eficiencia en la esquina superior derecha */}
            <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-white text-xs font-semibold ${efficiencyColor}`}>
              {efficiencyLabel} {subsidiary.averageEfficiency.toFixed(0)}%
            </div>

            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2 pt-2">
                <MapPinCheckInside className="w-5 h-5 text-blue-600" />
                {subsidiary.subsidiaryName}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* KPIs principales */}
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-700">
                {kpiBox(
                  "from-blue-50",
                  "to-indigo-50",
                  <Package className="w-4 h-4 text-blue-600" />,
                  "Total",
                  subsidiary.totalPackages
                )}
                {kpiBox(
                  "from-green-50",
                  "to-emerald-50",
                  <CheckCircle className="w-4 h-4 text-green-600" />,
                  "Entregados",
                  subsidiary.deliveredPackages
                )}
                {kpiBox(
                  "from-yellow-50",
                  "to-orange-50",
                  <XOctagon className="w-4 h-4 text-yellow-600" />,
                  "Con DEX",
                  subsidiary.undeliveredPackages
                )}
                {kpiBox(
                  "from-teal-50",
                  "to-cyan-50",
                  <Truck className="w-4 h-4 text-teal-600" />,
                  "En Ruta",
                  subsidiary.inTransitPackages
                )}
              </div>

              {/* Indicadores financieros */}
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-700">
                {kpiBox(
                  "from-green-50",
                  "to-lime-50",
                  <Banknote className="w-4 h-4 text-green-700" />,
                  "Ingresos",
                  `$${subsidiary.totalRevenue.toFixed(2)}`
                )}
                {kpiBox(
                  "from-orange-50",
                  "to-yellow-100",
                  <Banknote className="w-4 h-4 text-orange-500" />,
                  "Gastos",
                  `$${subsidiary.totalExpenses.toFixed(2)}`
                )}
                {kpiBox(
                  "from-rose-50",
                  "to-pink-50",
                  <Banknote className="w-4 h-4 text-rose-500" />,
                  "Utilidad",
                  `$${subsidiary.totalProfit.toFixed(2)}`
                )}
                {kpiBox(
                  "from-indigo-50",
                  "to-purple-50",
                  <PercentCircle className="w-4 h-4 text-indigo-600" />,
                  "Productividad",
                  `${subsidiary.averageEfficiency.toFixed(0)}%`
                )}
              </div>

              {/* Consolidados */}
              <div className="mt-4 p-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/20 shadow-sm flex items-center justify-between gap-2 text-sm text-slate-700">
                <IconTruckLoading className="w-4 h-4 text-indigo-500" />
                <span className="font-medium">Consolidados:</span>
                <Badge variant="outline" className="ml-1 bg-indigo-100/40 text-indigo-700 border-indigo-300/50">
                  {subsidiary.consolidations.total}
                </Badge>
                <Tooltip>
                  <TooltipTrigger>
                    <Button variant="default" className="h-8 w-8 p-0 text-white bg-indigo-500 rounded-lg" onClick={() => ""}>
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Ver Detalles
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Detalles de no entregados */}
              {subsidiary.undeliveredPackages > 0 && (
                <div className="mt-4 p-3 bg-red-50/40 backdrop-blur-md rounded-xl border border-red-200/30 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircleIcon className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-semibold text-red-700">
                      Detalles Paquetes con DEX
                    </span>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1">
                    <li className="flex justify-between">
                      <span>DEX 07</span>
                      <span className="font-bold">{subsidiary.undeliveredDetails.byExceptionCode.code07}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>DEX 08</span>
                      <span className="font-bold">{subsidiary.undeliveredDetails.byExceptionCode.code08}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>DEX 03</span>
                      <span className="font-bold">{subsidiary.undeliveredDetails.byExceptionCode.code03}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Desconocido</span>
                      <span className="font-bold">{subsidiary.undeliveredDetails.byExceptionCode.unknown}</span>
                    </li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
