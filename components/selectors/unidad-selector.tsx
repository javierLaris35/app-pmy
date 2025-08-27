"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Truck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { VehicleStatus, VehicleTypeEnum, type Vehicles } from "@/lib/types"
import { useAuthStore } from "@/store/auth.store"
import { getVehiclesBySucursalId } from "@/lib/services/vehicles"

interface UnidadSelectorProps {
  selectedUnidad: Vehicles
  onSelectionChange: (unidad: Vehicles) => void
  disabled?: boolean
}

const getVehicleIcon = (type: Vehicles["type"]) => {
  switch (type) {
    case VehicleTypeEnum.VAN:
      return "🚐"
    case VehicleTypeEnum.RABON:
      return "🚛"
    case VehicleTypeEnum["3/4"]:
      return "🚚"
    case VehicleTypeEnum.CAJA_LARGA:
      return "🛻"
    default:
      return "🚗"
  }
}

export function UnidadSelector({
  selectedUnidad,
  onSelectionChange,
  disabled = false,
}: UnidadSelectorProps) {
  const [open, setOpen] = useState(false)
  const [unidades, setUnidades] = useState<Vehicles[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSubsidiaryId, setSelectedSubsidirayId] = useState<string | null>(null)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (user?.subsidiary) {
      setSelectedSubsidirayId(user.subsidiary.id)
    }
  }, [user])

  useEffect(() => {
    if (!selectedSubsidiaryId) return

    const fetchUnidades = async () => {
      try {
        setIsLoading(true)
        const data = await getVehiclesBySucursalId(selectedSubsidiaryId)
        setUnidades(data)
      } catch (error) {
        console.error("Error al obtener unidades:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUnidades()
  }, [selectedSubsidiaryId])

  const handleSelect = (unidadId: string) => {
    const unidad = unidades.find((u) => u.id === unidadId)
    if (!unidad) {
      console.warn(`Unidad with ID ${unidadId} not found`)
      return
    }
    onSelectionChange(unidad)
    setOpen(false)
  }

  const selectedUnidadData = selectedUnidad
    ? unidades.find((u) => u.id === selectedUnidad.id)
    : undefined

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-transparent"
            disabled={disabled || isLoading}
          >
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              {!selectedUnidad || !selectedUnidad.name
                ? "Seleccionar unidad..."
                : `${selectedUnidadData?.name || selectedUnidad.name} • ${selectedUnidadData?.code || selectedUnidad.code}`}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Buscar unidad..." />
            <CommandList>
              <CommandEmpty>No se encontraron unidades.</CommandEmpty>
              <CommandGroup>
                {unidades.map((unidad) => {
                  if (!unidad) return null
                  const commandValue = unidad.name || unidad.id || ""
                  const isDisponible = unidad.status !== VehicleStatus.INACTIVE

                  return (
                    <CommandItem
                      key={unidad.id}
                      value={commandValue}
                      onSelect={() => handleSelect(unidad.id)}
                      disabled={!isDisponible}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedUnidad?.id === unidad.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getVehicleIcon(unidad.type)}</span>
                          <div className="flex flex-col">
                            <span className={cn("font-medium", !isDisponible && "text-muted-foreground")}>
                              {unidad.name} • {unidad.code}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {unidad.plateNumber} • Capacidad: {unidad.capacity} paquetes
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={isDisponible ? "default" : "secondary"} className="text-xs">
                            {isDisponible ? "Disponible" : "No disponible"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {unidad.type.toLocaleUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedUnidadData && (
        <div className="bg-muted p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{getVehicleIcon(selectedUnidadData.type)}</span>
            <span className="font-medium">
              {selectedUnidadData.name} • {selectedUnidadData.code}
            </span>
            <Badge variant="outline" className="text-xs">
              {selectedUnidadData.type.toLocaleUpperCase()}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            <div>Placa: {selectedUnidadData.plateNumber}</div>
            <div>Kms: {selectedUnidadData.kms}</div>
            <div>Capacidad: {selectedUnidadData.capacity} paquetes</div>
          </div>
        </div>
      )}
    </div>
  )
}
