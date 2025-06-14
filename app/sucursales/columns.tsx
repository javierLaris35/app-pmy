import { ColumnDef } from "@tanstack/react-table"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Subsidiary } from "@/lib/types" // Ajusta según tu modelo real

export const columns: ColumnDef<Subsidiary>[] = [
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
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },

  // Dirección
  {
    accessorKey: "direccion",
    header: "Dirección",
    cell: ({ row }) => row.original.address || "-",
  },

  // Teléfono
  {
    accessorKey: "telefono",
    header: "Teléfono",
    cell: ({ row }) => row.original.phone || "-",
  },

  // Encargado
  {
    accessorKey: "encargado",
    header: "Encargado",
    cell: ({ row }) => row.original.officeManager || "-",
  },

  // Estado (activo)
  {
    accessorKey: "active",
    header: "Estado",
    cell: ({ row }) => (
      <Switch
        id={`switch-${row.original.id}`}
        checked={row.original.active}
        onCheckedChange={(checked) => handleToggleActive(row.original, checked)}
      />
    ),
  },

  // Acciones
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => (
      <div className="flex gap-2">
        <button
          className="text-sm text-blue-600 hover:underline"
          onClick={() => openEditSucursalDialog(row.original)}
        >
          Editar
        </button>
        <button
          className="text-sm text-red-600 hover:underline"
          onClick={() => console.log("Eliminar", row.original)}
        >
          Eliminar
        </button>
      </div>
    ),
  },
]
