"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Truck, Users, Clock, AlertTriangle, CheckCircle, Package } from "lucide-react"

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

interface OperationalMetricsProps {
  branches: Branch[]
}

export function OperationalMetrics({ branches }: OperationalMetricsProps) {
  const totalActiveShipments = branches.reduce((sum, branch) => sum + branch.activeShipments, 0)
  const totalCompletedToday = branches.reduce((sum, branch) => sum + branch.completedToday, 0)
  const totalVehicles = branches.reduce((sum, branch) => sum + branch.vehicles, 0)
  const totalDrivers = branches.reduce((sum, branch) => sum + branch.drivers, 0)
  const avgDeliveryTime = branches.reduce((sum, branch) => sum + branch.avgDeliveryTime, 0) / branches.length
  const avgSatisfaction = branches.reduce((sum, branch) => sum + branch.customerSatisfaction, 0) / branches.length

  // Mock operational data
  const operationalData = {
    pendingPickups: 234,
    delayedShipments: 45,
    onTimeDeliveries: Math.floor(totalCompletedToday * 0.94),
    routesActive: 67,
    driversOnDuty: Math.floor(totalDrivers * 0.85),
    vehiclesInService: Math.floor(totalVehicles * 0.92),
  }

  const getStatusColor = (value: number, threshold: number) => {
    return value >= threshold ? "text-green-600" : value >= threshold * 0.8 ? "text-yellow-600" : "text-red-600"
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-600" />
          Métricas Operacionales en Tiempo Real
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Real-time Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-700">Envíos Activos</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{totalActiveShipments}</div>
            <div className="text-xs text-slate-500">En tránsito</div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-slate-700">Completados Hoy</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{totalCompletedToday}</div>
            <div className="text-xs text-slate-500">Entregas exitosas</div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-slate-700">Retrasos</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{operationalData.delayedShipments}</div>
            <div className="text-xs text-slate-500">Requieren atención</div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-slate-700">Conductores</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{operationalData.driversOnDuty}</div>
            <div className="text-xs text-slate-500">En servicio</div>
          </div>

          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-medium text-slate-700">Vehículos</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{operationalData.vehiclesInService}</div>
            <div className="text-xs text-slate-500">Operativos</div>
          </div>

          <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-rose-600" />
              <span className="text-sm font-medium text-slate-700">Tiempo Prom.</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{avgDeliveryTime.toFixed(1)}d</div>
            <div className="text-xs text-slate-500">Entrega</div>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="space-y-4">
          <h4 className="font-medium text-slate-700">Indicadores de Rendimiento</h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Entregas a Tiempo</span>
              <div className="flex items-center gap-2">
                <Progress value={94} className="w-24" />
                <span className="text-sm font-medium text-green-600">94%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Utilización de Flota</span>
              <div className="flex items-center gap-2">
                <Progress value={92} className="w-24" />
                <span className="text-sm font-medium text-blue-600">92%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Satisfacción del Cliente</span>
              <div className="flex items-center gap-2">
                <Progress value={avgSatisfaction * 20} className="w-24" />
                <span className="text-sm font-medium text-purple-600">{avgSatisfaction.toFixed(1)}/5.0</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Eficiencia Operacional</span>
              <div className="flex items-center gap-2">
                <Progress value={88} className="w-24" />
                <span className="text-sm font-medium text-orange-600">88%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Branch Status Summary */}
        <div className="space-y-4">
          <h4 className="font-medium text-slate-700">Estado por Sucursal</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {branches.slice(0, 6).map((branch) => (
              <div
                key={branch.id}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-slate-800">{branch.name}</div>
                  <div className="text-xs text-slate-500">
                    {branch.activeShipments} activos • {branch.completedToday} completados
                  </div>
                </div>
                <Badge
                  variant={branch.efficiency >= 95 ? "default" : branch.efficiency >= 90 ? "secondary" : "destructive"}
                  className="text-xs"
                >
                  {branch.efficiency}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
