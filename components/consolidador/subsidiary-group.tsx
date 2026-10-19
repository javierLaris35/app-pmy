"use client";

import React, { useState } from "react";
import { ChevronRight, MapPin, TriangleAlert } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  /** "38 diferencias · −$3,904" — resumen corto del grupo. */
  subtitle?: React.ReactNode;
  error?: string | null;
  defaultOpen?: boolean;
  /** Acción a la derecha del encabezado (p. ej. "Prompt"). */
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Encabezado de sucursal dentro de una vista por zona (renglón gris con subtotal). El contenido
 * solo se monta al abrirlo: así una vista por ruta de 8 sucursales no pide todo de golpe.
 */
export function SubsidiaryGroup({ name, subtitle, error, defaultOpen = true, action, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(defaultOpen);
  return (
    <Collapsible
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setMounted(true);
      }}
      className="overflow-hidden rounded-md border bg-white"
    >
      <div className="flex items-center gap-2 bg-slate-50 px-3 py-2">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronRight className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-90")} />
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold text-slate-800">{name}</span>
          {subtitle && <span className="truncate text-xs text-slate-500">· {subtitle}</span>}
          {error && (
            <span className="inline-flex items-center gap-1 text-xs text-rose-600">
              <TriangleAlert className="h-3.5 w-3.5" /> {error}
            </span>
          )}
        </CollapsibleTrigger>
        {action}
      </div>
      <CollapsibleContent>{mounted && !error && <div className="border-t">{children}</div>}</CollapsibleContent>
    </Collapsible>
  );
}
