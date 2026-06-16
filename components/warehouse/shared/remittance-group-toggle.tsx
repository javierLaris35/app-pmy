"use client";

import { Layers, Layers2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Toggle estandarizado para agrupar/desagrupar piezas de una misma remesa DHL. */
export function RemittanceGroupToggle({
  grouped,
  onToggle,
  className,
}: {
  grouped: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={grouped ? "Mostrar cada pieza por separado" : "Agrupar piezas de la misma remesa"}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
        grouped
          ? "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
          : "bg-background text-muted-foreground border-input hover:bg-muted",
        className
      )}
    >
      {grouped ? <Layers className="h-3.5 w-3.5" /> : <Layers2 className="h-3.5 w-3.5" />}
      {grouped ? "Remesas agrupadas" : "Remesas desagrupadas"}
    </button>
  );
}
