import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Truck, Plane, Info } from "lucide-react";
import { Consolidated } from "@/lib/types";
import { ConsolidatedDetailDialog } from "@/components/modals/consolidated-shipment-detail-dialog";

export const columns: ColumnDef<Consolidated>[] = [
  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => {
      const raw: string = row.getValue("date");
      if (!raw) return "Sin fecha";
      const [year, month, day] = raw.split("T")[0].split("-");
      return `${day}/${month}/${year}`;
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
      const type = (row.getValue("type") as string) || "";
      const typeIcons: Record<string, JSX.Element> = {
        ordinario: <Truck className="h-5 w-5 text-blue-600" />,
        aereo: <Plane className="h-5 w-5 text-purple-600" />,
      };
      const typeNames: Record<string, string> = {
        ordinario: "Terrestre",
        aereo: "Aéreo"
      };
      const icon = typeIcons[type.toLowerCase()] || <Truck className="h-5 w-5" />;
      const name = typeNames[type.toLowerCase()] || type;

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">{icon}</div>
          </TooltipTrigger>
          <TooltipContent><p>Tipo: {name}</p></TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    header: "POD (Entregados)",
    cell: ({ row }) => {
      const count = row.original.shipmentCounts?.entregado || 0;
      return <span className="text-green-600 font-semibold">{count}</span>;
    },
  },
  {
    header: "DEX (Excepciones)",
    cell: ({ row }) => {
      const { dex03 = 0, dex07 = 0, dex08 = 0 } = row.original.shipmentCounts || {};
      const totalDex = dex03 + dex07 + dex08;
      
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              <span className="text-red-600 font-semibold">{totalDex}</span>
              <Info className="h-3 w-3 text-gray-400" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Dirección Incorrecta (03): {dex03}</p>
            <p>Rechazado (07): {dex07}</p>
            <p>No Disponible (08): {dex08}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    header: "En Bodega",
    cell: ({ row }) => {
      const count = row.original.shipmentCounts?.en_bodega || 0;
      return <span className="text-blue-500 font-semibold">{count}</span>;
    },
  },
  {
    header: "En Ruta",
    cell: ({ row }) => {
      const count = row.original.shipmentCounts?.en_ruta || 0;
      return <span className="text-yellow-600 font-semibold">{count}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const { en_ruta = 0, en_bodega = 0, total = 0 } = row.original.shipmentCounts || {};
      
      // Lógica solicitada: Si en_ruta y en_bodega son 0 (y hay paquetes), está completo
      const isComplete = total > 0 && en_ruta === 0 && en_bodega === 0;

      return (
        <Badge
          variant={isComplete ? "default" : "outline"}
          className={isComplete ? "bg-green-600 hover:bg-green-700" : "bg-yellow-400 text-black hover:bg-yellow-500"}
        >
          {isComplete ? "Completo" : "En Proceso"}
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