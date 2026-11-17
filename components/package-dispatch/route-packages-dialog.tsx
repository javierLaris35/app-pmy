"use client"

import { useMemo, useRef, useState } from "react"
import type { ColumnDef, ColumnFiltersState, Table as TanstackTable } from "@tanstack/react-table"
import { FileSpreadsheet } from "lucide-react"
import { DataTable } from "@/components/data-table/data-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PmySpinner } from "@/components/ui/pmy-loader"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { CommitBucket, SuggestedPackage } from "@/lib/services/route-suggestions"
import { BUCKET_LABEL, exportSuggestedPackagesExcel, formatCommitDate, statusLabel } from "@/lib/services/route-suggestions-export"

const BUCKETS: { key: CommitBucket; label: string; num: string; chip: string; bar: string }[] = [
  { key: "vencido", label: "vencidos", num: "text-red-800", chip: "bg-red-600 text-white", bar: "bg-red-800" },
  { key: "hoy", label: "hoy", num: "text-red-700", chip: "bg-red-100 text-red-700", bar: "bg-red-500" },
  { key: "manana", label: "mañana", num: "text-amber-700", chip: "bg-amber-100 text-amber-800", bar: "bg-amber-500" },
  { key: "despues", label: "después", num: "text-slate-700", chip: "bg-slate-100 text-slate-700", bar: "bg-slate-400" },
  { key: "sin_fecha", label: "sin fecha", num: "text-slate-600", chip: "border bg-background text-slate-600", bar: "bg-slate-200" },
]
const CHIP = Object.fromEntries(BUCKETS.map((b) => [b.key, b.chip])) as Record<CommitBucket, string>
const URGENCY: Record<CommitBucket, number> = { vencido: 0, hoy: 1, manana: 2, despues: 3, sin_fecha: 4 }

/** Filtro de opciones múltiples (los filtros de la barra mandan un arreglo de valores). */
const inValues = (row: { getValue: (id: string) => unknown }, id: string, values: string[]) => !values?.length || values.includes(String(row.getValue(id)))

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subsidiaryName?: string
  packages: SuggestedPackage[]
  /** Si viene, se muestran los botones para crear la salida con todos o con los seleccionados. */
  onCreate?: (codes: string[]) => void
}

/**
 * "Ver" de una ruta sugerida: tabla completa de sus paquetes en bodega con contadores que filtran,
 * buscador, filtros, columnas, exportar a Excel y crear la salida con todos o con los seleccionados.
 */
export function RoutePackagesDialog({ open, onOpenChange, title, subsidiaryName, packages, onCreate }: Props) {
  const { toast } = useToast()
  const tableRef = useRef<TanstackTable<SuggestedPackage> | null>(null)
  const [filters, setFilters] = useState<ColumnFiltersState>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  const counts = useMemo(() => {
    const c: Record<CommitBucket, number> = { vencido: 0, hoy: 0, manana: 0, despues: 0, sin_fecha: 0 }
    for (const p of packages) c[p.bucket]++
    return c
  }, [packages])

  const bucketFilter = (filters.find((f) => f.id === "bucket")?.value as string[] | undefined) ?? []
  const toggleBucket = (b: CommitBucket) =>
    setFilters((prev) => {
      const rest = prev.filter((f) => f.id !== "bucket")
      const next = bucketFilter.length === 1 && bucketFilter[0] === b ? [] : [b]
      return next.length ? [...rest, { id: "bucket", value: next }] : rest
    })

  const filteredRows = () => tableRef.current?.getFilteredRowModel().rows.map((r) => r.original) ?? packages
  const allFilteredSelected = () => {
    const rows = filteredRows()
    return rows.length > 0 && rows.every((p) => selected.has(p.scanCode))
  }

  const columns = useMemo<ColumnDef<SuggestedPackage>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <Checkbox
            checked={allFilteredSelected() ? true : selected.size > 0 ? "indeterminate" : false}
            onCheckedChange={() => setSelected(allFilteredSelected() ? new Set() : new Set(filteredRows().map((p) => p.scanCode)))}
            aria-label="Seleccionar todos los que se ven"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selected.has(row.original.scanCode)}
            onCheckedChange={() =>
              setSelected((prev) => {
                const next = new Set(prev)
                next.has(row.original.scanCode) ? next.delete(row.original.scanCode) : next.add(row.original.scanCode)
                return next
              })
            }
            aria-label="Seleccionar paquete"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      { accessorKey: "trackingNumber", header: "Guía", cell: ({ getValue }) => <span className="font-semibold tabular-nums">{String(getValue())}</span> },
      { id: "carrier", accessorFn: (p) => (p.carrier === "dhl" ? "DHL" : "FedEx"), header: "Paquetería", filterFn: inValues },
      { id: "kind", accessorFn: (p) => (p.kind === "charge" ? "Carga" : "Paquete"), header: "Tipo", filterFn: inValues },
      { id: "recipientZip", accessorFn: (p) => p.zip ?? "", header: "CP", filterFn: inValues },
      { id: "recipientName", accessorFn: (p) => p.recipientName ?? "", header: "Destinatario", cell: ({ getValue }) => <span className="block max-w-[180px] truncate">{String(getValue()) || "—"}</span> },
      {
        id: "recipientAddress",
        accessorFn: (p) => p.recipientAddress ?? "",
        header: "Dirección",
        cell: ({ getValue }) => (
          <span className="block max-w-[260px] truncate" title={String(getValue())}>
            {String(getValue()) || "Sin dirección"}
          </span>
        ),
      },
      {
        id: "bucket",
        accessorFn: (p) => p.bucket,
        header: "Vence",
        filterFn: inValues,
        sortingFn: (a, b) =>
          URGENCY[a.original.bucket] - URGENCY[b.original.bucket] || (a.original.commitDateTime ?? "").localeCompare(b.original.commitDateTime ?? ""),
        cell: ({ row }) => (
          <span className={cn("whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold", CHIP[row.original.bucket])}>
            {BUCKET_LABEL[row.original.bucket]} {formatCommitDate(row.original.commitDateTime)}
          </span>
        ),
      },
      { accessorKey: "daysInWarehouse", header: "Días en bodega", cell: ({ getValue }) => <span className="tabular-nums">{Number(getValue())}</span> },
      { id: "status", accessorFn: (p) => p.status, header: "Estatus", filterFn: inValues, cell: ({ row }) => statusLabel(row.original.status) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected],
  )

  const option = (values: string[], label: (v: string) => string = (v) => v) => [...new Set(values)].sort().map((v) => ({ value: v, label: label(v) }))
  const tableFilters = useMemo(
    () => [
      { columnId: "bucket", title: "Vencimiento", options: BUCKETS.filter((b) => counts[b.key] > 0).map((b) => ({ value: b.key, label: BUCKET_LABEL[b.key] })) },
      { columnId: "recipientZip", title: "CP", options: option(packages.map((p) => p.zip ?? "").filter(Boolean)) },
      { columnId: "carrier", title: "Paquetería", options: option(packages.map((p) => (p.carrier === "dhl" ? "DHL" : "FedEx"))) },
      { columnId: "kind", title: "Tipo", options: option(packages.map((p) => (p.kind === "charge" ? "Carga" : "Paquete"))) },
    ],
    [packages, counts],
  )

  const exportExcel = async () => {
    const rows = selected.size ? packages.filter((p) => selected.has(p.scanCode)) : filteredRows()
    if (!rows.length) return
    setExporting(true)
    try {
      await exportSuggestedPackagesExcel(rows, { title, subsidiaryName })
    } catch {
      toast({ title: "No se pudo exportar", description: "Intenta de nuevo.", variant: "destructive" })
    } finally {
      setExporting(false)
    }
  }

  const close = (o: boolean) => {
    if (!o) {
      setSelected(new Set())
      setFilters([])
    }
    onOpenChange(o)
  }

  const total = Math.max(packages.length, 1)

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-3 overflow-hidden sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{packages.length} paquetes en bodega · clic en un contador para ver solo esos</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {BUCKETS.filter((b) => counts[b.key] > 0).map((b) => {
              const active = bucketFilter.length === 1 && bucketFilter[0] === b.key
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => toggleBucket(b.key)}
                  className={cn("min-w-[84px] rounded-lg border px-3 py-1.5 text-left transition-colors hover:bg-muted", active && "border-primary ring-1 ring-primary")}
                >
                  <div className={cn("text-xl font-bold leading-tight tabular-nums", b.num)}>{counts[b.key]}</div>
                  <div className="text-[11px] text-muted-foreground">{b.label}</div>
                </button>
              )
            })}
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            {BUCKETS.filter((b) => counts[b.key] > 0).map((b) => (
              <span key={b.key} className={b.bar} style={{ width: `${(counts[b.key] / total) * 100}%` }} />
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <DataTable
            columns={columns}
            data={packages}
            filters={tableFilters}
            columnFilters={filters}
            onColumnFiltersChange={setFilters}
            searchPlaceholder="Buscar guía, destinatario, dirección o CP"
            onTableReady={(t) => (tableRef.current = t)}
            initialSorting={[{ id: "bucket", desc: false }]}
            initialPageSize={25}
            hideSelectionCount
            dense
            toolbarExtra={
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={exportExcel} disabled={exporting}>
                {exporting ? <PmySpinner className="h-3.5 w-3.5" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                {selected.size ? `Exportar seleccionados (${selected.size})` : "Exportar Excel"}
              </Button>
            }
          />
        </div>

        {onCreate && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-xs text-muted-foreground">
              {selected.size} de {packages.length} seleccionados
            </span>
            <Button variant="outline" className="ml-auto h-9" onClick={() => onCreate(packages.map((p) => p.scanCode))}>
              Crear salida con todos ({packages.length})
            </Button>
            <Button className="h-9" disabled={selected.size === 0} onClick={() => onCreate([...selected])}>
              Crear salida con seleccionados ({selected.size})
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
