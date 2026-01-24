import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { UnloadingResponse} from "@/lib/types" // Ajusta según tu modelo real
import { Button } from "@/components/ui/button"
import { Eye, Sheet } from "lucide-react"
import { Tooltip, TooltipContent } from "@/components/ui/tooltip"
import { TooltipTrigger } from "@radix-ui/react-tooltip"

export const columns: ColumnDef<UnloadingResponse>[] = [
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
    accessorKey: "trackingNumber",
    header: "Número de Seguimiento",
    cell: ({ row }) => <span className="font-medium">{row.original.trackingNumber}</span>,
  },

  {
    accessorKey: "vehicle",
    header: "Unidad",
    cell: ({ row }) => <span className="font-medium">{row.original?.vehicle?.name}</span>,
  },
  {
    accessorKey: "totalPackages", // O puedes usar "shipments"
    header: "Paquetes",
    cell: ({ row }) => {
      // Sumamos los dos tipos de paquetes que enviamos desde el backend
      const total = (row.original.shipments || 0) + (row.original.chargeShipments || 0);

      if (total === 0) {
        return (
          <span className="text-gray-400 font-mono">
            0 Paquetes
          </span>
        );
      }

      return (
        <span className="font-semibold font-mono">
          {total} paquete{total !== 1 ? "s" : ""}
        </span>
      );
    },
  },
  {
    accessorKey: "missingTrackings",
    header: "Guias Faltates",
    cell: ({ row }) => {
        const missingTrackings = row.original.missingTrackings;
        
        if (!missingTrackings || missingTrackings.length === 0) return (
          <span className="font-mono">
            0 Guias 
          </span>
        );

        return (
          <span className="font-mono">
            {missingTrackings.length} paquete{missingTrackings.length > 1 ? "s" : ""}
          </span>
        );

    },
  },

  {
    accessorKey: "unScannedTrackings",
    header: "Guias sin Escaneo",
    cell: ({ row }) => {
        const unScannedTrackings = row.original.unScannedTrackings;
        
        if (!unScannedTrackings || unScannedTrackings.length === 0) return (
          <span className="font-mono">
            0 Guias 
          </span>
        );

        return (
          <span className="font-mono">
            {unScannedTrackings.length} paquete{unScannedTrackings.length > 1 ? "s" : ""}
          </span>
        );

    },
  },

  {
    accessorKey: "subsidiary",
    header: "Sucursal",
    cell: ({ row }) => <span className="font-medium">{row.original?.subsidiary?.name}</span>,
  },

  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => {
      const rawValue = row.getValue("date");
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
