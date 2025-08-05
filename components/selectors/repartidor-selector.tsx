"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { getDriversBySucursalId } from "@/lib/services/drivers"
import { useAuthStore } from '@/store/auth.store'
import { Driver } from "@/lib/types"

interface RepartidorSelectorProps {
  selectedRepartidores: Driver[]
  onSelectionChange: (repartidores: Driver[]) => void
  disabled?: boolean
}

export function RepartidorSelector({
  selectedRepartidores,
  onSelectionChange,
  disabled = false,
}: RepartidorSelectorProps) {
  const [open, setOpen] = useState(false)
  const [repartidores, setRepartidores] = useState<Driver[]>([])
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
      const drivers = await getDriversBySucursalId(selectedSubsidiaryId);
      setRepartidores(drivers);
    } catch (error) {
      console.error("Error al obtener repartidores:", error);
      // Aquí puedes mostrar un toast o mensaje de error si quieres
    } finally {
      setIsLoading(false);
    }
  };

  fetchDrivers();
}, [selectedSubsidiaryId]);

  const handleSelect = (repartidorId: string) => {
    // Find the full repartidor object by ID
    const repartidor = repartidores.find((r) => r.id === repartidorId);

    if (!repartidor) {
      console.warn(`Repartidor with ID ${repartidorId} not found`);
      return;
    }

    // Check if the repartidor is already selected (based on ID)
    const isSelected = selectedRepartidores.some((r) => r.id === repartidorId);

    // Create new selection: either remove the repartidor or add it
    const newSelection = isSelected
      ? selectedRepartidores.filter((r) => r.id !== repartidorId)
      : [...selectedRepartidores, repartidor];

    onSelectionChange(newSelection);
  };

  const getSelectedNames = () => {
    return repartidores
      .filter((r) => selectedRepartidores.some((selected) => selected.id === r.id))
      .map((r) => r.name);
  };

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
              <User className="h-4 w-4" />
              {selectedRepartidores.length === 0
                ? "Seleccionar repartidores..."
                : `${selectedRepartidores.length} repartidor(es) seleccionado(s)`}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Buscar repartidor..." />
            <CommandList>
              <CommandEmpty>No se encontraron repartidores.</CommandEmpty>
              <CommandGroup>
                {repartidores.map((repartidor) => (
                  <CommandItem key={repartidor.id} value={repartidor.name} onSelect={() => handleSelect(repartidor.id)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedRepartidores.includes(repartidor) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{repartidor.name}</span>
                      {/*<span className="text-sm text-muted-foreground">{repartidor.employeeId}</span>*/}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedRepartidores.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {getSelectedNames().map((name) => (
            <Badge key={name} variant="default" className="text-xs">
              {name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
