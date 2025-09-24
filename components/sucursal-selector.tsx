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
import { useAuthStore } from "@/store/auth.store"

interface SucursalSelectorProps {
  value: string | string[] // ahora puede ser string (single) o string[] (multi)
  onValueChange: (value: string | string[]) => void
  multi?: boolean
}

export function SucursalSelector({ value, onValueChange, multi = false }: SucursalSelectorProps) {
  const { subsidiaries, isLoading } = useSubsidiaries()
  const [open, setOpen] = useState(false)
  const [selectedSucursales, setSelectedSucursales] = useState<Subsidiary[]>([])

  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    if (!subsidiaries || subsidiaries.length === 0) return

    if (multi) {
      // Si es multi, "value" debería ser un array
      const selected = subsidiaries.filter((s) =>
        Array.isArray(value) ? value.includes(s.id) : false
      )
      setSelectedSucursales(selected)
    } else {
      // Modo single
      const selected = subsidiaries.find((s) => s.id === value)
      if (selected) {
        setSelectedSucursales([selected])
      } else if (!value) {
        const defaultSucursal =
          subsidiaries.find((s) => s.id === user?.subsidiary?.id) || subsidiaries[0]
        setSelectedSucursales([defaultSucursal])
        onValueChange(defaultSucursal.id)
      }
    }
  }, [subsidiaries, value, user, onValueChange, multi])

  const handleSelect = (sucursal: Subsidiary) => {
    if (multi) {
      let updated: Subsidiary[]
      if (selectedSucursales.some((s) => s.id === sucursal.id)) {
        updated = selectedSucursales.filter((s) => s.id !== sucursal.id)
      } else {
        updated = [...selectedSucursales, sucursal]
      }
      setSelectedSucursales(updated)
      onValueChange(updated.map((s) => s.id))
    } else {
      setSelectedSucursales([sucursal])
      onValueChange(sucursal.id)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {multi ? (
            selectedSucursales.length > 0
              ? selectedSucursales.map((s) => s.name).join(", ")
              : "Seleccionar sucursales..."
          ) : (
            selectedSucursales[0]?.name || "Seleccionar sucursal..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Buscar sucursal..." />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Cargando sucursales..." : "No se encontraron sucursales."}
            </CommandEmpty>
            <CommandGroup>
              {subsidiaries.map((sucursal) => {
                const isSelected = selectedSucursales.some((s) => s.id === sucursal.id)
                return (
                  <CommandItem
                    key={sucursal.id}
                    value={sucursal.id}
                    onSelect={() => handleSelect(sucursal)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {sucursal.name}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
