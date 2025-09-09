"use client";

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
    } finally {
      setIsLoading(false);
    }
  };

  fetchDrivers();
}, [selectedSubsidiaryId]);

  const handleSelect = (repartidorId: string) => {
    const repartidor = repartidores.find((r) => r.id === repartidorId);

    if (!repartidor) {
      console.warn(`Repartidor with ID ${repartidorId} not found`);
      return;
    }

    const isSelected = selectedRepartidores.some((r) => r.id === repartidorId);

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
            className="w-full justify-between bg-transparent relative pr-8 min-h-9"
            disabled={disabled || isLoading}
          >
            <div className="flex items-center gap-2 truncate">
              <User className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {selectedRepartidores.length === 0
                  ? "Seleccionar repartidores..."
                  : `${selectedRepartidores.length} repartidor(es) seleccionado(s)`}
              </span>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 absolute right-2 top-1/2 -translate-y-1/2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-full p-0 z-[100]"
          align="start"
          style={{ 
            width: "var(--radix-popover-trigger-width)",
            maxHeight: "var(--radix-popover-content-available-height)"
          }}
          avoidCollisions={true}
          collisionPadding={16}
          sideOffset={4}
        >
          <Command>
            <CommandInput placeholder="Buscar repartidor..." />
            <CommandList>
              <CommandEmpty>No se encontraron repartidores.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-y-auto">
                {repartidores.map((repartidor) => (
                  <CommandItem 
                    key={repartidor.id} 
                    value={repartidor.name} 
                    onSelect={() => handleSelect(repartidor.id)}
                    className="flex items-center py-2"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 flex-shrink-0",
                        selectedRepartidores.some(r => r.id === repartidor.id) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{repartidor.name}</span>
                      {repartidor.employeeId && (
                        <span className="text-sm text-muted-foreground truncate">
                          ID: {repartidor.employeeId}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedRepartidores.length > 0 && (
        <div className="flex flex-wrap gap-1 max-w-full">
          {getSelectedNames().map((name) => (
            <Badge key={name} variant="default" className="text-xs truncate max-w-[120px]">
              {name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}