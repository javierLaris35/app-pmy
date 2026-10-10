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
      const total = row.original.totalPackages ?? 0;
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
    id: "rejected",
    header: "No incluidas",
    cell: ({ row }) => {
      // Escaneadas que no entraron (no existen, otra sucursal, formato). Antes de oct-2026 no se guardaban.
      const n = row.original.rejectedCount ?? 0;
      return n ? <span className="font-mono text-red-600">{n}</span> : <span className="text-muted-foreground">—</span>;
    },
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
