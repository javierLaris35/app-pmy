import { ColumnDef } from "@tanstack/react-table"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Driver} from "@/lib/types" // Ajusta según tu modelo real
import { Button } from "@/components/ui/button"
import { Eye, Trash2Icon } from "lucide-react"

export const columns: ColumnDef<Driver>[] = [
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
  {
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "licenseNumber",
    header: "Número de Licencia",
    cell: ({ row }) => row.original.licenseNumber || "-",
  },
  {
    accessorKey: "phoneNumber",
    header: "Número de Teléfono",
    cell: ({ row }) => row.original.phoneNumber || "-",
  },
  {
    accessorKey: "subsidiary",
    header: "Sucursal",
    cell: ({ row }) => row.original?.subsidiary.name || "-",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => row.original.status || "-",
  },
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
