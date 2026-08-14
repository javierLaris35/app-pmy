"use client"

import * as React from "react"
import { CheckIcon, PlusCircledIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { toggleSelection, summarizeSelection } from "@/lib/filter-chip-logic"

export interface FilterChipOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
  count?: number
}

export interface FilterChipProps {
  title: string
  options: FilterChipOption[]
  selected: string[]
  onChange: (values: string[]) => void
  /** true (default): selección acumulable. false: un solo valor y cierra el popover. */
  multiple?: boolean
  /** Muestra el buscador dentro del popover. Default true. */
  searchable?: boolean
  align?: "start" | "end"
  className?: string
  searchPlaceholder?: string
  emptyText?: string
  clearText?: string
}

export function FilterChip({
  title,
  options,
  selected,
  onChange,
  multiple = true,
  searchable = true,
  align = "start",
  className,
  searchPlaceholder,
  emptyText = "Sin resultados",
  clearText = "Borrar filtros",
}: FilterChipProps) {
  const [open, setOpen] = React.useState(false)
  const selectedSet = React.useMemo(() => new Set(selected), [selected])
  const summary = summarizeSelection(options, selected)
  const hasSelection = summary.count > 0

  const handleSelect = (value: string) => {
    onChange(toggleSelection(selected, value, multiple))
    if (!multiple) setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 border-dashed transition-colors",
            // Animación sutil: el borde pasa a sólido cuando el filtro está "prendido".
            hasSelection && "border-solid border-primary/40",
            className,
          )}
        >
          <PlusCircledIcon className="mr-2 h-4 w-4" />
          {title}
          {hasSelection && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden animate-in fade-in-0 zoom-in-95"
              >
                {summary.count}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {summary.overflow ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal animate-in fade-in-0 zoom-in-95"
                  >
                    {summary.count} seleccionados
                  </Badge>
                ) : (
                  summary.labels.map((label) => (
                    <Badge
                      key={label}
                      variant="secondary"
                      className="rounded-sm px-1 font-normal animate-in fade-in-0 zoom-in-95"
                    >
                      {label}
                    </Badge>
                  ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align={align}>
        <Command>
          {searchable && <CommandInput placeholder={searchPlaceholder ?? title ?? "Buscar…"} />}
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedSet.has(option.value)
                return (
                  <CommandItem key={option.value} onSelect={() => handleSelect(option.value)}>
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                    <span>{option.label}</span>
                    {typeof option.count === "number" && (
                      <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                        {option.count}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {hasSelection && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onChange([])}
                    className="justify-center text-center"
                  >
                    {clearText}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
