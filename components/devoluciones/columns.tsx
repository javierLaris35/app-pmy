import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { RotateCcw, Package } from "lucide-react"
import { createSortableColumn } from "@/components/data-table/columns"
import { ReturningBatch } from "@/lib/services/returning"

function formatDate(value?: string) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/** Columnas del "Historial de Salidas". La celda de `actions` se inyecta en la página. */
export const columns: ColumnDef<ReturningBatch, any>[] = [
  createSortableColumn<ReturningBatch>(
    "trackingNumber",
    "Número de rastreo",
    (row) => row.trackingNumber,
    (value) => <span className="font-mono font-semibold">{value}</span>,
  ),
  createSortableColumn<ReturningBatch>(
    "date",
    "Fecha",
    (row) => row.date,
    (value) => <span className="text-muted-foreground">{formatDate(value)}</span>,
  ),
  createSortableColumn<ReturningBatch>(
    "drivers",
    "Chofer(es)",
    (row) => (row.drivers && row.drivers.length > 0 ? row.drivers.map((d) => d.name).join(", ") : "—"),
    (value) => <span className="truncate">{value}</span>,
  ),
  createSortableColumn<ReturningBatch>(
    "vehicle",
    "Unidad",
    (row) => row.vehicle?.name || row.vehicle?.code || row.vehicle?.plateNumber || "—",
    (value) => <span>{value}</span>,
  ),
  createSortableColumn<ReturningBatch>(
    "devolutionsCount",
    "Devoluciones",
    (row) => row.devolutionsCount,
    (value) => (
      <Badge variant="secondary" className="gap-1">
        <RotateCcw className="h-3.5 w-3.5" /> {value}
      </Badge>
    ),
  ),
  createSortableColumn<ReturningBatch>(
    "collectionsCount",
    "Recolecciones",
    (row) => row.collectionsCount,
    (value) => (
      <Badge variant="secondary" className="gap-1">
        <Package className="h-3.5 w-3.5" /> {value}
      </Badge>
    ),
  ),
  {
    id: "actions",
    header: "",
    cell: () => null,
  },
]
