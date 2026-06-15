import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatItem {
  label: string;
  value: string | number;
  /** Clase de color para el valor (ej. "text-red-600"). */
  valueClassName?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Oculta el item (útil para condicionar sin romper el arreglo). */
  hidden?: boolean;
}

interface StatBarProps {
  items: StatItem[];
  className?: string;
}

/**
 * Barra segmentada de contadores (una sola fila, con scroll horizontal como
 * fallback). Diseño estandarizado tomado de "salida a ruta" (package-dispatch).
 */
export function StatBar({ items, className }: StatBarProps) {
  const visible = items.filter((i) => !i.hidden);
  if (visible.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-stretch overflow-x-auto rounded-lg border bg-background divide-x",
        className
      )}
    >
      {visible.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={`${item.label}-${i}`}
            // flex-1 + basis-0 => todos reparten el ancho por igual y llenan el
            // contenedor; min-w evita que se aplasten y activa scroll si no caben.
            className="flex flex-1 basis-0 flex-col items-center justify-center px-2 py-1.5 min-w-[72px] text-center"
          >
            <span
              className={cn(
                "flex items-center gap-1 text-sm font-bold leading-none whitespace-nowrap",
                item.valueClassName
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {item.value}
            </span>
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5 whitespace-nowrap">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
