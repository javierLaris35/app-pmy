"use client"

import { Cross2Icon } from "@radix-ui/react-icons"
import type { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "./data-table-view-options"

import { priorities, statuses, shipmentTypes, subsidiaries } from "@/lib/data"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"
import { Switch } from "../ui/switch"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  setGlobalFilter: (value: string) => void
  remoteFilters?: Record<string, any>
  setRemoteFilters?: React.Dispatch<React.SetStateAction<Record<string, any>>>
}

export function DataTableToolbar<TData>({
                                          table,
                                          setGlobalFilter,
                                          remoteFilters,
                                          setRemoteFilters
                                        }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 ||
      (remoteFilters && Object.keys(remoteFilters).length > 0)

  // Opciones de filtros remotos
  const filterOptions: Record<string, { title: string; options: { label: string; value: string }[] }> = {
    status: { title: "Estatus", options: statuses },
    priority: { title: "Prioridad", options: priorities },
    shipmentType: { title: "Tipo", options: shipmentTypes },
    subsidiary: { title: "Sucursal", options: subsidiaries },
  }

  const availableColumns = table.getAllColumns().reduce((acc, column) => {
    if (column.id in filterOptions) acc[column.id] = filterOptions[column.id]
    return acc
  }, {} as Record<string, { title: string; options: { label: string; value: string }[] }>)

  const chargeColumn = table.getAllColumns().find(col => col.id === 'isChargePackage')
  const highValueColumn = table.getAllColumns().find(col => col.id === 'isHighValue')

  const handleResetFilters = () => {
    table.resetColumnFilters()
    if (setRemoteFilters) setRemoteFilters({})
  }

  return (
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-1 items-center flex-wrap gap-2">
          <Input
              placeholder="Buscar..."
              value={table.getState().globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-8 w-[150px] lg:w-[250px]"
          />

          {/* Filtros remotos (FacetedFilter) */}
          {Object.entries(availableColumns).map(([columnId, { title, options }]) => (
              <DataTableFacetedFilter
                  key={columnId}
                  column={table.getColumn(columnId)}
                  title={title}
                  options={options}
                  remoteFilters={remoteFilters}
                  setRemoteFilters={setRemoteFilters}
              />
          ))}

          {/* Filtros locales (Switch) */}
          {chargeColumn && (
              <div className="flex items-center space-x-2 px-2">
                <Switch
                    id="filter-charge"
                    checked={table.getColumn("isChargePackage")?.getFilterValue() === true}
                    onCheckedChange={(checked) =>
                        table.getColumn("isChargePackage")?.setFilterValue(checked ? true : undefined)
                    }
                />
                <label htmlFor="filter-charge" className="text-sm">Solo carga</label>
              </div>
          )}

          {highValueColumn && (
              <div className="flex items-center space-x-2 px-2">
                <Switch
                    id="filter-highvalue"
                    checked={table.getColumn("isHighValue")?.getFilterValue() === true}
                    onCheckedChange={(checked) =>
                        table.getColumn("isHighValue")?.setFilterValue(checked ? true : undefined)
                    }
                />
                <label htmlFor="filter-highvalue" className="text-sm">Solo high value</label>
              </div>
          )}

          {/* Botón Borrar */}
          {isFiltered && (
              <Button variant="ghost" onClick={handleResetFilters} className="h-8 px-2 lg:px-3">
                Borrar
                <Cross2Icon className="ml-2 h-4 w-4" />
              </Button>
          )}
        </div>

        <DataTableViewOptions table={table} />
      </div>
  )
}
