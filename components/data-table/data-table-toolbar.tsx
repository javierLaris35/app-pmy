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
}

export function DataTableToolbar<TData>({ table, setGlobalFilter }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || !!table.getState().globalFilter

  // --- SOLUCIÓN AL ERROR ---
  // En lugar de table.getColumn("id"), usamos getAllColumns().find()
  // Esto devuelve undefined si no existe, pero NO rompe la aplicación.
  const allColumns = table.getAllColumns()
  const chargeColumn = allColumns.find((col) => col.id === "isChargePackage")
  const highValueColumn = allColumns.find((col) => col.id === "isHighValue")
  const statusColumn = allColumns.find((col) => col.id === "status")
  const subsidiaryColumn = allColumns.find((col) => col.id === "subsidiary")

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Buscar..."
          value={(table.getState().globalFilter as string) ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />

        {/* Filtro de Estatus - Solo si la columna existe */}
        {statusColumn && (
          <DataTableFacetedFilter
            column={statusColumn}
            title="Estatus"
            options={statuses}
          />
        )}

        {/* Filtro de Sucursal - Solo si la columna existe */}
        {subsidiaryColumn && (
          <DataTableFacetedFilter
            column={subsidiaryColumn}
            title="Sucursal"
            options={subsidiaries}
          />
        )}

        {/* Switch de Carga - Solo si la columna existe */}
        {chargeColumn && (
          <div className="flex items-center space-x-2 px-2 border-l">
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

        {/* Switch de High Value - Solo si la columna existe (en Monitoreo no aparecerá) */}
        {highValueColumn && (
          <div className="flex items-center space-x-2 px-2 border-l">
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