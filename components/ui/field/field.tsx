"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type FieldSize = "md" | "sm";

export interface FieldProps {
  /** Etiqueta arriba del campo (tamaño md). En sm se usa como nombre accesible. */
  label?: string;
  required?: boolean;
  /** Se acepta por compatibilidad, pero ya no se pinta: los inputs de la app no llevan ícono. */
  icon?: LucideIcon;
  /** Mensaje de error en llano; pinta el campo en rojo. */
  error?: string;
  /** Ayuda debajo del campo (se oculta si hay error). */
  hint?: React.ReactNode;
  size?: FieldSize;
  disabled?: boolean;
  className?: string;
}

/**
 * Clases para que un control de shadcn (Input, Textarea, SelectTrigger, botón) viva "desnudo" dentro del
 * marco: sin borde, sombra ni halo propios (el marco los pone con :focus-within).
 */
export const BARE_CONTROL =
  "h-auto min-h-0 w-full flex-1 rounded-none border-0 bg-transparent px-0 shadow-none ring-0 ring-offset-0 " +
  "hover:border-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 " +
  "disabled:opacity-100 disabled:cursor-not-allowed";

/**
 * Marco común de los campos con el MISMO aspecto que el Input estándar de la app (components/ui/input):
 * etiqueta arriba, caja de 40 px con borde de 1.5 px y esquinas de 6 px, halo al enfocar, y el error en rojo
 * debajo. `htmlFor` enlaza la etiqueta con el control.
 */
export function Field({
  label, required, error, hint, size = "md", disabled, className, htmlFor, multiline, trailing, children,
}: FieldProps & { htmlFor?: string; multiline?: boolean; trailing?: React.ReactNode; children: React.ReactNode }) {
  const md = size === "md";
  return (
    <div className={cn("grid gap-1.5", className)}>
      {md && label && (
        <Label htmlFor={htmlFor} className={cn(error && "text-destructive")}>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      )}
      <div
        data-invalid={error ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        className={cn(
          "flex w-full gap-2 rounded-md border-[1.5px] border-input bg-background px-3 text-base shadow-sm ring-offset-background transition-[border-color,box-shadow] duration-150 md:text-sm",
          "hover:border-ring/30 focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/40 focus-within:ring-offset-2",
          md ? "min-h-10" : "min-h-9",
          multiline ? "items-start" : "items-center",
          error && "border-destructive hover:border-destructive focus-within:border-destructive focus-within:ring-destructive/30",
          disabled && "cursor-not-allowed opacity-50 shadow-none",
        )}
      >
        {children}
        {trailing}
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
