"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { UnidadSelector } from "@/components/selectors/unidad-selector"
import { RepartidorSelector } from "@/components/selectors/repartidor-selector"
import { resolveId } from "@/components/warehouse/shared/resolve-id"
import type { Driver, Vehicles } from "@/lib/types"

export interface TransportAssignmentCardProps {
  vehicleId: string
  onVehicleChange: (id: string) => void
  driverIds: any[]
  onDriversChange: (ids: any[]) => void
  subsidiaryId: string
}

/** Card de "Unidad de Traslado" + "Chofer Asignado" (look unificado: acento `primary`). */
export function TransportAssignmentCard({
  vehicleId,
  onVehicleChange,
  driverIds,
  onDriversChange,
  subsidiaryId,
}: TransportAssignmentCardProps) {
  return (
    <Card className="border-primary/20">
      <CardContent className="space-y-4">
        <Label className="font-bold text-slate-800 uppercase text-xs tracking-wider">Asignación de Transporte</Label>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-600">Unidad de Traslado</Label>
            <UnidadSelector
              selectedUnidad={vehicleId ? ({ id: vehicleId } as Vehicles) : undefined}
              onSelectionChange={(unidad) => onVehicleChange(resolveId(unidad))}
              subsidiaryId={subsidiaryId}
            />
          </div>
          <Separator className="bg-slate-100" />
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-600">Chofer Asignado</Label>
            <RepartidorSelector
              selectedRepartidores={driverIds.map((id) => ({ id }) as Driver)}
              onSelectionChange={(drivers) => onDriversChange(drivers.map((d) => resolveId(d)))}
              subsidiaryId={subsidiaryId}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
