"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { BARE_CONTROL, Field, FieldProps } from "./field";

export interface SelectOption {
  value: string;
  label: string;
}

/** Lista corta (prioridad, tipo, existencia) con el marco de campo. */
export function SelectField({
  value, onValueChange, options, placeholder = "Elige", id, ...field
}: FieldProps & { value: string; onValueChange: (v: string) => void; options: SelectOption[]; placeholder?: string; id?: string }) {
  const auto = React.useId();
  const triggerId = id ?? auto;
  return (
    <Field {...field} htmlFor={triggerId}>
      <Select value={value} onValueChange={onValueChange} disabled={field.disabled}>
        <SelectTrigger
          id={triggerId}
          aria-invalid={!!field.error}
          aria-label={field.size === "sm" ? field.label : undefined}
          className={cn(BARE_CONTROL, "justify-between gap-2", field.size === "sm" ? "py-1.5" : "py-2.5")}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}

/** Sí/no en una fila con borde: etiqueta a la izquierda, descripción opcional y switch a la derecha. */
export function SwitchField({
  checked, onCheckedChange, label, description, disabled, className, children,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  /** Contenido extra a la derecha del texto (p. ej. un selector de tasa). */
  children?: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <div className={cn("flex min-h-11 items-center gap-3 rounded-xl border-[1.5px] border-input bg-background px-3 py-2", disabled && "bg-muted/40", className)}>
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </label>
      {children}
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
