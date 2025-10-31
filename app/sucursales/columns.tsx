import { ColumnDef } from "@tanstack/react-table"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Subsidiary } from "@/lib/types"
import { Pencil, Trash2 } from "lucide-react"

// Definir el tipo para las funciones que necesitas
interface ColumnHelpers {
  handleToggleActive: (subsidiary: Subsidiary, checked: boolean) => void
  openEditSucursalDialog: (subsidiary: Subsidiary) => void
  handleDeleteSubsidiary: (subsidiary: Subsidiary) => void
  isSaving?: boolean
  isDeleting?: boolean
}

// Función que retorna las columnas con las funciones inyectadas
export const getColumns = ({
  handleToggleActive,
  openEditSucursalDialog,
  handleDeleteSubsidiary,
  isSaving = false,
  isDeleting = false
}: ColumnHelpers): ColumnDef<Subsidiary>[] => [
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
    accessorKey: "address",
    header: "Dirección",
    cell: ({ row }) => row.original.address || "-",
  },
  {
    accessorKey: "phone",
    header: "Teléfono",
    cell: ({ row }) => row.original.phone || "-",
  },
  {
    accessorKey: "officeManager",
    header: "Encargado",
    cell: ({ row }) => row.original.officeManager || "-",
  },
  {
    accessorKey: "officeEmail",
    header: "Email Oficina",
    cell: ({ row }) => row.original.officeEmail || "-",
  },
  {
    accessorKey: "fedexCostPackage",
    header: "Costo FedEx",
    cell: ({ row }) => `$${row.original.fedexCostPackage || "0.00"}`,
  },
  {
    accessorKey: "dhlCostPackage",
    header: "Costo DHL",
    cell: ({ row }) => `$${row.original.dhlCostPackage || "0.00"}`,
  },
  {
    accessorKey: "chargeCost",
    header: "Costo Carga",
    cell: ({ row }) => `$${row.original.chargeCost || "0.00"}`,
  },
  {
    accessorKey: "active",
    header: "Estado",
    cell: ({ row }) => (
      <Switch
        id={`switch-${row.original.id}`}
        checked={row.original.active}
        onCheckedChange={(checked) => handleToggleActive(row.original, checked)}
        disabled={isSaving}
      />
    ),
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => (
      <div className="flex gap-2 justify-end">
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => openEditSucursalDialog(row.original)}
          disabled={isSaving}
          title="Editar sucursal"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          className="h-8 w-8 p-0"
          onClick={() => handleDeleteSubsidiary(row.original)}
          disabled={isDeleting || isSaving}
          title="Eliminar sucursal"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
]