"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Package, Truck, AlertCircle, CheckCircle, Clock } from "lucide-react"

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

interface RecentActivityProps {
  branches: Branch[]
}

export function RecentActivity({ branches }: RecentActivityProps) {
  // Generate mock recent activities based on branch data
  const generateActivities = () => {
    const activities = []
    const now = new Date()

    // Generate activities for the last few hours
    for (let i = 0; i < 15; i++) {
      const randomBranch = branches[Math.floor(Math.random() * branches.length)]
      const timeAgo = Math.floor(Math.random() * 240) // 0-240 minutes ago
      const activityTime = new Date(now.getTime() - timeAgo * 60000)

      const activityTypes = [
        {
          type: "delivery",
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-50",
          message: `Entrega completada en ${randomBranch.name}`,
          details: `Paquete #${Math.floor(Math.random() * 10000) + 1000}`,
        },
        {
          type: "pickup",
          icon: Package,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          message: `Nueva recolección en ${randomBranch.name}`,
          details: `${Math.floor(Math.random() * 5) + 1} paquetes`,
        },
        {
          type: "route",
          icon: Truck,
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          message: `Ruta iniciada desde ${randomBranch.name}`,
          details: `${Math.floor(Math.random() * 20) + 5} paradas`,
        },
        {
          type: "delay",
          icon: AlertCircle,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          message: `Retraso reportado en ${randomBranch.name}`,
          details: `Estimado: +${Math.floor(Math.random() * 60) + 15} min`,
        },
        {
          type: "update",
          icon: Activity,
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          message: `Estado actualizado en ${randomBranch.name}`,
          details: `${Math.floor(Math.random() * 10) + 1} envíos`,
        },
      ]

      const activity = activityTypes[Math.floor(Math.random() * activityTypes.length)]

      activities.push({
        id: i,
        ...activity,
        timestamp: activityTime,
        branch: randomBranch.name,
        branchId: randomBranch.id,
      })
    }

    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  const activities = generateActivities()

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)

    if (diffInMinutes < 1) return "Ahora"
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
    return `${Math.floor(diffInMinutes / 1440)}d`
  }

  const getStatusBadge = (type: string) => {
    switch (type) {
      case "delivery":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
            Entregado
          </Badge>
        )
      case "pickup":
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">
            Recolección
          </Badge>
        )
      case "route":
        return (
          <Badge variant="default" className="bg-purple-100 text-purple-800 text-xs">
            En Ruta
          </Badge>
        )
      case "delay":
        return (
          <Badge variant="destructive" className="text-xs">
            Retraso
          </Badge>
        )
      case "update":
        return (
          <Badge variant="secondary" className="text-xs">
            Actualización
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-xs">
            General
          </Badge>
        )
    }
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Activity className="h-5 w-5 text-orange-600" />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Activity Summary */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-slate-700">Entregas Hoy</div>
              <div className="text-xl font-bold text-green-600">
                {branches.reduce((sum, branch) => sum + branch.completedToday, 0)}
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-slate-700">En Proceso</div>
              <div className="text-xl font-bold text-blue-600">
                {branches.reduce((sum, branch) => sum + branch.activeShipments, 0)}
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.map((activity) => {
              const IconComponent = activity.icon
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-100"
                >
                  <div className={`p-2 rounded-full ${activity.bgColor}`}>
                    <IconComponent className={`h-4 w-4 ${activity.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{activity.message}</p>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(activity.type)}
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600">{activity.details}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Stats */}
          <div className="pt-4 border-t border-orange-100">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-slate-800">
                  {activities.filter((a) => a.type === "delivery").length}
                </div>
                <div className="text-xs text-slate-500">Entregas</div>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-800">
                  {activities.filter((a) => a.type === "pickup").length}
                </div>
                <div className="text-xs text-slate-500">Recolecciones</div>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-800">
                  {activities.filter((a) => a.type === "delay").length}
                </div>
                <div className="text-xs text-slate-500">Alertas</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
