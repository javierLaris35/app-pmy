"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FieldSize = "md" | "sm";

export interface FieldProps {
  /** Etiqueta montada sobre el borde (tamaño md). En sm se usa como nombre accesible. */
  label?: string;
  required?: boolean;
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
 * Marco común de los campos: borde redondeado, etiqueta sobre el borde, asterisco de obligatorio,
 * ícono a la izquierda y mensaje de error/ayuda debajo. `htmlFor` enlaza la etiqueta con el control.
 */
export function Field({
  label, required, icon: Icon, error, hint, size = "md", disabled, className, htmlFor, multiline, trailing, children,
}: FieldProps & { htmlFor?: string; multiline?: boolean; trailing?: React.ReactNode; children: React.ReactNode }) {
  const md = size === "md";
  return (
    <div className={cn("grid gap-1", className)}>
      <div
        data-invalid={error ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        className={cn(
          "group/field relative flex w-full border border-[hsl(var(--field-border))] bg-background text-sm transition-[border-color,box-shadow] duration-150",
          "hover:border-foreground/30 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10",
          md ? "min-h-12 gap-2.5 rounded-xl px-3.5" : "min-h-9 gap-2 rounded-lg px-3",
          multiline ? "items-start" : "items-center",
          error && "border-destructive hover:border-destructive focus-within:border-destructive focus-within:ring-destructive/10",
          disabled && "bg-muted/40 hover:border-[hsl(var(--field-border))]",
        )}
      >
        {md && label && (
          <label
            htmlFor={htmlFor}
            className={cn(
              "pointer-events-none absolute -top-2 left-3 max-w-[calc(100%-1.5rem)] truncate bg-background px-1 text-[11px] font-medium leading-4",
              "text-muted-foreground group-focus-within/field:text-primary",
              error && "text-destructive group-focus-within/field:text-destructive",
              disabled && "bg-transparent",
            )}
          >
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </label>
        )}
        {Icon && <Icon className={cn("h-4 w-4 shrink-0 text-muted-foreground", multiline && "mt-3.5", error && "text-destructive/80")} aria-hidden />}
        {children}
        {trailing}
      </div>
      {error ? (
        <p className="px-1 text-xs text-destructive" role="alert">{error}</p>
      ) : hint ? (
        <p className="px-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
