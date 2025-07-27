"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import type { Repartidor } from "@/types/package-dispatch"

interface RepartidorSelectorProps {
  selectedRepartidores: string[]
  onSelectionChange: (repartidores: string[]) => void
  disabled?: boolean
}

// Mock data - replace with actual API call
const mockRepartidores: Repartidor[] = [
  { id: "1", name: "Juan Pérez", employeeId: "EMP001", isActive: true },
  { id: "2", name: "María González", employeeId: "EMP002", isActive: true },
  { id: "3", name: "Carlos Rodríguez", employeeId: "EMP003", isActive: true },
  { id: "4", name: "Ana Martínez", employeeId: "EMP004", isActive: true },
  { id: "5", name: "Luis Hernández", employeeId: "EMP005", isActive: true },
]

export function RepartidorSelector({
  selectedRepartidores,
  onSelectionChange,
  disabled = false,
}: RepartidorSelectorProps) {
  const [open, setOpen] = useState(false)
  const [repartidores, setRepartidores] = useState<Repartidor[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Simulate API call
    setIsLoading(true)
    setTimeout(() => {
      setRepartidores(mockRepartidores)
      setIsLoading(false)
    }, 500)
  }, [])

  const handleSelect = (repartidorId: string) => {
    const newSelection = selectedRepartidores.includes(repartidorId)
      ? selectedRepartidores.filter((id) => id !== repartidorId)
      : [...selectedRepartidores, repartidorId]

    onSelectionChange(newSelection)
  }

  const getSelectedNames = () => {
    return repartidores.filter((r) => selectedRepartidores.includes(r.id)).map((r) => r.name)
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
                        selectedRepartidores.includes(repartidor.id) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{repartidor.name}</span>
                      <span className="text-sm text-muted-foreground">{repartidor.employeeId}</span>
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
            <Badge key={name} variant="secondary" className="text-xs">
              {name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
