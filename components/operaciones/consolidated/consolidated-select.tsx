"use client"

import * as React from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { formatDateToShortDate } from "@/utils/date.utils"
import { IconTruckLoading } from "@tabler/icons-react"

export interface Consolidado {
  id: string
  type: string
  date: string
  consNumber: string
  numberOfPackages: number
}

interface ConsolidadoSelectProps {
  consolidados: Consolidado[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
}

export function ConsolidadoSelect({
  consolidados,
  value,
  onValueChange,
  placeholder = "Seleccionar consolidado...",
  className,
}: ConsolidadoSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const selectedConsolidado = consolidados.find((c) => c.id === value)

  const filteredConsolidados = consolidados.filter((consolidado) =>
    `${consolidado.type} ${consolidado.consNumber} ${consolidado.numberOfPackages}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  )

  /*const getEstadoColor = (estado: Consolidado["estado"]) => {
    switch (estado) {
      case "Completo":
        return "bg-green-500 text-white"
      case "En Tránsito":
        return "bg-blue-500 text-white"
      case "En Proceso":
        return "bg-yellow-500 text-white"
      default:
        return "bg-muted text-muted-foreground"
    }
  }*/

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
            <IconTruckLoading className="h-4 w-4 shrink-0 text-muted-foreground" />
            {selectedConsolidado ? (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-medium truncate">{selectedConsolidado.consNumber}</span>
                <span className="text-muted-foreground text-sm truncate">
                  {/*{selectedConsolidado.origen} → {selectedConsolidado.destino}*/}
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
              placeholder="Buscar consolidado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            <CommandEmpty>No se encontraron consolidados.</CommandEmpty>
            <CommandGroup>
              {filteredConsolidados.map((consolidado) => (
                <CommandItem
                  key={consolidado.id}
                  value={consolidado.id}
                  onSelect={(currentValue) => {
                    onValueChange?.(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                  className="flex items-center gap-3 px-3 py-3 cursor-pointer"
                >
                  <Check className={cn("h-4 w-4 shrink-0", value === consolidado.id ? "opacity-100" : "opacity-0")} />
                  <IconTruckLoading className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{consolidado.consNumber === '' ? 'Sin Cons Number' : consolidado.consNumber}</span>
                      <Badge variant="secondary" className="text-xs">
                        {consolidado.type.toLocaleUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {/*<span>
                        {consolidado.origen} → {consolidado.destino}
                      </span>*/}
                      <span>•</span>
                      <span>{consolidado.numberOfPackages} paquetes</span>
                      <span>•</span>
                      <span>{formatDateToShortDate(consolidado.date)}</span>
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
