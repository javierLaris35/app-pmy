"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"

interface ShipmentAnalyticsProps {
  data: Array<{
    date: string
    delivery: number
    onDelivery: number
  }>
}

export function ShipmentAnalytics({ data }: ShipmentAnalyticsProps) {
  const [period, setPeriod] = useState("monthly")

  const totalDelivery = data.reduce((sum, item) => sum + item.delivery, 0)
  const totalOnDelivery = data.reduce((sum, item) => sum + item.onDelivery, 0)

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-gray-900">Shipment Analytics</CardTitle>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32 focus:ring-green-500 focus:border-green-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-8 mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-600 rounded-full" />
            <span className="text-sm text-gray-600">Total Delivery</span>
            <span className="font-semibold text-gray-900">{totalDelivery.toLocaleString()}</span>
            <span className="text-green-600 text-sm font-medium">↑ 13%</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-sm text-gray-600">On Delivery</span>
            <span className="font-semibold text-gray-900">{totalOnDelivery.toLocaleString()}</span>
            <span className="text-green-600 text-sm font-medium">↑ 425%</span>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#666" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#666" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey="delivery"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ fill: "#16a34a", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#16a34a" }}
              />
              <Line
                type="monotone"
                dataKey="onDelivery"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#3b82f6" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
