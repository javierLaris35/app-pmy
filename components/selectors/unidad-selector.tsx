"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Truck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import type { Unidad } from "@/types/package-dispatch"

interface UnidadSelectorProps {
  selectedUnidad: string
  onSelectionChange: (unidadId: string) => void
  disabled?: boolean
}

// Mock data - replace with actual API call
const mockUnidades: Unidad[] = [
  { id: "1", name: "Van 01", plateNumber: "ABC-123", type: "VAN", capacity: 50, isActive: true, isAvailable: true },
  {
    id: "2",
    name: "Camión 01",
    plateNumber: "DEF-456",
    type: "TRUCK",
    capacity: 100,
    isActive: true,
    isAvailable: true,
  },
  {
    id: "3",
    name: "Moto 01",
    plateNumber: "GHI-789",
    type: "MOTORCYCLE",
    capacity: 10,
    isActive: true,
    isAvailable: false,
  },
  { id: "4", name: "Van 02", plateNumber: "JKL-012", type: "VAN", capacity: 50, isActive: true, isAvailable: true },
  {
    id: "5",
    name: "Camión 02",
    plateNumber: "MNO-345",
    type: "TRUCK",
    capacity: 100,
    isActive: true,
    isAvailable: false,
  },
]

const getVehicleIcon = (type: Unidad["type"]) => {
  switch (type) {
    case "VAN":
      return "🚐"
    case "TRUCK":
      return "🚛"
    case "MOTORCYCLE":
      return "🏍️"
    default:
      return "🚐"
  }
}

export function UnidadSelector({ selectedUnidad, onSelectionChange, disabled = false }: UnidadSelectorProps) {
  const [open, setOpen] = useState(false)
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Simulate API call
    setIsLoading(true)
    setTimeout(() => {
      setUnidades(mockUnidades)
      setIsLoading(false)
    }, 500)
  }, [])

  const handleSelect = (unidadId: string) => {
    onSelectionChange(unidadId === selectedUnidad ? "" : unidadId)
    setOpen(false)
  }

  const selectedUnidadData = unidades.find((u) => u.id === selectedUnidad)

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
              {selectedUnidad === "" ? "Seleccionar unidad..." : selectedUnidadData?.name || "Unidad seleccionada"}
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
                {unidades.map((unidad) => (
                  <CommandItem
                    key={unidad.id}
                    value={unidad.name}
                    onSelect={() => handleSelect(unidad.id)}
                    disabled={!unidad.isAvailable}
                  >
                    <Check className={cn("mr-2 h-4 w-4", selectedUnidad === unidad.id ? "opacity-100" : "opacity-0")} />
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getVehicleIcon(unidad.type)}</span>
                        <div className="flex flex-col">
                          <span className={cn("font-medium", !unidad.isAvailable && "text-muted-foreground")}>
                            {unidad.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {unidad.plateNumber} • Capacidad: {unidad.capacity} paquetes
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={unidad.isAvailable ? "default" : "secondary"} className="text-xs">
                          {unidad.isAvailable ? "Disponible" : "No disponible"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {unidad.type}
                        </Badge>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedUnidadData && (
        <div className="bg-muted p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{getVehicleIcon(selectedUnidadData.type)}</span>
            <span className="font-medium">{selectedUnidadData.name}</span>
            <Badge variant="outline" className="text-xs">
              {selectedUnidadData.type}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            <div>Placa: {selectedUnidadData.plateNumber}</div>
            <div>Capacidad: {selectedUnidadData.capacity} paquetes</div>
          </div>
        </div>
      )}
    </div>
  )
}
