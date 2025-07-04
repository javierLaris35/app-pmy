"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Navigation } from "lucide-react"

export function MapView() {
  return (
    <Card className="bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Map view</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
          {/* Placeholder for map - you can integrate with Google Maps, Mapbox, etc. */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
            <div className="text-center">
              <Navigation className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <p className="text-gray-600 font-medium">Interactive Map</p>
              <p className="text-sm text-gray-500">Shipment locations and routes</p>
            </div>
          </div>

          {/* Sample location markers */}
          <div className="absolute top-4 left-4">
            <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
          </div>
          <div className="absolute top-12 right-8">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
          </div>
          <div className="absolute bottom-8 left-12">
            <div className="w-3 h-3 bg-yellow-600 rounded-full animate-pulse"></div>
          </div>
          <div className="absolute bottom-4 right-4">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
          </div>

          {/* Sample route line */}
          <svg className="absolute inset-0 w-full h-full">
            <path
              d="M 20 20 Q 100 50 200 100 T 300 150"
              stroke="#16a34a"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
              className="animate-pulse"
            />
          </svg>

          {/* Location info popup */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-green-600" />
              <div>
                <p className="font-semibold">DEMO-C548783</p>
                <p className="text-gray-500">4140 Parker Rd, Allentown, New Mexico 31134</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
