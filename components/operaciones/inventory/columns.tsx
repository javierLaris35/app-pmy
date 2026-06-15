// app/(inventory)/inventory/columns.ts
import { ColumnDef } from "@tanstack/react-table";
import { Inventory } from "@/lib/types";

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
      // El listado ahora devuelve conteos (no arrays) para no desbordar memoria.
      const total = (row.original as any).totalPackages ?? 0;
      if (!total) return "Sin paquetes";
      return (
        <span className="font-mono">
          {total} paquete{total > 1 ? "s" : ""}
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
    id: "type",
    header: "Tipo",
    accessorFn: (r) => r.type ?? "—",
    cell: ({ row }) => {
      const type = row.getValue("type") as string;
      
      // Mapeo de traducciones
      const typeMap: Record<string, string> = {
        initial: "Inicial",
        dex: "DEX",
        final: "Final"
      };

      // Retorna el valor mapeado, o el valor original si no está en el mapa, o "—" si no hay valor
      const displayType = typeMap[type] || type || "—";

      return (
        <span className="capitalize">
          {displayType}
        </span>
      );
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
