"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
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
  value: string | string[]
  onValueChange: (value: string | string[] | Subsidiary | Subsidiary[]) => void
  multi?: boolean
  returnObject?: boolean // ✅ Nueva prop opcional
}

export function SucursalSelector({
  value,
  onValueChange,
  multi = false,
  returnObject = false,
}: SucursalSelectorProps) {
  const { subsidiaries, isLoading } = useSubsidiaries()
  const [open, setOpen] = useState(false)
  const [selectedSucursales, setSelectedSucursales] = useState<Subsidiary[]>([])
  const user = useAuthStore((state) => state.user)

  // 🧠 Memorizar selección basada en value
  useEffect(() => {
    if (!subsidiaries || subsidiaries.length === 0) return

    if (multi) {
      const selected = subsidiaries.filter((s) =>
        Array.isArray(value) ? value.includes(s.id) : false
      )
      setSelectedSucursales(selected)
    } else {
      const selected = subsidiaries.find((s) => s.id === value)
      if (selected) {
        setSelectedSucursales([selected])
      } else if (!value) {
        const defaultSucursal =
          subsidiaries.find((s) => s.id === user?.subsidiary?.id) || subsidiaries[0]
        if (defaultSucursal) {
          setSelectedSucursales([defaultSucursal])
          onValueChange(returnObject ? defaultSucursal : defaultSucursal.id)
        }
      }
    }
  }, [subsidiaries, value, user, onValueChange, multi, returnObject])

  // 🧩 Función para manejar selección
  const handleSelect = useCallback(
    (sucursal: Subsidiary) => {
      if (multi) {
        let updated: Subsidiary[]
        if (selectedSucursales.some((s) => s.id === sucursal.id)) {
          updated = selectedSucursales.filter((s) => s.id !== sucursal.id)
        } else {
          updated = [...selectedSucursales, sucursal]
        }
        setSelectedSucursales(updated)
        onValueChange(returnObject ? updated : updated.map((s) => s.id))
      } else {
        setSelectedSucursales([sucursal])
        onValueChange(returnObject ? sucursal : sucursal.id)
        setOpen(false)
      }
    },
    [multi, selectedSucursales, onValueChange, returnObject]
  )

  const selectedLabel = useMemo(() => {
    if (multi) {
      return selectedSucursales.length > 0
        ? selectedSucursales.map((s) => s.name).join(", ")
        : "Seleccionar sucursales..."
    }
    return selectedSucursales[0]?.name || "Seleccionar sucursal..."
  }, [multi, selectedSucursales])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedLabel}
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
                      className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
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
