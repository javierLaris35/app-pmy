"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { UnidadSelector } from "@/components/selectors/unidad-selector"
import { RepartidorSelector } from "@/components/selectors/repartidor-selector"
import type { Driver, Vehicles } from "@/lib/types"

export interface TransportAssignmentCardProps {
  /** Bare id (compat) o el objeto completo emitido por el selector (preferido: retiene el nombre). */
  vehicleId: any
  onVehicleChange: (vehicle: any) => void
  /** Array de bare ids (compat) o de objetos completos del selector. */
  driverIds: any[]
  onDriversChange: (drivers: any[]) => void
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
  // El hook conserva el objeto completo emitido por el selector (no solo el id) para
  // no perder el nombre/placa que se muestran en firma y PDF. Si por compat llega un
  // bare id (string), lo envolvemos para que el selector pueda resolverlo por id.
  const selectedUnidad: Vehicles | undefined =
    vehicleId && typeof vehicleId === "object"
      ? (vehicleId as Vehicles)
      : vehicleId
        ? ({ id: vehicleId } as Vehicles)
        : undefined

  const selectedRepartidores: Driver[] = driverIds.map((d) =>
    d && typeof d === "object" ? (d as Driver) : ({ id: d } as Driver),
  )

  return (
    <Card className="border-primary/20">
      <CardContent className="space-y-4">
        <Label className="font-bold text-slate-800 uppercase text-xs tracking-wider">Asignación de Transporte</Label>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-600">Unidad de Traslado</Label>
            <UnidadSelector
              selectedUnidad={selectedUnidad}
              // Pasamos el objeto completo del selector (no resolveId): preserva name/plateNumber.
              // resolveId() se aplica solo al armar el payload de guardado.
              onSelectionChange={(unidad) => onVehicleChange(unidad)}
              subsidiaryId={subsidiaryId}
            />
          </div>
          <Separator className="bg-slate-100" />
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-600">Chofer Asignado</Label>
            <RepartidorSelector
              selectedRepartidores={selectedRepartidores}
              // Idem: objetos completos (con name), no bare ids.
              onSelectionChange={(drivers) => onDriversChange(drivers)}
              subsidiaryId={subsidiaryId}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
