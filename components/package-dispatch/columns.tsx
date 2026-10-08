import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { PackageDispatch, PackageDispatchResponse, PackageInfo} from "@/lib/types" // Ajusta según tu modelo real
import { Button } from "@/components/ui/button"
import { Eye, Sheet } from "lucide-react"
import { Badge, BadgeProps } from "../ui/badge"
import { Tooltip, TooltipContent } from "../ui/tooltip"
import { TooltipTrigger } from "@radix-ui/react-tooltip"
import { mapToPackageInfo } from "@/lib/utils"
import { formatShortDate } from "@/utils/date.utils"
import { ro } from "date-fns/locale"

const statusMap: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  Pendiente: { label: "Pendiente", variant: "secondary" },
  "En tránsito": { label: "En tránsito", variant: "default" },
  Entregado: { label: "Entregado", variant: "success" },
  Devuelto: { label: "Devuelto", variant: "destructive" },
  Completada: { label: "Completada", variant: "success" },
};

export const columns: ColumnDef<PackageDispatchResponse>[] = [
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
    cell: ({ row }) => {
      const driverName = row.original.driverName;

      if (!driverName) return "Sin Chofer";

      return (
        <span className="font-mono">
          {driverName}
        </span>
      );
    },
  },
  // Dirección
  {
    accessorKey: "totalPackages",
    header: "Paquetes",
    cell: ({ row }) => {
        const totalPackages = row.original.totalPackages;
        
        if (totalPackages === 0) return "Sin paquetes";

        return (
          <span className="font-mono">
            {totalPackages} paquete{totalPackages > 1 ? "s" : ""}
          </span>
        );

    },
  },
  {
    // Fecha REAL de la ruta (`routeDate`, día calendario sin hora). Se formatea del string
    // tal cual: `new Date('YYYY-MM-DD')` es medianoche UTC y en Hermosillo mostraría el día
    // anterior (un lunes aparecía como domingo). Rutas viejas sin routeDate ⇒ createdAt.
    id: "routeDate",
    accessorFn: (row) => row.routeDate ?? row.createdAt ?? null,
    header: "Fecha",
    cell: ({ row }) => {
      const { routeDate, createdAt } = row.original;
      const formatted = routeDate
        ? formatShortDate(routeDate)
        : createdAt
          ? new Date(createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })
          : "N/A";

      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "is315",
    header: "31.5",
    cell: ({ row }) =>
      row.original.is315 ? (
        <Badge variant="default">31.5</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "status",
    header: "Estatus",
    cell: ({ row }) => {
      const rawStatus = row.original.status;

      const status =
        statusMap[rawStatus] ?? {
          label: rawStatus ?? "Desconocido",
          variant: "outline",
        };

      return <Badge variant={status.variant}>{status.label}</Badge>;
    }
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
