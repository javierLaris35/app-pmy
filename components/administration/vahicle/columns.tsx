import { ColumnDef } from "@tanstack/react-table"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Subsidiary, Vehicles } from "@/lib/types" // Ajusta según tu modelo real
import { Button } from "@/components/ui/button"
import { Eye, Trash2Icon } from "lucide-react"

export const columns: ColumnDef<Vehicles>[] = [
  // Columna de selección
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Seleccionar todas"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Seleccionar fila"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  // Nombre
  {
    accessorKey: "brand",
    header: "Marca",
    cell: ({ row }) => <span className="font-medium">{row.original.brand}</span>,
  },

  // Dirección
  {
    accessorKey: "model",
    header: "Modelo",
    cell: ({ row }) => row.original.model || "-",
  },

  { 
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => row.original.name || "-",
  },

  {
    accessorKey: "code",
    header: "Código",
    cell: ({ row }) => row.original.code || "-",
  },

  { 
    accessorKey: "capacity",
    header: "Capacidad",
    cell: ({ row }) => row.original.capacity || "-",
  },

  { 
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => row.original.type || "-",
  },

  {
    accessorKey: "plateNumber",
    header: "Número de Placa",
    cell: ({ row }) => row.original.plateNumber || "-",
  },
  { 
    accessorKey: "kms",
    header: "Kilómetros",
    cell: ({ row }) => row.original.kms || "-",
  },
  {
    accessorKey: "lastMaintenanceDate",
    header: "Último Mantenimiento",
    cell: ({ row }) => {
      const rawValue = row.getValue("lastMaintenanceDate");
      const date = rawValue ? new Date(rawValue as string) : null;

      const formatted = date
        ? date.toLocaleString("es-MX", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "N/A";

      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "nextMaintenanceDate",
    header: "Siguiente Mantenimiento",
    cell: ({ row }) => {
      const rawValue = row.getValue("nextMaintenanceDate");
      const date = rawValue ? new Date(rawValue as string) : null;

      const formatted = date
        ? date.toLocaleString("es-MX", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
          })
        : "N/A";

      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => row.original.status || "-",
  },

  // Acciones
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => console.log("Edit vehicle", row.original)}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="default" className="h-8 w-8 p-0" onClick={() => console.log("Edit vehicle", row.original)}>
          <Trash2Icon className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
]
