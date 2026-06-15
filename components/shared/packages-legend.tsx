import * as React from "react";
import { BanknoteIcon, Clock, GemIcon, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface PackagesLegendProps {
  isOffline?: boolean;
  className?: string;
}

/** Leyenda estandarizada de los chips de la lista de paquetes. */
export function PackagesLegend({ isOffline = false, className }: PackagesLegendProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-muted-foreground", className)}>
      <span className="font-medium">Leyenda:</span>
      <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-bold bg-red-100 text-red-700">
        <Clock className="h-3 w-3" /> Hoy
      </span>
      <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-bold bg-amber-100 text-amber-700">
        <Clock className="h-3 w-3" /> Mañana
      </span>
      <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-bold bg-blue-100 text-blue-700">
        <BanknoteIcon className="h-3 w-3" /> Cobro
      </span>
      <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-bold bg-green-100 text-green-700">
        <Package className="h-3 w-3" /> F2
      </span>
      <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-bold bg-violet-100 text-violet-700">
        <GemIcon className="h-3 w-3" /> Alto valor
      </span>
      {isOffline && (
        <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-bold bg-yellow-100 text-yellow-800">
          ⚡ Offline
        </span>
      )}
    </div>
  );
}
