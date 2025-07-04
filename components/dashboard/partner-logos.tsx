"use client"

import { Card } from "@/components/ui/card"
import { Truck, Package, Plane, Ship } from "lucide-react"

export function PartnerLogos() {
  const partners = [
    { name: "FedEx", icon: Plane, color: "from-purple-500 to-orange-500", status: "Activo" },
    { name: "DHL", icon: Truck, color: "from-yellow-400 to-red-500", status: "Activo" },
    { name: "UPS", icon: Package, color: "from-amber-600 to-yellow-500", status: "Activo" },
    { name: "USPS", icon: Ship, color: "from-blue-600 to-red-500", status: "Mantenimiento" },
  ]

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Socios de Envío</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="flex flex-col items-center p-4 rounded-lg bg-gradient-to-br from-slate-50 to-white hover:shadow-md transition-all duration-300 group cursor-pointer"
            >
              <div
                className={`p-3 rounded-full bg-gradient-to-br ${partner.color} mb-3 group-hover:scale-110 transition-transform`}
              >
                <partner.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">{partner.name}</h3>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  partner.status === "Activo" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {partner.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
