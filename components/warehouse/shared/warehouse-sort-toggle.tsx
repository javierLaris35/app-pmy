"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDownWideNarrow, Layers, MapPin, ScanLine, type LucideIcon } from "lucide-react";

/** Modo de orden de la lista de bodega (Entrada / Salida / Inventario). */
export type WarehouseSortMode = "carrier" | "city" | "cp" | "scan";

const OPTIONS: Record<WarehouseSortMode, { label: string; icon: LucideIcon }> = {
  carrier: { label: "Por paquetería", icon: Layers },
  city: { label: "Por ciudad", icon: MapPin },
  cp: { label: "Por CP", icon: ArrowDownWideNarrow },
  scan: { label: "Por escaneo", icon: ScanLine },
};

/**
 * Toggle para ordenar la lista de paquetes de bodega:
 *  - "carrier": FedEx y DHL separados (FedEx primero), sin mezclarse (`sortWarehouseByCarrier`).
 *  - "city": por ciudad (memoria de CP) → CP → paquetería (`sortWarehouseByCity`). Opcional.
 *  - "cp": orden por sucursal → CP → carrier (comportamiento histórico, `sortWarehousePackages`).
 *  - "scan": orden en que se fueron escaneando (orden de inserción del buffer).
 *
 * Compartido por Entrada, Salida e Inventarios para que ofrezcan el mismo control.
 */
export function WarehouseSortToggle({
  value,
  onChange,
  modes = ["carrier", "cp", "scan"],
  className,
}: {
  value: WarehouseSortMode;
  onChange: (mode: WarehouseSortMode) => void;
  /** Modos a mostrar, en orden. Default: los de Entrada/Salida. */
  modes?: WarehouseSortMode[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex overflow-hidden rounded-md border", className)}>
      {modes.map((mode, i) => {
        const { label, icon: Icon } = OPTIONS[mode];
        return (
          <Button
            key={mode}
            type="button"
            size="sm"
            variant={value === mode ? "default" : "ghost"}
            className={cn("gap-1.5 rounded-none", i > 0 && "border-l")}
            onClick={() => onChange(mode)}
            aria-pressed={value === mode}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        );
      })}
    </div>
  );
}
