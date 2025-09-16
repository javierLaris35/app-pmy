import * as React from "react"
import {
    type ColumnDef,
    type ColumnFiltersState,
    type SortingState,
    type VisibilityState,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    useReactTable,
    type Table,
    flexRender,
} from "@tanstack/react-table"

import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    manualPagination?: boolean
    meta?: { totalPages: number; currentPage: number; pageSize: number; totalItems: number }
    onPageChange?: (page: number) => void
    onPageSizeChange?: (size: number) => void
    remoteFilters: Record<string, any>
    setRemoteFilters: React.Dispatch<React.SetStateAction<Record<string, any>>>
}

export function DataTable<TData, TValue>({
                                             columns,
                                             data,
                                             manualPagination = false,
                                             meta,
                                             onPageChange,
                                             onPageSizeChange,
                                             remoteFilters,
                                             setRemoteFilters,
                                         }: DataTableProps<TData, TValue>) {
    const [rowSelection, setRowSelection] = React.useState({})
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = React.useState<string>("")

    const table = useReactTable({
        data,
        columns,
        state: { sorting, columnVisibility, rowSelection, columnFilters, globalFilter, pagination: { pageIndex: manualPagination ? (meta?.currentPage ?? 1) - 1 : 0, pageSize: manualPagination ? meta?.pageSize ?? 10 : 10 } },
        manualPagination,
        pageCount: manualPagination ? meta?.totalPages ?? -1 : undefined,
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        ...(manualPagination ? {} : { getPaginationRowModel: getPaginationRowModel() }),
        globalFilterFn: (row, columnId, filterValue) => {
            const search = filterValue.toLowerCase()
            const targetCols = ["recipientName", "recipientAddress", "recipientCity", "recipientZip", "trackingNumber"]
            const availableCols = row.getAllCells().map((c) => c.column.id)
            return targetCols.filter((col) => availableCols.includes(col)).some((col) => {
                const val = row.getValue(col)
                return val?.toString().toLowerCase().includes(search)
            })
        },
    })

    return (
        <div className="space-y-4">
            <DataTableToolbar
                table={table}
                setGlobalFilter={setGlobalFilter}
                remoteFilters={remoteFilters}
                setRemoteFilters={setRemoteFilters}
            />

            <div className="rounded-md border">
                <UiTable>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {!header.isPlaceholder && flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>

                    <TableBody>
                        {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                ))}
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">No hay resultados.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </UiTable>
            </div>

            <DataTablePagination
                table={table}
                manualPagination={manualPagination}
                meta={meta}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
            />
        </div>
    )
}
