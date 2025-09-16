// app/(inventory)/inventory/columns.ts
import { ColumnDef } from "@tanstack/react-table";
import { Inventory, PackageInfo } from "@/lib/types";
import { format, toZonedTime } from "date-fns-tz";
import { mapToPackageInfo } from "@/lib/utils";

const MX_TZ = "America/Hermosillo";

export const columns: ColumnDef<Inventory>[] = [
  {
    id: "trackingNumber",
    header: "Número de Seguimiento",
    accessorFn: (r) => r.trackingNumber ?? "—",
    enableSorting: true,
  },
  {
    id: "subsidiaryName",
    header: "Sucursal",
    accessorFn: (r) => r.subsidiary?.name ?? "—",
    enableSorting: true,
  },
  {
    id: "packages",
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
    enableSorting: true,
  },
  {
    id: "missingTrackings",
    header: "Faltantes",
    cell: ({ row }) => {
      if(!row.original.missingTrackings || row.original.missingTrackings.length === 0) return "Sin paquetes";
      return (
        <span className="font-mono">
          {row.original.missingTrackings.length}
        </span>
      )
    }
  },
  {
    id: "unScannedTrackings",
    header: "Sin escaneo",
    cell: ({ row }) => {
      if(!row.original.unScannedTrackings || row.original.unScannedTrackings.length === 0) return "Sin paquetes";
      return (
        <span className="font-mono">
          {row.original.unScannedTrackings.length}
        </span>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: "inventoryDate",
    header: "Fecha",
    cell: ({ row }) => {
      const rawValue = row.getValue("inventoryDate");
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
    id: "actions",
    header: "Acciones",
    cell: () => null,
    enableSorting: false,
    enableHiding: false,
  },
];
