"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Check, ChevronsUpDown, Store } from "lucide-react"
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

// Función auxiliar para normalizar el valor de tipo BIT/Buffer
const checkIsWarehouse = (val: any): boolean => {
  if (val && typeof val === 'object' && 'data' in val) {
    return val.data[0] === 1; // Maneja el Buffer [0] o [1]
  }
  return Boolean(val); // Maneja booleano, número 1/0, etc.
};

interface SucursalSelectorProps {
  value: string | string[]
  onValueChange: (value: string | string[] | Subsidiary | Subsidiary[]) => void
  multi?: boolean
  returnObject?: boolean
  onlyWarehouses?: boolean
  insideAModal?: boolean
}

export function SucursalSelector({
  value,
  onValueChange,
  multi = false,
  returnObject = false,
  onlyWarehouses = false,
  insideAModal = false
}: SucursalSelectorProps) {
  const { subsidiaries: rawSubsidiaries, isLoading } = useSubsidiaries()
  const [open, setOpen] = useState(false)
  const [selectedSucursales, setSelectedSucursales] = useState<Subsidiary[]>([])
  const user = useAuthStore((state) => state.user)

  // Normalizamos las sucursales apenas llegan, una sola vez
  const subsidiaries = useMemo(() => {
    if (!rawSubsidiaries) return []
    return rawSubsidiaries.map(s => ({
      ...s,
      isWarehouse: checkIsWarehouse(s.isWarehouse)
    }))
  }, [rawSubsidiaries])

  const defaultAppliedRef = useRef(false)

  // 🚀 Filtrar las sucursales usando la versión normalizada.
  // SCOPING: los roles no-elevados solo ven SU sucursal (espejo del backend);
  // los elevados (admin/subadmin/superadmin/owner) ven todas.
  const filteredSubsidiaries = useMemo(() => {
    let list = onlyWarehouses ? subsidiaries.filter((s) => s.isWarehouse) : subsidiaries
    const role = String(user?.role || "").toLowerCase()
    const isGlobal = ["admin", "subadmin", "superadmin", "superamin", "owner"].includes(role)
    const ownId = user?.subsidiary?.id
    if (!isGlobal && ownId) {
      list = list.filter((s) => s.id === ownId)
    }
    return list
  }, [subsidiaries, onlyWarehouses, user])

  // 🧠 Memorizar selección basada en value
  useEffect(() => {
    if (filteredSubsidiaries.length === 0) return

    if (multi) {
      const selected = filteredSubsidiaries.filter((s) =>
        Array.isArray(value) ? value.includes(s.id!) : false
      )
      setSelectedSucursales(selected)
    } else {
      const selected = filteredSubsidiaries.find((s) => s.id === value)
      if (selected) {
        setSelectedSucursales([selected])
      } else if (!value && !defaultAppliedRef.current) {
        const defaultSucursal =
          filteredSubsidiaries.find((s) => s.id === user?.subsidiary?.id) || filteredSubsidiaries[0]
        
        if (defaultSucursal) {
          setSelectedSucursales([defaultSucursal])
          onValueChange(returnObject ? defaultSucursal : defaultSucursal.id!)
          defaultAppliedRef.current = true
        }
      }
    }
  }, [filteredSubsidiaries, value, user, onValueChange, multi, returnObject])

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
        onValueChange(returnObject ? updated : updated.map((s) => s.id ?? ""))
      } else {
        setSelectedSucursales([sucursal])
        onValueChange(returnObject ? sucursal : (sucursal.id ?? ""))
        setOpen(false)
      }
    },
    [multi, selectedSucursales, onValueChange, returnObject]
  )

  const selectedLabel = useMemo(() => {
    // Definimos los textos base dependiendo de si es bodega o sucursal
    const placeholder = onlyWarehouses ? "Seleccionar bodega..." : "Seleccionar sucursal..."
    const multiPlaceholder = onlyWarehouses ? "Seleccionar bodegas..." : "Seleccionar sucursales..."

    if (multi) {
      return selectedSucursales.length > 0
        ? selectedSucursales.map((s) => s.name).join(", ")
        : multiPlaceholder
    }
    return selectedSucursales[0]?.name || placeholder
  }, [multi, selectedSucursales, onlyWarehouses])

  return (
    // 1. modal maneja correctamente el scroll locking de Radix
    <Popover open={open} onOpenChange={setOpen} modal={insideAModal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {/* 2. Contenedor flex para alinear el icono y el texto */}
          <div className="flex items-center gap-2 truncate">
            <Store className="h-4 w-4 shrink-0" />
            <span className="truncate">{selectedLabel}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      
      {/* 3. w-[var(--radix-popover-trigger-width)] para igualar el ancho del botón */}
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder={onlyWarehouses ? "Buscar bodega..." : "Buscar sucursal..."} />
          {/* ✅ CORRECCIÓN: Quitamos el overflow-y-auto, Radix lo maneja internamente */}
          <CommandList className="max-h-64">
            <CommandEmpty>
              {isLoading ? "Cargando..." : "No se encontraron resultados."}
            </CommandEmpty>
            <CommandGroup>
              {filteredSubsidiaries.map((sucursal) => {
                const isSelected = selectedSucursales.some((s) => s.id === sucursal.id)
                return (
                  <CommandItem
                    key={sucursal.id}
                    value={sucursal.name} // Usamos el nombre para que el buscador funcione correctamente con texto
                    onSelect={() => handleSelect(sucursal)}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
                    />
                    <span className="truncate">{sucursal.name}</span>
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