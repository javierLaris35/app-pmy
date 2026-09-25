"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

/**
 * Opciones como tarjetas con ícono, nombre y para qué sirve (sobre RadioGroup de shadcn).
 * La elegida se marca con borde y fondo rojo PMY suave y el ícono en un círculo rojo.
 */
export function ChoiceCards<T extends string>({
  value, onChange, options, columns = 2, disabled, className, "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: ChoiceOption<T>[];
  columns?: 2 | 4;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const base = React.useId();
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as T)}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn("grid gap-3", columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2", className)}
    >
      {options.map((o) => {
        const id = `${base}-${o.value}`;
        const on = o.value === value;
        const Icon = o.icon;
        return (
          <label
            key={o.value}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border border-[hsl(var(--field-border))] bg-background p-3.5 transition-[border-color,background-color,box-shadow]",
              "hover:border-foreground/30",
              on && "border-primary bg-primary/5 ring-4 ring-primary/10 hover:border-primary",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {Icon && (
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition-colors", on && "bg-primary text-primary-foreground")}>
                <Icon className="h-4 w-4" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{o.label}</span>
              {o.description && <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{o.description}</span>}
            </span>
            <RadioGroupItem id={id} value={o.value} className={cn("mt-0.5 shrink-0", on && "border-primary text-primary")} />
          </label>
        );
      })}
    </RadioGroup>
  );
}
