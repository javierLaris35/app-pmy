import { ColumnDef } from "@tanstack/react-table";
import { Inventory } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = { initial: "Inicial", dex: "DEX", final: "Final" };

const fmtDateTime = (v?: string | null) =>
  v
    ? new Date(v).toLocaleString("es-MX", {
        timeZone: "America/Hermosillo",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "—";

/**
 * Historial de inventarios. Los `id` son las columnas que el backend sabe ordenar (el orden es de
 * TODO el historial, no solo de la página): trackingNumber, type, createdBy, totalPackages,
 * rejectedCount, inventoryDate.
 */
export const columns: ColumnDef<Inventory>[] = [
  {
    id: "trackingNumber",
    header: "Folio",
    accessorFn: (r) => r.trackingNumber ?? "—",
    cell: ({ row }) => <span className="font-mono">{row.original.trackingNumber ?? "—"}</span>,
    enableSorting: true,
  },
  {
    id: "type",
    header: "Tipo",
    accessorFn: (r) => r.type ?? "",
    cell: ({ row }) => TYPE_LABEL[row.original.type ?? ""] ?? row.original.type ?? "—",
    enableSorting: true,
  },
  {
    id: "createdBy",
    header: "Hecho por",
    accessorFn: (r) => r.createdByName ?? "",
    cell: ({ row }) => row.original.createdByName ? <span className="whitespace-nowrap">{row.original.createdByName}</span> : <span className="text-muted-foreground">—</span>,
    enableSorting: true,
  },
  {
    id: "totalPackages",
    header: "Paquetes",
    accessorFn: (r) => r.totalPackages ?? 0,
    cell: ({ row }) => {
      // El listado devuelve conteos (no arrays) para no desbordar memoria.
      const total = row.original.totalPackages ?? 0;
      return total ? <span className="font-mono tabular-nums">{total}</span> : <span className="text-muted-foreground">Sin paquetes</span>;
    },
    enableSorting: true,
  },
  {
    id: "rejectedCount",
    header: "No incluidas",
    accessorFn: (r) => r.rejectedCount ?? 0,
    cell: ({ row }) => {
      // Escaneadas que no entraron (no existen, otra sucursal, formato). Antes de oct-2026 no se guardaban.
      const n = row.original.rejectedCount ?? 0;
      return n ? <span className="font-mono tabular-nums text-red-600">{n}</span> : <span className="text-muted-foreground">—</span>;
    },
    enableSorting: true,
  },
  {
    id: "inventoryDate",
    header: "Fecha y hora",
    accessorFn: (r) => r.inventoryDate,
    cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{fmtDateTime(row.original.inventoryDate)}</span>,
    enableSorting: true,
  },
  {
    // La pantalla pone la celda (abre el detalle filtrado en el grupo que se toque).
    id: "compare",
    header: "Contra el anterior",
    cell: () => null,
    enableSorting: false,
  },
  {
    id: "actions",
    header: "Acciones",
    cell: () => null,
    enableSorting: false,
    enableHiding: false,
  },
];
