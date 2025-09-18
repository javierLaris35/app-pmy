import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { PackageDispatch, PackageInfo} from "@/lib/types" // Ajusta según tu modelo real
import { Button } from "@/components/ui/button"
import { Eye, Sheet } from "lucide-react"
import { Badge } from "../ui/badge"
import { Tooltip, TooltipContent } from "../ui/tooltip"
import { TooltipTrigger } from "@radix-ui/react-tooltip"
import { mapToPackageInfo } from "@/lib/utils"

export const columns: ColumnDef<PackageDispatch>[] = [
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
    accessorKey: "trackingNumber",
    header: "Número de Seguimiento",
    cell: ({ row }) => <span className="font-medium">{row.original.trackingNumber}</span>,
  },

  {
    accessorKey: "drivers",
    header: "Chofer",
    cell: ({row}) => {
      const drivers = row.original.drivers;

      if(!drivers) return 'Sin Chofer';

      return (
        <span className="font-mono">
          {drivers[0].name}
        </span>
      )
    }
  },
  // Dirección
  {
    accessorKey: "shipments",
    header: "Paquetes",
    cell: ({ row }) => {
        const shipments = row.original.shipments;
        const chargeShipments = row.original.chargeShipments
        const packageDispatchShipments: PackageInfo[] = mapToPackageInfo(shipments, chargeShipments)
        
        if (!packageDispatchShipments || packageDispatchShipments.length === 0) return "Sin paquetes";

        return (
          <span className="font-mono">
            {packageDispatchShipments.length} paquete{packageDispatchShipments.length > 1 ? "s" : ""}
          </span>
        );

    },
  },
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => {
      const rawValue = row.getValue("createdAt");
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
  accessorKey: "status",
  header: "Estatus",
  cell: ({ row }) => {
    const statusMap = {
      PENDING: { label: "Pendiente", variant: "secondary" as const },
      IN_TRANSIT: { label: "En Tránsito", variant: "default" as const },
      DELIVERED: { label: "Entregado", variant: "default" as const },
      RETURNED: { label: "Devuelto", variant: "destructive" as const },
    };

    const statusKey = row.original.status as keyof typeof statusMap;
    const status = statusMap[statusKey] || statusMap.PENDING;

    return <Badge variant={status.variant}>{status.label}</Badge>;
    },
  },

  {
    accessorKey: "estimatedDelivery",
    header: "Entrega Estimada",
    cell: ({ row }) => {
      const rawValue = row.getValue("estimatedDelivery");
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
  // Acciones
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => console.log("Edit vehicle", row.original)}>
          <Eye className="h-4 w-4" />
        </Button>
        <Tooltip>
            <TooltipTrigger>
                <Button variant="default" className="h-8 w-8 p-0 text-white bg-green-900" onClick={() => console.log("Edit vehicle", row.original)}>
                    <Sheet className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                Generar Excel
            </TooltipContent>
        </Tooltip>
      </div>
    ),
  },
]
