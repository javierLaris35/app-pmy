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
  table: Table<TData>,
  setGlobalFilter: (value: string) => void
}

export function DataTableToolbar<TData>({ table, setGlobalFilter }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  // Mapa de opciones de filtro por columna
  const filterOptions: Record<string, { title: string; options: { label: string; value: string }[] }> = {
    status: { title: "Estatus", options: statuses },
    priority: { title: "Prioridad", options: priorities },
    shipmentType: { title: "Tipo", options: shipmentTypes },
    subsidiary: { title: "Sucursal", options: subsidiaries },
  }

  // Obtener columnas disponibles
  const availableColumns = table.getAllColumns().reduce((acc, column) => {
    if (column.id in filterOptions) {
      acc[column.id] = filterOptions[column.id]
    }
    return acc
  }, {} as Record<string, { title: string; options: { label: string; value: string }[] }>)

  // Validar si existe la columna de isChargePackage
  const chargeColumn = table.getAllColumns().find(col => col.id === 'isChargePackage');

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Buscar..."
          value={table.getState().globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {Object.entries(availableColumns).map(([columnId, { title, options }]) => (
          <DataTableFacetedFilter
            key={columnId}
            column={table.getColumn(columnId)}
            title={title}
            options={options}
          />
        ))}
        {chargeColumn  && (
          <div className="flex items-center space-x-2 px-2">
            <Switch
              id="filter-charge"
              checked={table.getColumn("isChargePackage")?.getFilterValue() === true}
              onCheckedChange={(checked) =>
                table.getColumn("isChargePackage")?.setFilterValue(checked ? true : undefined)
              }
            />
            <label htmlFor="filter-charge" className="text-sm">
              Solo carga
            </label>
          </div>
        )}
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
            Borrar
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}