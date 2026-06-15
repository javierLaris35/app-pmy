import * as React from "react";
import { MapPinIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OperationHeaderProps {
  /** Icono principal (lucide). */
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  /** Nombre de la sucursal; aparece inline en la línea de contexto. */
  subsidiaryName?: string | null;
  /** Indicador de modo offline. */
  isOffline?: boolean;
  /** Contenido extra junto al título (opcional; evita duplicar conteos del StatBar). */
  titleAccessory?: React.ReactNode;
  /** Controles del lado derecho (selectores, botones de acción). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Encabezado estándar para pantallas de operaciones.
 *
 * Layout: identidad a la izquierda (icono + título y, debajo, una sola línea de
 * contexto con descripción · sucursal · estado) y acciones compactas a la
 * derecha. Sin "caja" pesada: borde inferior limpio. Misma paleta de la app.
 */
export function OperationHeader({
  icon: Icon,
  title,
  description,
  subsidiaryName,
  isOffline = false,
  titleAccessory,
  actions,
  className,
}: OperationHeaderProps) {
  const hasMeta = !!description || !!subsidiaryName || isOffline;

  return (
    <header
      className={cn(
        "flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {/* Identidad + contexto */}
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20">
            <Icon className="h-5 w-5" />
          </span>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg sm:text-xl font-semibold tracking-tight">{title}</h1>
            {titleAccessory}
          </div>

          {hasMeta && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
              {description && <span className="truncate">{description}</span>}

              {description && subsidiaryName && (
                <span aria-hidden className="text-muted-foreground/40">•</span>
              )}

              {subsidiaryName && (
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{subsidiaryName}</span>
                </span>
              )}

              {isOffline && (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-yellow-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                  Offline
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Acciones */}
      {actions && (
        <div className="flex items-center gap-2 sm:shrink-0">{actions}</div>
      )}
    </header>
  );
}
