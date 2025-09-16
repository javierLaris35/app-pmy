import { ChevronLeftIcon, ChevronRightIcon, DoubleArrowLeftIcon, DoubleArrowRightIcon } from "@radix-ui/react-icons"
import type { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  manualPagination?: boolean
  meta?: {
    totalPages: number
    currentPage: number
    totalItems: number,
    pageSize: number,
  }
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

export function DataTablePagination<TData>({
 table,
 manualPagination,
 meta,
 onPageChange,
 onPageSizeChange,
}: DataTablePaginationProps<TData>) {
  return (
      <div className="flex items-center justify-between px-2">
        {/* 🔹 Conteo de filas seleccionadas */}
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length} fila(s) seleccionada(s).
        </div>

        {/* 🔹 Selector de tamaño de página */}
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Filas por página</p>
            <Select
                value={`${manualPagination ? meta?.pageSize ?? 10 : table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                    const newSize = Number(value)
                    if (manualPagination) {
                        onPageSizeChange?.(newSize)
                    } else {
                        table.setPageSize(newSize)
                    }
                }}
            >
                <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        {/* 🔹 Información de página */}
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Página {manualPagination ? meta?.currentPage : table.getState().pagination.pageIndex + 1} de {manualPagination ? meta?.totalPages : table.getPageCount()}
        </div>

        {/* 🔹 Botones de navegación */}
        <div className="flex items-center space-x-2">
          <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => manualPagination ? onPageChange?.(1) : table.setPageIndex(0)}
              disabled={manualPagination ? meta?.currentPage === 1 : !table.getCanPreviousPage()}
          >
            <span className="sr-only">Ir a la primer página</span>
            <DoubleArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => manualPagination ? onPageChange?.((meta?.currentPage ?? 1) - 1) : table.previousPage()}
              disabled={manualPagination ? meta?.currentPage === 1 : !table.getCanPreviousPage()}
          >
            <span className="sr-only">Ir a la página anterior</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => manualPagination ? onPageChange?.((meta?.currentPage ?? 1) + 1) : table.nextPage()}
              disabled={manualPagination ? meta?.currentPage === meta?.totalPages : !table.getCanNextPage()}
          >
            <span className="sr-only">Ir a la siguiente página</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => manualPagination ? onPageChange?.(meta?.totalPages ?? 1) : table.setPageIndex(table.getPageCount() - 1)}
              disabled={manualPagination ? meta?.currentPage === meta?.totalPages : !table.getCanNextPage()}
          >
            <span className="sr-only">Ir a la última página</span>
            <DoubleArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
  )
}
