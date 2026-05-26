import { ColumnDef } from "@tanstack/react-table"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Subsidiary } from "@/lib/types"
import { Pencil, Trash2, Building2, Store, WarehouseIcon } from "lucide-react"

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
    accessorKey: "isWarehouse",
    header: "Tipo",
    cell: ({ row }) => {
      const rawValue = row.original.isWarehouse;
      
      // Si viene como un objeto Buffer [0] o [1]
      let isWarehouse = false;
      if (rawValue && typeof rawValue === 'object' && 'data' in rawValue) {
        isWarehouse = (rawValue as any).data[0] === 1;
      } else {
        // Caso normal si a veces llega como booleano o número
        isWarehouse = Boolean(rawValue);
      }
      
      return isWarehouse ? (
        <span className="flex items-center w-fit gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-md">
          <WarehouseIcon className="w-3 h-3" /> Bodega
        </span>
      ) : (
        <span className="flex items-center w-fit gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">
          <Store className="w-3 h-3" /> Sucursal
        </span>
      )
    },
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
    accessorKey: "fedexCostPackage",
    header: "Costo FedEx",
    cell: ({ row }) => `$${Number(row.original.fedexCostPackage ?? 0).toFixed(2)}`,
  },
  {
    accessorKey: "dhlCostPackage",
    header: "Costo DHL",
    cell: ({ row }) => `$${Number(row.original.dhlCostPackage ?? 0).toFixed(2)}`,
  },
  {
    accessorKey: "chargeCost",
    header: "Costo Carga",
    cell: ({ row }) => `$${Number(row.original.chargeCost ?? 0).toFixed(2)}`,
  },
  {
    accessorKey: "tycoAmount",
    header: "Monto Tyco",
    cell: ({ row }) => `$${Number(row.original.tycoAmount ?? 0).toFixed(2)}`,
  },
  {
    accessorKey: "airportAmount",
    header: "Monto Aeropuerto",
    cell: ({ row }) => `$${Number(row.original.airportAmount ?? 0).toFixed(2)}`,
  },
  {
    accessorKey: "secondAbordAmount",
    header: "Monto 2do Abordo",
    cell: ({ row }) => `$${Number(row.original.secondAbordAmount ?? 0).toFixed(2)}`,
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