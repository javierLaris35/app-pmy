"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDownWideNarrow, Layers, ScanLine } from "lucide-react";

/** Modo de orden de la lista de bodega (Entrada / Salida). */
export type WarehouseSortMode = "carrier" | "cp" | "scan";

/**
 * Toggle para ordenar la lista de paquetes de bodega:
 *  - "carrier": FedEx y DHL separados (FedEx primero), sin mezclarse (`sortWarehouseByCarrier`).
 *  - "cp": orden por sucursal → CP → carrier (comportamiento histórico, `sortWarehousePackages`).
 *  - "scan": orden en que se fueron escaneando (orden de inserción del buffer).
 *
 * Compartido por Entrada y Salida para que ambas pantallas ofrezcan el mismo control.
 */
export function WarehouseSortToggle({
  value,
  onChange,
  className,
}: {
  value: WarehouseSortMode;
  onChange: (mode: WarehouseSortMode) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex overflow-hidden rounded-md border", className)}>
      <Button
        type="button"
        size="sm"
        variant={value === "carrier" ? "default" : "ghost"}
        className="gap-1.5 rounded-none"
        onClick={() => onChange("carrier")}
        aria-pressed={value === "carrier"}
      >
        <Layers className="h-4 w-4" />
        Por paquetería
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "cp" ? "default" : "ghost"}
        className="gap-1.5 rounded-none border-l"
        onClick={() => onChange("cp")}
        aria-pressed={value === "cp"}
      >
        <ArrowDownWideNarrow className="h-4 w-4" />
        Por CP
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "scan" ? "default" : "ghost"}
        className="gap-1.5 rounded-none border-l"
        onClick={() => onChange("scan")}
        aria-pressed={value === "scan"}
      >
        <ScanLine className="h-4 w-4" />
        Por escaneo
      </Button>
    </div>
  );
}
