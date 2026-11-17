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
        "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-xs font-medium transition-colors",
        grouped
          ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
          : "bg-background text-muted-foreground border-input hover:bg-muted",
        className
      )}
    >
      {grouped ? <Layers className="h-3.5 w-3.5" /> : <Layers2 className="h-3.5 w-3.5" />}
      {grouped ? "Remesas agrupadas" : "Remesas desagrupadas"}
    </button>
  );
}
