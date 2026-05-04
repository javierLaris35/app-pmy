"use client"

import { Cross2Icon } from "@radix-ui/react-icons"
import type { Table } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "./data-table-view-options"
import { statuses, subsidiaries } from "@/lib/data" 
import { DataTableFacetedFilter } from "./data-table-faceted-filter"
import { Switch } from "../ui/switch"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  setGlobalFilter: (value: string) => void
  // Agregamos la interfaz de filtros para soportarlos de forma dinámica
  filters?: {
    columnId: string
    title: string
    options?: { label: string; value: string }[]
  }[]
}

export function DataTableToolbar<TData>({ table, setGlobalFilter, filters }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || !!table.getState().globalFilter

  // Buscar columnas de manera segura
  const allColumns = table.getAllColumns()
  const chargeColumn = allColumns.find((col) => col.id === "isChargePackage")
  const highValueColumn = allColumns.find((col) => col.id === "isHighValue")
  const statusColumn = allColumns.find((col) => col.id === "status")
  const subsidiaryColumn = allColumns.find((col) => col.id === "subsidiary")

  // Obtenemos los IDs de los filtros dinámicos que se pasaron por props
  // Esto nos sirve para no duplicar los filtros por defecto (retrocompatibilidad)
  const dynamicFilterIds = filters?.map(f => f.columnId) || []

  return (
    <div className="flex items-center justify-between gap-2">
      {/* Cambiamos space-x-2 por gap-2 y flex-wrap para que si hay muchos filtros no se rompa la pantalla */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar..."
          value={(table.getState().globalFilter as string) ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />

        {/* 1. FILTROS DINÁMICOS (Los nuevos que agregues vía props en cualquier vista) */}
        {filters?.map((filter) => {
          const column = table.getColumn(filter.columnId)
          // Si la columna no existe en esta tabla o no mandaste opciones, no se dibuja
          if (!column || !filter.options) return null

          return (
            <DataTableFacetedFilter
              key={filter.columnId}
              column={column}
              title={filter.title}
              options={filter.options}
            />
          )
        })}

        {/* 2. FILTROS LEGACY (Se muestran SOLO si no se enviaron en los dinámicos para no duplicar) */}
        {statusColumn && !dynamicFilterIds.includes("status") && (
          <DataTableFacetedFilter
            column={statusColumn}
            title="Estatus"
            options={statuses}
          />
        )}

        {subsidiaryColumn && !dynamicFilterIds.includes("subsidiary") && (
          <DataTableFacetedFilter
            column={subsidiaryColumn}
            title="Sucursal"
            options={subsidiaries}
          />
        )}

        {/* Switches específicos para booleanos - Quedan intactos */}
        {chargeColumn && (
          <div className="flex items-center space-x-2 px-2 border-l h-8">
            <Switch
              id="sw-charge"
              checked={chargeColumn.getFilterValue() === true}
              onCheckedChange={(v) => chargeColumn.setFilterValue(v ? true : undefined)}
            />
            <label htmlFor="sw-charge" className="text-xs font-medium cursor-pointer">
              Carga
            </label>
          </div>
        )}

        {highValueColumn && (
          <div className="flex items-center space-x-2 px-2 border-l h-8">
            <Switch
              id="sw-highvalue"
              checked={highValueColumn.getFilterValue() === true}
              onCheckedChange={(v) => highValueColumn.setFilterValue(v ? true : undefined)}
            />
            <label htmlFor="sw-highvalue" className="text-xs font-medium cursor-pointer">
              High Value
            </label>
          </div>
        )}

        {isFiltered && (
          <Button 
            variant="ghost" 
            onClick={() => {
              table.resetColumnFilters()
              setGlobalFilter("")
            }} 
            className="h-8 px-2 lg:px-3"
          >
            Borrar
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}