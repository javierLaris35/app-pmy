import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type ExpandedState,
  type Row,
  type Table as TanstackTable,
  type PaginationState,
  type OnChangeFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  filters?: {
    columnId: string
    title: string
    options?: { label: string; value: string }[] 
  }[],
  onTableReady?: (table: TanstackTable<TData>) => void
  // NUEVA PROPIEDAD OPCIONAL PARA RENDERIZAR SUB-FILAS
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactNode
  // Paginación server-side (opt-in). Si no se pasan, el comportamiento es client-side como siempre.
  manualPagination?: boolean
  pageCount?: number
  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>
  /**
   * Resetear a la página 1 cuando cambian los datos. Por defecto true (comportamiento
   * histórico). Ponlo en false para datos 100% locales servidos por SWR: si no, cada
   * revalidación (foco de ventana, mutate, etc.) devuelve un nuevo array y la tabla
   * brinca a la página 1, impidiendo navegar/ver el resto de los datos.
   */
  autoResetPageIndex?: boolean
  /** Clase opcional por fila (según los datos de la fila). Ej. resaltar filas con ingreso. */
  rowClassName?: (row: TData) => string | undefined
  /** Estado inicial de filtros de columna (p.ej. para ocultar categorías por defecto). */
  initialColumnFilters?: ColumnFiltersState
  /** Oculta la barra superior (búsqueda global + filtros + opciones de vista). */
  hideToolbar?: boolean
  /** Oculta el texto "N de M fila(s) seleccionada(s)." en la paginación. */
  hideSelectionCount?: boolean
  /** Clic en cualquier parte de la fila (opcional). Los clics en botones/links de la fila no lo disparan. */
  onRowClick?: (row: TData) => void
  /** ¿Es la fila activa? (p. ej. la abierta en un panel lateral) — se resalta. */
  activeRowId?: (row: TData) => boolean
  /**
   * Filtros del lado del servidor (opt-in; úsalo junto con `manualPagination`). La tabla NO
   * filtra en el navegador (solo vería la página actual): la pantalla controla
   * `columnFilters`/`globalFilter`, los manda al backend y pasa las `options` de cada filtro.
   * Sin estos props la tabla filtra en el navegador como siempre.
   */
  manualFiltering?: boolean
  columnFilters?: ColumnFiltersState
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>
  globalFilter?: string
  onGlobalFilterChange?: (value: string) => void
  /** Texto del buscador de la barra (default "Buscar..."). */
  searchPlaceholder?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  filters,
  onTableReady,
  renderSubComponent,
  manualPagination = false,
  pageCount,
  pagination,
  onPaginationChange,
  autoResetPageIndex = true,
  rowClassName,
  initialColumnFilters,
  hideToolbar = false,
  hideSelectionCount = false,
  onRowClick,
  activeRowId,
  manualFiltering = false,
  columnFilters: columnFiltersProp,
  onColumnFiltersChange,
  globalFilter: globalFilterProp,
  onGlobalFilterChange,
  searchPlaceholder,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(initialColumnFilters ?? [])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState<string>("")
  // Filtros controlados por la pantalla (modo servidor) o internos (modo navegador).
  const effectiveColumnFilters = columnFiltersProp ?? columnFilters
  const effectiveGlobalFilter = globalFilterProp ?? globalFilter
  const changeGlobalFilter = onGlobalFilterChange ?? setGlobalFilter
  
  // NUEVO ESTADO PARA CONTROLAR LAS FILAS EXPANDIDAS
  const [expanded, setExpanded] = React.useState<ExpandedState>({})

  // Estado de paginación interno para el modo cliente. IMPORTANTE: TanStack
  // congela la paginación si se le pasa `onPaginationChange: undefined` (eso
  // sobrescribe su updater interno por defecto). Por eso aquí siempre proveemos
  // un estado + setter; solo delegamos a los props cuando es server-side.
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters: effectiveColumnFilters,
      globalFilter: effectiveGlobalFilter,
      expanded,
      pagination: manualPagination ? (pagination ?? internalPagination) : internalPagination,
    },
    // Paginación server-side: react-table no corta los datos y usa pageCount.
    manualPagination,
    pageCount: manualPagination ? (pageCount ?? -1) : undefined,
    onPaginationChange: manualPagination ? (onPaginationChange ?? setInternalPagination) : setInternalPagination,
    autoResetPageIndex,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    manualFiltering,
    onColumnFiltersChange: onColumnFiltersChange ?? setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: (updater) =>
      changeGlobalFilter(typeof updater === "function" ? updater(effectiveGlobalFilter) : updater),
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase()

      const targetCols = [
        "recipientName",
        "recipientAddress",
        "recipientCity",
        "recipientZip",
        "trackingNumber",
        "consNumber", // No. de consolidado (aditivo: solo aplica a tablas que tengan esta columna)
        "pid", // PID/dhlUniqueId (aditivo: solo aplica a tablas que tengan esta columna)
      ]

      const availableCols = row.getAllCells().map((cell) => cell.column.id)

      return targetCols
        .filter((col) => availableCols.includes(col))
        .some((col) => {
          const val = row.getValue(col)
          return val?.toString().toLowerCase().includes(search)
        })
    },
  })

  React.useEffect(() => {
    if (onTableReady) {
      onTableReady(table)
    }
  }, [table, onTableReady])

  return (
    <div className="space-y-4">
      {!hideToolbar && (
        <DataTableToolbar
          table={table}
          filters={filters}
          setGlobalFilter={changeGlobalFilter}
          searchPlaceholder={searchPlaceholder}
        />
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted() as false | "asc" | "desc"
                  // Solo encabezados de texto plano usan el botón de orden nativo.
                  // Los headers personalizados (p.ej. DataTableColumnHeader) ya
                  // traen su propio control de orden, así que se renderizan tal
                  // cual para no anidar <button> dentro de <button>.
                  const headerDef = header.column.columnDef.header
                  const useNativeSort =
                    header.column.getCanSort() && typeof headerDef !== "function"
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : useNativeSort ? (
                        // Encabezado ordenable: clic alterna asc/desc/sin orden.
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 select-none hover:text-foreground transition-colors"
                        >
                          {flexRender(headerDef, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(headerDef, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  {/* FILA PRINCIPAL */}
                  <TableRow
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      onRowClick && "cursor-pointer",
                      activeRowId?.(row.original) && "bg-sky-50 hover:bg-sky-50",
                      rowClassName?.(row.original),
                    )}
                    onClick={
                      onRowClick
                        ? (e) => {
                            if ((e.target as HTMLElement).closest("button, a, input, [role='checkbox'], [role='combobox']")) return;
                            onRowClick(row.original);
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  {/* SUB-FILA (Solo se renderiza si está expandida y si existe la función) */}
                  {row.getIsExpanded() && renderSubComponent && (
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      {/* El colSpan asegura que abarque toda la tabla de extremo a extremo */}
                      <TableCell colSpan={row.getVisibleCells().length} className="p-0 border-b">
                        {renderSubComponent({ row })}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No hay resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} hideSelectionCount={hideSelectionCount} />
    </div>
  )
}