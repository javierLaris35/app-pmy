"use client"

import type React from "react"
import { TrendingUp, TrendingDown, Package, ShoppingCart, DollarSign, CheckCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KPICardProps {
  title: string
  value: string | number
  change: number
  changeType: "increase" | "decrease"
  icon: React.ReactNode
  iconColor: string
}

function KPICard({ title, value, change, changeType, icon, iconColor }: KPICardProps) {
  const isPositive = changeType === "increase"

  return (
    <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconColor)}>{icon}</div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div
              className={cn(
                "flex items-center space-x-1 text-sm font-medium",
                isPositive ? "text-green-600" : "text-red-600",
              )}
            >
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{Math.abs(change)}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">vs Last Month</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface KPICardsProps {
  data: {
    totalShipments: number
    totalOrders: number
    revenue: number
    delivered: number
    shipmentsChange: number
    ordersChange: number
    revenueChange: number
    deliveredChange: number
  }
}

export function KPICards({ data }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <KPICard
        title="Total Shipments"
        value={data.totalShipments}
        change={data.shipmentsChange}
        changeType={data.shipmentsChange >= 0 ? "increase" : "decrease"}
        icon={<Package className="w-5 h-5 text-white" />}
        iconColor="bg-pink-500"
      />
      <KPICard
        title="Total Order"
        value={data.totalOrders}
        change={data.ordersChange}
        changeType={data.ordersChange >= 0 ? "increase" : "decrease"}
        icon={<ShoppingCart className="w-5 h-5 text-white" />}
        iconColor="bg-green-600"
      />
      <KPICard
        title="Revenue"
        value={`$${data.revenue.toLocaleString()}`}
        change={data.revenueChange}
        changeType={data.revenueChange >= 0 ? "increase" : "decrease"}
        icon={<DollarSign className="w-5 h-5 text-white" />}
        iconColor="bg-blue-500"
      />
      <KPICard
        title="Delivered"
        value={data.delivered}
        change={data.deliveredChange}
        changeType={data.deliveredChange >= 0 ? "increase" : "decrease"}
        icon={<CheckCircle className="w-5 h-5 text-white" />}
        iconColor="bg-yellow-500"
      />
    </div>
  )
}
