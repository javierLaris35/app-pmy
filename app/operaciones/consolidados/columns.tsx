// components/consolidated/columns.ts
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Truck, Plane } from "lucide-react";
import { Consolidated } from "@/lib/types";
import { ConsolidatedDetailDialog } from "@/components/modals/consolidated-shipment-detail-dialog";

export const columns: ColumnDef<Consolidated>[] = [
  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => {
      const raw: string = row.getValue("date")
      
      if (!raw) return "Sin fecha"

      const [year, month, day] = raw.split("T")[0].split("-")
      return `${day}/${month}/${year}`
    }
  },
  {
    accessorKey: "numberOfPackages",
    header: "# Paquetes",
  },
  {
    accessorKey: "subsidiary",
    header: "Sucursal",
    cell: ({ row }) => {
      const subsidiary = row.getValue("subsidiary") as { name: string };
      return <span>{subsidiary?.name ?? "N/A"}</span>;
    },
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => {
      const type = row.getValue("type") as string;
      
      const typeIcons = {
        ordinario: <Truck className="h-5 w-5 text-blue-600" />,
        aereo: <Plane className="h-5 w-5 text-purple-600" />,
      };

      const typeNames = {
        ordinario: "Terrestre",
        aereo: "Aéreo"
      };

      const icon = typeIcons[type.toLowerCase()] || <Truck className="h-5 w-5" />;
      const name = typeNames[type.toLowerCase()] || type;

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              {icon}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tipo: {name}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    header: "POD (Entregados)",
    cell: ({ row }) => {
      const consolidated = row.original;
      const count = consolidated.shipmentCounts?.entregado || 0;
      return <span className="text-green-600 font-semibold">{count}</span>;
    },
  },
  {
    header: "DEX (No Entregados)",
    cell: ({ row }) => {
      const consolidated = row.original;
      const count = consolidated.shipmentCounts?.no_entregado || 0;
      return <span className="text-red-600 font-semibold">{count}</span>;
    },
  },
  {
    header: "En Ruta",
    cell: ({ row }) => {
      const consolidated = row.original;
      const count = consolidated.shipmentCounts?.en_ruta || 0;
      return <span className="text-yellow-600 font-semibold">{count}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge
          variant={status === "completo" ? "default" : "outline"}
          className={status === "completo" ? "bg-green-600" : "bg-yellow-400 text-black"}
        >
          {status === "completo" ? "Completo" : "Incompleto"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => {
      const consolidated = row.original;
      return <ConsolidatedDetailDialog consolidated={consolidated} date={consolidated.date}/>;
    },
  },
];