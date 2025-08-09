import { ColumnDef } from "@tanstack/react-table"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Route} from "@/lib/types" // Ajusta según tu modelo real
import { Button } from "@/components/ui/button"
import { Eye, Trash2Icon } from "lucide-react"

export const columns: ColumnDef<Route>[] = [
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
    accessorKey: "code",
    header: "Código (Fedex)",
    cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
  },
  {
    accessorKey: "subdiary",
    header: "Sucursal",
    cell: ({ row }) => row.original.subsidiary.name || "-",
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
