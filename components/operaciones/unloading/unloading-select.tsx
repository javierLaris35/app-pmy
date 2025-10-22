"use client"

import * as React from "react"
import { Check, ChevronDown, Ship, Search, PackageCheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { formatDateToShortDate } from "@/utils/date.utils"

export interface Desembarque {
  id: string
  trackingNumber: string
  date: string
}

interface DesembarqueSelectProps {
  desembarques: Desembarque[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
}

export function UnloadingSelect({
  desembarques,
  value,
  onValueChange,
  placeholder = "Seleccionar desembarque...",
  className,
}: DesembarqueSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const selectedDesembarque = desembarques.find((d) => d.id === value)

  const filteredDesembarques = desembarques.filter((desembarque) =>
    `${desembarque.trackingNumber}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  )

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
            <PackageCheckIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            {selectedDesembarque ? (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-medium truncate">{selectedDesembarque.trackingNumber}</span>
                {/*<span className="text-muted-foreground text-sm truncate">
                  {selectedDesembarque.puerto} • {selectedDesembarque.contenedor}
                </span>*/}
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
              placeholder="Buscar desembarque..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            <CommandEmpty>No se encontraron desembarques.</CommandEmpty>
            <CommandGroup>
              {filteredDesembarques.map((desembarque) => (
                <CommandItem
                  key={desembarque.id}
                  value={desembarque.id}
                  onSelect={(currentValue) => {
                    onValueChange?.(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                  className="flex items-center gap-3 px-3 py-3 cursor-pointer"
                >
                  <Check className={cn("h-4 w-4 shrink-0", value === desembarque.id ? "opacity-100" : "opacity-0")} />
                  <PackageCheckIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{desembarque.trackingNumber}</span>
                      {/*<Badge variant="secondary" className={cn("text-xs", getEstadoColor(desembarque.status))}>
                        {desembarque.status}
                      </Badge>*/}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatDateToShortDate(desembarque.date)}</span>
                      {/*<span>•</span>
                      <span>{desembarque.naviera}</span>*/}
                    </div>
                    {/*<div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{desembarque.contenedor}</span>
                      <span>•</span>
                      <span>{desembarque.paquetes} paquetes</span>
                      <span>•</span>
                      <span>{desembarque.fechaLlegada}</span>
                    </div>*/}
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
