"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getStatusBadge } from "@/utils/shipment-status.utils";

/**
 * Tamaño ÚNICO de las etiquetas chicas de las listas de paquetes (vence, cobro, F2, CP, estatus):
 * mismo alto, letra y relleno para que no se vean de tamaños distintos.
 */
export const PILL_CLASS =
  "inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold leading-none whitespace-nowrap";

export function Pill({
  icon: Icon,
  children,
  className,
  title,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span className={cn(PILL_CLASS, className)} title={title}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

/** Estatus del paquete con el semáforo de la app (`getStatusBadge`, el mismo de Monitoreo). */
export function StatusPill({ status, title, className }: { status?: string | null; title?: string; className?: string }) {
  const info = getStatusBadge(status ?? "");
  return (
    <Pill icon={info.icon} title={title} className={cn("ring-1 ring-inset", info.color, className)}>
      {info.label}
    </Pill>
  );
}
