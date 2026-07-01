"use client";

import * as React from "react";
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
}

/**
 * Encabezado estándar de operaciones. Ya NO se pinta inline: publica sus datos en
 * `usePageHeaderStore` y el header sticky único (AppLayout) los renderiza junto a
 * las utilidades globales (campana, offline, menú móvil). Así existe UN solo
 * header en toda la app. La API se mantiene para no tocar las pantallas que ya lo
 * usan.
 */
export function OperationHeader({
  icon,
  title,
  description,
  subsidiaryName,
  isOffline,
  titleAccessory,
  actions,
}: OperationHeaderProps) {
  const setHeader = usePageHeaderStore((s) => s.setHeader);
  const clear = usePageHeaderStore((s) => s.clear);

  // Publica en cada render de la página (acotado: solo corre cuando la página
  // realmente se re-renderiza, no en cascada). Mantiene `actions` siempre fresco.
  React.useEffect(() => {
    setHeader({ icon, title, description, subsidiaryName, isOffline, titleAccessory, actions });
  });

  // Al desmontar (cambio de pantalla) limpia, para que una pantalla sin
  // OperationHeader no herede el título anterior.
  React.useEffect(() => () => clear(), [clear]);

  return null;
}
