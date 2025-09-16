import type * as React from "react"
import { CheckIcon, PlusCircledIcon } from "@radix-ui/react-icons"
import type { Column } from "@tanstack/react-table"

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

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title: string
  options: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }[]
  remoteFilters?: Record<string, any>
  setRemoteFilters?: React.Dispatch<React.SetStateAction<Record<string, any>>>
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  remoteFilters,
  setRemoteFilters,
}: DataTableFacetedFilterProps<TData, TValue>) {
    const facets = column?.getFacetedUniqueValues()
    const filterValues = (column?.getFilterValue() as string[]) ?? []

    const handleSelect = (value: string) => {
        let newValues: string[]

        if (value === 'CLEAR') {
            newValues = []
        } else if (filterValues.includes(value)) {
            newValues = filterValues.filter((v) => v !== value)
        } else {
            newValues = [...filterValues, value]
        }

        // Local filter
        column?.setFilterValue(newValues.length ? newValues : undefined)

        // Remote filter
        if (setRemoteFilters) {
            setRemoteFilters((prev) => {
                const newFilters = { ...prev, [title.toLowerCase()]: newValues.length ? newValues : undefined }
                Object.keys(newFilters).forEach((k) => {
                    if (!newFilters[k] || (Array.isArray(newFilters[k]) && newFilters[k].length === 0)) delete newFilters[k]
                })
                return newFilters
            })
        }
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed">
                    <PlusCircledIcon className="mr-2 h-4 w-4" />
                    {title}
                    {filterValues.length > 0 && (
                        <>
                            <Separator orientation="vertical" className="mx-2 h-4" />
                            <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                                {filterValues.length}
                            </Badge>
                            <div className="hidden space-x-1 lg:flex">
                                {filterValues.length > 2 ? (
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                        {filterValues.length} selected
                                    </Badge>
                                ) : (
                                    options.filter((opt) => filterValues.includes(opt.value)).map((opt) => (
                                        <Badge variant="secondary" key={opt.value} className="rounded-sm px-1 font-normal">
                                            {opt.label}
                                        </Badge>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={title} />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((opt) => {
                                const isSelected = filterValues.includes(opt.value)
                                return (
                                    <CommandItem key={opt.value} onSelect={() => handleSelect(opt.value)}>
                                        <div
                                            className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                            )}
                                        >
                                            <CheckIcon className="h-4 w-4" />
                                        </div>
                                        {opt.icon && <opt.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                                        <span>{opt.label}</span>
                                        {facets?.get(opt.value) && (
                                            <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                        {facets.get(opt.value)}
                      </span>
                                        )}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                        {filterValues.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem onSelect={() => handleSelect('CLEAR')} className="justify-center text-center">
                                        Clear filters
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