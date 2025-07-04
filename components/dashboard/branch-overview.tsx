"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Building2, TrendingUp, Package, Target } from "lucide-react"
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
  state: string
  address: string
  phone: string
  manager: string
  operatingHours: string
  vehicles: number
  drivers: number
  avgDeliveryTime: number
  customerSatisfaction: number
}

interface BranchOverviewProps {
  branchData: Branch[]
}

export function BranchOverview({ branchData }: BranchOverviewProps) {
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

  const totalRevenue = branchData.reduce((sum, branch) => sum + branch.revenue, 0)
  const totalOrders = branchData.reduce((sum, branch) => sum + branch.orders, 0)
  const avgEfficiency = branchData.reduce((sum, branch) => sum + branch.efficiency, 0) / branchData.length

  const getPerformanceColor = (efficiency: number) => {
    if (efficiency >= 95) return "bg-green-100 text-green-800 border-green-200"
    if (efficiency >= 90) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-orange-200">
          <p className="font-medium text-slate-800">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
          Resumen por Sucursales
        </h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-0 shadow-lg backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Ingresos Totales</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-slate-500 mt-1">Todas las sucursales</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-lg backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Pedidos Totales</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{formatNumber(totalOrders)}</div>
              <p className="text-xs text-slate-500 mt-1">Este período</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-lg backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Eficiencia Promedio</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{avgEfficiency.toFixed(1)}%</div>
              <p className="text-xs text-slate-500 mt-1">Todas las sucursales</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Branch Chart */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-600" />
                Ingresos por Sucursal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={branchData.sort((a, b) => b.revenue - a.revenue)}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Ingresos" fill="url(#branchGradient)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="branchGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ea580c" />
                      <stop offset="100%" stopColor="#fed7aa" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Branch Performance List */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Rendimiento Detallado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {branchData
                  .sort((a, b) => b.efficiency - a.efficiency)
                  .map((branch) => (
                    <div
                      key={branch.id}
                      className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-100"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-slate-800">{branch.name}</h4>
                          <p className="text-xs text-slate-500">{branch.state}</p>
                        </div>
                        <Badge className={getPerformanceColor(branch.efficiency)}>{branch.efficiency}%</Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-slate-800">${(branch.revenue / 1000).toFixed(0)}K</div>
                          <div className="text-xs text-slate-500">Ingresos</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-slate-800">{formatNumber(branch.orders)}</div>
                          <div className="text-xs text-slate-500">Pedidos</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-slate-800">{branch.activeShipments}</div>
                          <div className="text-xs text-slate-500">Activos</div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Progreso del día</span>
                          <span>{branch.completedToday} completados</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                            style={{
                              width: `${Math.min((branch.completedToday / branch.activeShipments) * 100, 100)}%`,
                            }}
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
