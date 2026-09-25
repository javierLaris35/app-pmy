"use client";

import * as React from "react";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLongDate, fromIsoDate, toIsoDate } from "@/lib/field-format";
import { Field, FieldProps } from "./field";

/** Fecha con calendario en español; guarda "YYYY-MM-DD" y muestra "24 de septiembre de 2026". */
export function DateField({
  value, onChange, placeholder = "Elige la fecha", clearable, modal = true, icon = CalendarDays, ...field
}: FieldProps & { value: string; onChange: (v: string) => void; placeholder?: string; clearable?: boolean; modal?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const date = fromIsoDate(value);
  return (
    <Field {...field} icon={icon} htmlFor={id}
      trailing={clearable && value && !field.disabled ? (
        <button type="button" onClick={() => onChange("")} className="rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label="Quitar fecha">
          <X className="h-3.5 w-3.5" />
        </button>
      ) : undefined}>
      <Popover open={open} onOpenChange={setOpen} modal={modal}>
        <PopoverTrigger asChild>
          <button id={id} type="button" disabled={field.disabled} aria-invalid={!!field.error}
            className={cn("h-auto min-h-0 w-full flex-1 bg-transparent text-left text-sm outline-none disabled:cursor-not-allowed", field.size === "sm" ? "py-1.5" : "py-2.5")}>
            <span className={cn("truncate", !date && "text-muted-foreground")}>{date ? formatLongDate(value) : placeholder}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" sideOffset={10}>
          <Calendar
            mode="single"
            locale={es}
            selected={date}
            defaultMonth={date}
            onSelect={(d) => { if (d) { onChange(toIsoDate(d)); setOpen(false); } }}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}
