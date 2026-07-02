"use client";

import * as React from "react";
import { MapPin, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageHeaderStore } from "@/store/page-header.store";

export interface OperationHeaderProps {
  /** Icono principal (lucide). */
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  /** Nombre de la sucursal; aparece inline en la línea de contexto. */
  subsidiaryName?: string | null;
  /** Indicador de modo offline. */
  isOffline?: boolean;
  /** Contenido extra junto al título. */
  titleAccessory?: React.ReactNode;
  /** Controles del lado derecho (selectores, botones de acción). */
  actions?: React.ReactNode;
  className?: string;
  /**
   * Modo INLINE: pinta el header aquí mismo (para usar DENTRO de un modal/Dialog)
   * en vez de publicarlo en el store global del header de la página. Es OBLIGATORIO
   * usarlo cuando OperationHeader vive dentro de un DialogContent: si no, el modal
   * sobreescribiría/limpiaría el header de la pantalla padre (bug jul-2026) y no
   * mostraría su propio encabezado. Por defecto false (comportamiento de página).
   */
  inline?: boolean;
}

/**
 * Encabezado estándar de operaciones. Por defecto NO se pinta inline: publica sus
 * datos en `usePageHeaderStore` y el header sticky único (AppLayout) los renderiza
 * junto a las utilidades globales. Así existe UN solo header de página en la app.
 *
 * Con `inline`, en cambio, renderiza el encabezado en su sitio (para modales), sin
 * tocar el store — evita pisar el header de la pantalla padre.
 */
export function OperationHeader({
  icon,
  title,
  description,
  subsidiaryName,
  isOffline,
  titleAccessory,
  actions,
  className,
  inline = false,
}: OperationHeaderProps) {
  const setHeader = usePageHeaderStore((s) => s.setHeader);
  const clear = usePageHeaderStore((s) => s.clear);

  // Publica en cada render de la página (acotado: solo corre cuando la página
  // realmente se re-renderiza, no en cascada). Mantiene `actions` siempre fresco.
  // En modo inline NO toca el store (para no pisar el header del padre).
  React.useEffect(() => {
    if (inline) return;
    setHeader({ icon, title, description, subsidiaryName, isOffline, titleAccessory, actions });
  });

  // Al desmontar (cambio de pantalla) limpia, para que una pantalla sin
  // OperationHeader no herede el título anterior. En inline no aplica.
  React.useEffect(() => {
    if (inline) return;
    return () => clear();
  }, [clear, inline]);

  if (!inline) return null;

  const Icon = icon;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {Icon && (
          <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm ring-1 ring-primary/20 sm:grid">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight md:text-lg">{title}</h2>
            {titleAccessory}
          </div>
          {(description || subsidiaryName || isOffline) && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground md:text-sm">
              {description && <span className="truncate">{description}</span>}
              {description && subsidiaryName && <span aria-hidden className="text-muted-foreground/40">•</span>}
              {subsidiaryName && (
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{subsidiaryName}</span>
                </span>
              )}
              {isOffline && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  <WifiOff className="h-3.5 w-3.5" /> Sin conexión
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
