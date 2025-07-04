"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, Target, Package, Clock, Star } from "lucide-react"

interface FinancialKPIs {
  revenue: number
  revenueChange: number
  profit: number
  profitMargin: number
  expenses: number
  expensesChange: number
  netIncome: number
  netIncomeChange: number
}

interface OperationalKPIs {
  totalOrders: number
  ordersChange: number
  fulfillmentRate: number
  fulfillmentChange: number
  avgDeliveryTime: number
  deliveryTimeChange: number
  customerSatisfaction: number
  satisfactionChange: number
  onTimeDelivery: number
  onTimeChange: number
  returnRate: number
  returnChange: number
}

interface KPIGridProps {
  financialKPIs: FinancialKPIs
  operationalKPIs: OperationalKPIs
}

export function KPIGrid({ financialKPIs, operationalKPIs }: KPIGridProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("es-MX").format(num)
  }

  const TrendIcon = ({ change }: { change: number }) => {
    return change >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    )
  }

  const TrendText = ({ change }: { change: number }) => {
    const color = change >= 0 ? "text-green-600" : "text-red-600"
    const sign = change >= 0 ? "+" : ""
    return (
      <span className={`text-sm font-medium ${color}`}>
        {sign}
        {change.toFixed(1)}%
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
          Indicadores Clave de Rendimiento
        </h2>

        {/* Financial KPIs */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-slate-700 mb-3">Métricas Financieras</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-0 shadow-lg backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">Ingresos Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">{formatCurrency(financialKPIs.revenue)}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon change={financialKPIs.revenueChange} />
                  <TrendText change={financialKPIs.revenueChange} />
                  <span className="text-xs text-slate-500">vs mes anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-lg backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">Ganancia Neta</CardTitle>
                <Target className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">{formatCurrency(financialKPIs.profit)}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon change={financialKPIs.netIncomeChange} />
                  <TrendText change={financialKPIs.netIncomeChange} />
                  <span className="text-xs text-slate-500">margen {financialKPIs.profitMargin.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-lg backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">Gastos Totales</CardTitle>
                <TrendingDown className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">{formatCurrency(financialKPIs.expenses)}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon change={financialKPIs.expensesChange} />
                  <TrendText change={financialKPIs.expensesChange} />
                  <span className="text-xs text-slate-500">optimización</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-lg backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">Margen de Ganancia</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">{financialKPIs.profitMargin.toFixed(1)}%</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon change={financialKPIs.netIncomeChange} />
                  <TrendText change={financialKPIs.netIncomeChange} />
                  <span className="text-xs text-slate-500">eficiencia</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Operational KPIs */}
        <div>
          <h3 className="text-lg font-medium text-slate-700 mb-3">Métricas Operacionales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-0 shadow-lg backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">Pedidos Totales</CardTitle>
                <Package className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">{formatNumber(operationalKPIs.totalOrders)}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon change={operationalKPIs.ordersChange} />
                  <TrendText change={operationalKPIs.ordersChange} />
                  <span className="text-xs text-slate-500">este mes</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-0 shadow-lg backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">Tasa de Cumplimiento</CardTitle>
                <Target className="h-4 w-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">{operationalKPIs.fulfillmentRate.toFixed(1)}%</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon change={operationalKPIs.fulfillmentChange} />
                  <TrendText change={operationalKPIs.fulfillmentChange} />
                  <span className="text-xs text-slate-500">eficiencia</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-0 shadow-lg backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">Tiempo Promedio</CardTitle>
                <Clock className="h-4 w-4 text-rose-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">
                  {operationalKPIs.avgDeliveryTime.toFixed(1)} días
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon change={operationalKPIs.deliveryTimeChange} />
                  <TrendText change={operationalKPIs.deliveryTimeChange} />
                  <span className="text-xs text-slate-500">entrega</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-0 shadow-lg backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">Satisfacción Cliente</CardTitle>
                <Star className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">
                  {operationalKPIs.customerSatisfaction.toFixed(1)}/5.0
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon change={operationalKPIs.satisfactionChange} />
                  <TrendText change={operationalKPIs.satisfactionChange} />
                  <span className="text-xs text-slate-500">calificación</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
