"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface SwitchRowProps {
  /** Título del control (a la izquierda). */
  label: React.ReactNode;
  /** Texto de ayuda debajo del título. Puede depender del estado. */
  hint?: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Id opcional; enlaza el Label con el Switch para accesibilidad. */
  id?: string;
  /** Escape hatch para el contenedor (p.ej. `sm:col-span-2` dentro de un grid). */
  className?: string;
}

/**
 * Renglón estándar de switch para formularios: título + ayuda a la izquierda, `Switch`
 * a la derecha (`justify-between`). Unifica el patrón de la casa (wizard de envíos,
 * modal de pegar, configuración por sucursal) para que los toggles no se desalineen.
 */
export function SwitchRow({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
  id,
  className,
}: SwitchRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2",
        className,
      )}
    >
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        {hint && <p className="text-[11px] leading-tight text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
