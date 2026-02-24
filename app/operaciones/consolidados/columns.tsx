import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Package, 
  Percent, 
  TrendingUp,
  Truck,
  Warehouse,
  Plane,
  CircleDashed,
  ArrowUpRight
} from "lucide-react";
import { ConsolidatedDto } from "@/lib/types"; 
import { ConsolidatedDetailDialog } from "@/components/modals/consolidated-shipment-detail-dialog";

export const columns: ColumnDef<ConsolidatedDto>[] = [
  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => {
      const date = new Date(row.original.date);
      return (
        <div className="flex flex-col min-w-[100px]">
          <span className="font-bold text-base text-slate-900 leading-none mb-1">
            {date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-tighter">
            {row.original.consNumber}
          </span>
        </div>
      );
    }
  },
  {
    header: "Tipo",
    cell: ({ row }) => {
      const type = row.original.type?.toLowerCase() || "";
      const isAereo = type.includes("aereo");
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex justify-center p-1">
              {isAereo ? (
                <Plane className="h-6 w-6 text-purple-600 stroke-[2.5]" />
              ) : (
                <Truck className="h-6 w-6 text-blue-600 stroke-[2.5]" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent className="font-bold">
            {isAereo ? "Aéreo" : "Terrestre"}
          </TooltipContent>
        </Tooltip>
      );
    }
  },
  {
    header: "Volumen",
    cell: ({ row }) => {
      const { total, countNormal, countF2 } = row.original.shipmentCounts;
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-500" />
            <span className="font-black text-lg leading-none">{total}</span>
          </div>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold border-slate-300">N: {countNormal}</Badge>
            {countF2 > 0 && (
              <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 font-bold">F2: {countF2}</Badge>
            )}
          </div>
        </div>
      );
    }
  },
  {
    header: "POD",
    cell: ({ row }) => {
      const { entregado } = row.original.shipmentCounts;
      return (
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle2 className="h-5 w-5 stroke-[3]" />
            <span className="text-xl font-black leading-none">{entregado}</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-700/70 uppercase">Entregados</span>
        </div>
      );
    }
  },
  {
    header: "DEX / DEV",
    cell: ({ row }) => {
      const { dex03, dex07, dex08, totalDex, totalDevueltos } = row.original.shipmentCounts;
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-red-500">
              <AlertCircle className="h-5 w-5 stroke-[3]" />
              <span className="text-xl font-black leading-none">{totalDex}</span>
              <span className="text-[9px] font-bold uppercase opacity-70 italic ml-0.5">Dex</span>
            </div>
            {/* AGREGADO: Columna FedEx dentro de DEX para ahorrar espacio */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-blue-600 border-l pl-3 cursor-help">
                  <ArrowUpRight className="h-4 w-4 stroke-[3]" />
                  <span className="text-lg font-black leading-none">{totalDevueltos}</span>
                  <span className="text-[9px] font-bold uppercase opacity-70 ml-0.5 tracking-tighter">FedEx</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Total devueltos físicamente a FedEx</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex gap-1">
            <Tooltip><TooltipTrigger><Badge variant="outline" className="text-[10px] px-1 h-4 text-red-600 border-red-200 font-bold bg-red-50">03:{dex03}</Badge></TooltipTrigger><TooltipContent>Dirección Incorrecta</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger><Badge variant="outline" className="text-[10px] px-1 h-4 text-red-600 border-red-200 font-bold bg-red-50">07:{dex07}</Badge></TooltipTrigger><TooltipContent>Rechazado</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger><Badge variant="outline" className="text-[10px] px-1 h-4 text-red-600 border-red-200 font-bold bg-red-50">08:{dex08}</Badge></TooltipTrigger><TooltipContent>No Disponible</TooltipContent></Tooltip>
          </div>
        </div>
      );
    }
  },
  {
    header: "S.I. / Ubicación",
    cell: ({ row }) => {
      const { pendiente, en_ruta, en_bodega, other } = row.original.shipmentCounts;
      return (
        <div className="flex flex-col gap-1.5 min-w-[100px]">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`flex items-center gap-1.5 cursor-help ${pendiente > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                <Clock className="h-5 w-5 stroke-[3]" />
                <span className="text-lg font-black leading-none">{pendiente}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="font-bold">Sin Intento (Pendientes)</TooltipContent>
          </Tooltip>
          
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-slate-600 cursor-help bg-slate-50 border rounded px-1">
                  <Truck className="h-3 w-3 text-blue-500" /> {en_ruta}
                </span>
              </TooltipTrigger>
              <TooltipContent>En Ruta</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-slate-600 cursor-help bg-slate-50 border rounded px-1">
                  <Warehouse className="h-3 w-3 text-amber-500" /> {en_bodega}
                </span>
              </TooltipTrigger>
              <TooltipContent>En Bodega</TooltipContent>
            </Tooltip>
            {/* AGREGADO: Alerta de Desconocidos */}
            {other > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-0.5 text-[11px] font-bold text-red-600 cursor-help bg-red-50 border border-red-200 rounded px-1 animate-pulse">
                    <AlertCircle className="h-3 w-3" /> {other}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="bg-red-600 text-white font-bold italic">Estatus Desconocido / Alerta Operativa</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      );
    }
  },
  {
    header: "KPIs / Porcentajes",
    cell: ({ row }) => {
      const { porcEfectividad, porcEfectividadEntrega, porcRendimientoIntentos } = row.original.shipmentCounts;
      
      const getProgressColor = (val: number) => {
        if (val >= 98) return "bg-emerald-600";
        if (val >= 90) return "bg-emerald-500";
        if (val >= 75) return "bg-amber-500";
        return "bg-red-500";
      };

      return (
        <div className="flex flex-col gap-3 min-w-[150px]">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="flex items-center gap-1 font-medium text-slate-500 uppercase">
                <Percent className="h-3.5 w-3.5" /> Efectividad Total
              </span>
              <span className="font-black text-base text-slate-900">{porcEfectividad}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div 
                className={`h-full transition-all ${getProgressColor(porcEfectividad)}`} 
                style={{ width: `${porcEfectividad}%` }} 
              />
            </div>
          </div>

          <div className="space-y-0.5 bg-slate-50 p-1 rounded border border-dashed border-slate-200">
            <div className="flex justify-between items-center text-[10px]">
              <span className="flex items-center gap-1 font-medium text-emerald-600 uppercase">
                <TrendingUp className="h-3 w-3" /> Efec. Entrega: {porcEfectividadEntrega}%
              </span>
              <span className="flex items-center gap-1 font-medium text-blue-600 uppercase">
                <ArrowUpRight className="h-3 w-3" /> Avance: {porcRendimientoIntentos}%
              </span>
            </div>
          </div>
        </div>
      );
    }
  },
  {
    header: "Estado",
    cell: ({ row }) => {
      const { pendiente, en_ruta, en_bodega, total, other } = row.original.shipmentCounts;
      // AGREGADO: other === 0 para que no marque completo si hay desconocidos
      const realIsComplete = total > 0 && en_ruta === 0 && en_bodega === 0 && pendiente === 0 && other === 0;

      return (
        <div className="flex justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                {realIsComplete ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 stroke-[2.5] animate-in zoom-in" />
                ) : (
                  <CircleDashed className="h-8 w-8 text-amber-500 stroke-[2] animate-spin-slow" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent className="font-bold">
              {realIsComplete ? "Cerrado / Completo" : "En Proceso Operativo"}
            </TooltipContent>
          </Tooltip>
        </div>
      );
    }
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end pr-2">
        <ConsolidatedDetailDialog consolidated={row.original} date={row.original.date} />
      </div>
    )
  }
];