"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Truck, Plane, MapPin, Clock } from "lucide-react"
import { useState } from "react"

interface ShipmentItem {
  id: string
  type: "truck" | "plane"
  origin: string
  destination: string
  eta: string
  progress: number
  status: "in-transit" | "custom" | "delivered" | "pending"
}

interface ShipmentTrackingProps {
  shipments: ShipmentItem[]
}

export function ShipmentTracking({ shipments }: ShipmentTrackingProps) {
  const [filter, setFilter] = useState("all")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-transit":
        return "bg-blue-100 text-blue-800"
      case "custom":
        return "bg-yellow-100 text-yellow-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "in-transit":
        return "In Transit"
      case "custom":
        return "Custom"
      case "delivered":
        return "Delivered"
      default:
        return "Pending"
    }
  }

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-gray-900">Shipment Tracking</CardTitle>
        <div className="flex items-center space-x-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32 focus:ring-green-500 focus:border-green-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="in-transit">In Transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {shipments.map((shipment, index) => (
          <div
            key={`${shipment.id}-${index}`}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  {shipment.type === "truck" ? (
                    <Truck className="w-5 h-5 text-green-600" />
                  ) : (
                    <Plane className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{shipment.id}</p>
                  <Badge className={getStatusColor(shipment.status)}>{getStatusText(shipment.status)}</Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{shipment.progress}%</p>
                <p className="text-xs text-gray-500">Progress</p>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span>
                  {shipment.origin} → {shipment.destination}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-2" />
                <span>ETA: {shipment.eta}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipment Progress</span>
                <span className="font-medium text-gray-900">{shipment.progress}%</span>
              </div>
              <Progress value={shipment.progress} className="h-2" />

              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Order Placed</span>
                <span>In Transit</span>
                <span>Customs</span>
                <span>Out of Delivery</span>
                <span>Delivered</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
