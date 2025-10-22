"use client"

import * as React from "react"
import { Check, ChevronDown, Truck, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export interface Ruta {
  id: string
  trackingNumber: string
  driver: string
  vehicle: {
    name: string,
    plateNumber: string
  }
  normalPackages: number
  f2Packages: number
  status: "En Ruta" | "Completada" | "En Progreso" | "Cancelada"
  date: string
  route: string
}

interface RutaSelectProps {
  rutas: Ruta[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
}

export function PackageDispatchSelect({
  rutas,
  value,
  onValueChange,
  placeholder = "Seleccionar ruta...",
  className,
}: RutaSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const selectedRuta = rutas.find((r) => r.id === value)

  const filteredRutas = rutas.filter((ruta) =>
    `${ruta.trackingNumber} ${ruta.driver} ${ruta.vehicle.name} ${ruta.vehicle.plateNumber} ${ruta.route}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  )

  const getEstadoColor = (estado: Ruta["status"]) => {
    switch (estado) {
      case "Completada":
        return "bg-green-500 text-white"
      case "En Ruta":
        return "bg-blue-500 text-white"
      case "En Progreso":
        return "bg-yellow-500 text-white"
      case "Cancelada":
        return "bg-red-500 text-white"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto min-h-[44px] px-3 py-2", className)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
            {selectedRuta ? (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-medium truncate">{selectedRuta.trackingNumber}</span>
                <span className="text-muted-foreground text-sm truncate">
                  {selectedRuta.driver} • {selectedRuta.vehicle.plateNumber}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Buscar ruta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            <CommandEmpty>No se encontraron rutas.</CommandEmpty>
            <CommandGroup>
              {filteredRutas.map((ruta) => (
                <CommandItem
                  key={ruta.id}
                  value={ruta.id}
                  onSelect={(currentValue) => {
                    onValueChange?.(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                  className="flex items-center gap-3 px-3 py-3 cursor-pointer"
                >
                  <Check className={cn("h-4 w-4 shrink-0", value === ruta.id ? "opacity-100" : "opacity-0")} />
                  <Truck className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{ruta.trackingNumber}</span>
                      <Badge variant="secondary" className={cn("text-xs", getEstadoColor(ruta.status))}>
                        {ruta.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{ruta.driver}</span>
                      <span>•</span>
                      <span>{ruta.vehicle.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{ruta.vehicle.plateNumber}</span>
                      <span>•</span>
                      <span>{ruta.normalPackages} paquetes normales</span>
                      <span>•</span>
                      <span>{ruta.f2Packages} paquetes F2</span>
                      <span>•</span>
                      <span>{ruta.route}</span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
