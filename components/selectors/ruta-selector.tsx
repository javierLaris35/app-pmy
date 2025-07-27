"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import type { Ruta } from "@/types/package-dispatch"

interface RutaSelectorProps {
  selectedRutas: string[]
  onSelectionChange: (rutas: string[]) => void
  disabled?: boolean
}

// Mock data - replace with actual API call
const mockRutas: Ruta[] = [
  { id: "1", name: "Ruta Centro", description: "Centro de la ciudad", zone: "CENTRO", isActive: true },
  { id: "2", name: "Ruta Norte", description: "Zona norte residencial", zone: "NORTE", isActive: true },
  { id: "3", name: "Ruta Sur", description: "Zona sur industrial", zone: "SUR", isActive: true },
  { id: "4", name: "Ruta Este", description: "Zona este comercial", zone: "ESTE", isActive: true },
  { id: "5", name: "Ruta Oeste", description: "Zona oeste suburbana", zone: "OESTE", isActive: true },
]

export function RutaSelector({ selectedRutas, onSelectionChange, disabled = false }: RutaSelectorProps) {
  const [open, setOpen] = useState(false)
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Simulate API call
    setIsLoading(true)
    setTimeout(() => {
      setRutas(mockRutas)
      setIsLoading(false)
    }, 500)
  }, [])

  const handleSelect = (rutaId: string) => {
    const newSelection = selectedRutas.includes(rutaId)
      ? selectedRutas.filter((id) => id !== rutaId)
      : [...selectedRutas, rutaId]

    onSelectionChange(newSelection)
  }

  const getSelectedNames = () => {
    return rutas.filter((r) => selectedRutas.includes(r.id)).map((r) => r.name)
  }

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
              <MapPin className="h-4 w-4" />
              {selectedRutas.length === 0 ? "Seleccionar rutas..." : `${selectedRutas.length} ruta(s) seleccionada(s)`}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Buscar ruta..." />
            <CommandList>
              <CommandEmpty>No se encontraron rutas.</CommandEmpty>
              <CommandGroup>
                {rutas.map((ruta) => (
                  <CommandItem key={ruta.id} value={ruta.name} onSelect={() => handleSelect(ruta.id)}>
                    <Check
                      className={cn("mr-2 h-4 w-4", selectedRutas.includes(ruta.id) ? "opacity-100" : "opacity-0")}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{ruta.name}</span>
                      <span className="text-sm text-muted-foreground">{ruta.description}</span>
                      <Badge variant="outline" className="text-xs w-fit mt-1">
                        {ruta.zone}
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedRutas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {getSelectedNames().map((name) => (
            <Badge key={name} variant="secondary" className="text-xs">
              {name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
