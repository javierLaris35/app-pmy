import type * as React from "react"
import type { Column } from "@tanstack/react-table"

import { FilterChip, type FilterChipOption } from "@/components/ui/filter-chip"

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title?: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues()
  const selected = (column?.getFilterValue() as string[] | undefined) ?? []

  const chipOptions: FilterChipOption[] = options.map((option) => ({
    ...option,
    count: facets?.get(option.value),
  }))

  return (
    <FilterChip
      title={title ?? ""}
      options={chipOptions}
      selected={selected}
      onChange={(values) => column?.setFilterValue(values.length ? values : undefined)}
      multiple
    />
  )
}
