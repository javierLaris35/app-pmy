"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

interface ConsolidadoInfo {
  consNumber: string
  date: string
  estado: string
}

interface DesembarqueInfo {
  trackingNumber: string
  date: string
  estado: string
}

interface RutaInfo {
  driver: string
  vehicle: string
  estado: string
}

interface SelectionInfoProps {
  type: "consolidado" | "desembarque" | "ruta"
  data: ConsolidadoInfo | DesembarqueInfo | RutaInfo
}

export function SelectionInfo({ type, data }: SelectionInfoProps) {
  return (
    <Card className="p-6 h-full border border-gray-100">
      <div className="space-y-4">
        {type === "consolidado" && (
          <>
            <div className="text-sm">
              <p className="font-medium text-muted-foreground mb-1">Número de Consolidado</p>
              <p className="font-semibold text-base">{(data as ConsolidadoInfo).consNumber}</p>
            </div>
            <div className="text-sm">
              <p className="font-medium text-muted-foreground mb-1">Fecha</p>
              <p className="font-semibold text-base">{(data as ConsolidadoInfo).date}</p>
            </div>
            <div className="text-sm">
              <p className="font-medium text-muted-foreground mb-1">Estado</p>
              <Badge variant="outline" className="mt-1 bg-gray-50 text-gray-600">
                {(data as ConsolidadoInfo).estado}
              </Badge>
            </div>
          </>
        )}

        {type === "desembarque" && (
          <>
            <div className="text-sm">
              <p className="font-medium text-muted-foreground mb-1">Número de Desembarque</p>
              <p className="font-semibold text-base">{(data as DesembarqueInfo).trackingNumber}</p>
            </div>
            <div className="text-sm">
              <p className="font-medium text-muted-foreground mb-1">Fecha</p>
              <p className="font-semibold text-base">{(data as DesembarqueInfo).date}</p>
            </div>
            <div className="text-sm">
              <p className="font-medium text-muted-foreground mb-1">Estado</p>
              <Badge variant="outline" className="mt-1 bg-gray-50 text-gray-600">
                {(data as DesembarqueInfo).estado}
              </Badge>
            </div>
          </>
        )}

        {type === "ruta" && (
          <>
            <div className="text-sm">
              <p className="font-medium text-muted-foreground mb-1">Chofer</p>
              <p className="font-semibold text-base">{(data as RutaInfo).driver}</p>
            </div>
            <div className="text-sm">
              <p className="font-medium text-muted-foreground mb-1">Vehículo</p>
              <p className="font-semibold text-base">{(data as RutaInfo).vehicle}</p>
            </div>
            <div className="text-sm">
              <p className="font-medium text-muted-foreground mb-1">Estado de Ruta</p>
              <Badge variant="outline" className="mt-1 bg-gray-50 text-gray-600">
                {(data as RutaInfo).estado}
              </Badge>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
