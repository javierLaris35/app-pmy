// app/(inventory)/inventory/columns.ts
import { ColumnDef } from "@tanstack/react-table";
import { InventoryReport } from "@/lib/types";
import { format, toZonedTime } from "date-fns-tz";

const MX_TZ = "America/Hermosillo";

export const columns: ColumnDef<InventoryReport>[] = [
  {
    id: "createdAt",
    header: "Fecha",
    accessorFn: (r) => r.createdAt,
    cell: ({ row }) => {
      const zoned = toZonedTime(new Date(row.original.createdAt), MX_TZ);
      return format(zoned, "yyyy-MM-dd HH:mm");
    },
    enableSorting: true,
  },
  {
    accessorKey: "reportId",
    header: "Reporte",
    enableSorting: true,
  },
  {
    id: "subsidiaryName",
    header: "Sucursal",
    accessorFn: (r) => r.subsidiary?.name ?? "—",
    enableSorting: true,
  },
  {
    id: "vehicleName",
    header: "Unidad",
    accessorFn: (r) => r.vehicle?.name ?? "—",
    enableSorting: true,
  },
  {
    id: "packagesCount",
    header: "Paquetes",
    accessorFn: (r) => r.packages.length,
    cell: ({ getValue }) => <span className="font-medium">{getValue<number>()}</span>,
    enableSorting: true,
  },
  {
    id: "missingCount",
    header: "Faltantes",
    accessorFn: (r) => r.missingTrackings.length,
    cell: ({ getValue }) => <span className="text-red-600">{getValue<number>()}</span>,
    enableSorting: true,
  },
  {
    id: "unscannedCount",
    header: "Sin escaneo",
    accessorFn: (r) => r.unScannedTrackings.length,
    cell: ({ getValue }) => <span className="text-amber-600">{getValue<number>()}</span>,
    enableSorting: true,
  },
  // Placeholder para acciones (se sobreescribe en la página)
  {
    id: "actions",
    header: "Acciones",
    cell: () => null,
    enableSorting: false,
    enableHiding: false,
  },
];
