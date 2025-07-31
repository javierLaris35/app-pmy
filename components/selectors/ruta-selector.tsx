"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useAuthStore } from "@/store/auth.store"
import { getRoutesBySucursalId } from "@/lib/services/routes"
import { Route } from "@/lib/types"

interface RutaSelectorProps {
  selectedRutas: Route[]
  onSelectionChange: (rutas: Route[]) => void
  disabled?: boolean
}

// Mock data - replace with actual API call

export function RutaSelector({ selectedRutas, onSelectionChange, disabled = false }: RutaSelectorProps) {
  const [open, setOpen] = useState(false)
  const [rutas, setRutas] = useState<Route[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSubsidiaryId, setSelectedSubsidirayId] = useState<string | null>(null)
  const user = useAuthStore((s) => s.user)


  useEffect(() => {
      if (user?.subsidiary) {
        setSelectedSubsidirayId(user?.subsidiary.id || null)
      }
    }, [user, setSelectedSubsidirayId])

  useEffect(() => {
  if (!selectedSubsidiaryId) return;

  const fetchDrivers = async () => {
    try {
      setIsLoading(true);
      const routes = await getRoutesBySucursalId(selectedSubsidiaryId);
      setRutas(routes);
    } catch (error) {
      console.error("Error al obtener repartidores:", error);
      // Aquí puedes mostrar un toast o mensaje de error si quieres
    } finally {
      setIsLoading(false);
    }
  };

  fetchDrivers();
}, [selectedSubsidiaryId]);

  const handleSelect = (rutaId: string) => {
    const ruta = rutas.find((r) => r.id === rutaId);

    if (!ruta) {
      console.warn(`Repartidor with ID ${rutaId} not found`);
      return;
    }

    // Check if the ruta is already selected (based on ID)
    const isSelected = selectedRutas.some((r) => r.id === rutaId);

    // Create new selection: either remove the ruta or add it
    const newSelection = isSelected
      ? selectedRutas.filter((r) => r.id !== rutaId)
      : [...selectedRutas, ruta];

    onSelectionChange(newSelection)
  }

  const getSelectedNames = () => {
    return rutas
      .filter((r) => selectedRutas.some((selected) => selected.id === r.id))
      .map((r) => r.name);
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
