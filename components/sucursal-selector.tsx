"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Subsidiary } from "@/lib/types"
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries"
import { useAuthStore } from "@/store/auth.store" // Ajusta el path si es necesario

interface SucursalSelectorProps {
  value: string
  onValueChange: (value: string) => void
}

export function SucursalSelector({ value, onValueChange }: SucursalSelectorProps) {
  const { subsidiaries, isLoading } = useSubsidiaries()
  const [open, setOpen] = useState(false)
  const [selectedSucursal, setSelectedSucursal] = useState<Subsidiary | undefined>()

  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    if (!subsidiaries || subsidiaries.length === 0) return

    const selected = subsidiaries.find((s) => s.id === value)
    if (selected) {
      setSelectedSucursal(selected)
    } else if (!value) {
      const defaultSucursal = subsidiaries.find((s) => s.id === user?.subsidiaryId) || subsidiaries[0]
      setSelectedSucursal(defaultSucursal)
      onValueChange(defaultSucursal.id)
    }
  }, [subsidiaries, value, user, onValueChange])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedSucursal ? selectedSucursal.name : "Seleccionar sucursal..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Buscar sucursal..." />
          <CommandList>
            <CommandEmpty>{isLoading ? "Cargando sucursales..." : "No se encontraron sucursales."}</CommandEmpty>
            <CommandGroup>
              {subsidiaries.map((sucursal) => (
                <CommandItem
                  key={sucursal.id}
                  value={sucursal.id}
                  onSelect={(currentValue) => {
                    const selected = subsidiaries.find((s) => s.id === currentValue)
                    if (selected) {
                      setSelectedSucursal(selected)
                      onValueChange(selected.id)
                    }
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === sucursal.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {sucursal.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
