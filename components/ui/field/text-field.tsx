"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatMoneyInput, parseMoneyInput } from "@/lib/field-format";
import { BARE_CONTROL, Field, FieldProps } from "./field";

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">;

/** Texto, número, correo o teléfono con el marco de campo. */
export const TextField = React.forwardRef<HTMLInputElement, FieldProps & InputProps & { trailing?: React.ReactNode; leading?: React.ReactNode }>(
  ({ label, required, icon, error, hint, size = "md", className, id, disabled, trailing, leading, placeholder, ...props }, ref) => {
    const auto = React.useId();
    const inputId = id ?? auto;
    return (
      <Field label={label} required={required} icon={icon} error={error} hint={hint} size={size} disabled={disabled}
        className={className} htmlFor={inputId} trailing={trailing}>
        {leading}
        <Input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-label={size === "sm" ? label : undefined}
          placeholder={placeholder ?? (size === "sm" ? label : undefined)}
          className={cn(BARE_CONTROL, size === "md" ? "py-2.5" : "py-1.5")}
          {...props}
        />
      </Field>
    );
  },
);
TextField.displayName = "TextField";
/** Monto en pesos: signo de pesos fijo, se escribe libre y se da formato al salir del campo. */
/** Monto en pesos:  fijo, se escribe libre y se da formato al salir del campo. */
export function MoneyField({
  value, onValueChange, placeholder = "0.00", className, ...field
}: FieldProps & { value: number | ""; onValueChange: (v: number | "") => void; placeholder?: string; id?: string }) {
  const [text, setText] = React.useState(formatMoneyInput(value));
  const [focused, setFocused] = React.useState(false);
  React.useEffect(() => { if (!focused) setText(formatMoneyInput(value)); }, [value, focused]);
  return (
    <TextField
      {...field}
      icon={undefined}
      leading={<span className="text-sm text-muted-foreground" aria-hidden>$</span>}
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      onFocus={() => { setFocused(true); setText(value === "" ? "" : String(value)); }}
      onChange={(e) => { setText(e.target.value); onValueChange(parseMoneyInput(e.target.value)); }}
      onBlur={() => { setFocused(false); setText(formatMoneyInput(value)); }}
      className={cn("[&_input]:text-right [&_input]:tabular-nums", className)}
    />
  );
}

/** Notas y descripciones: mínimo 3 renglones. */
export const TextareaField = React.forwardRef<HTMLTextAreaElement, FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ label, required, icon, error, hint, className, id, disabled, rows = 3, ...props }, ref) => {
    const auto = React.useId();
    const inputId = id ?? auto;
    return (
      <Field label={label} required={required} icon={icon} error={error} hint={hint} disabled={disabled} className={className} htmlFor={inputId} multiline>
        <Textarea ref={ref} id={inputId} rows={rows} disabled={disabled} required={required} aria-invalid={!!error}
          className={cn(BARE_CONTROL, "min-h-[72px] resize-y py-2.5 leading-relaxed")} {...props} />
      </Field>
    );
  },
);
TextareaField.displayName = "TextareaField";
