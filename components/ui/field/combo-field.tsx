"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, FieldProps } from "./field";

export interface SearchOption {
  value: string;
  label: string;
  /** Texto chico debajo (marca, número de parte…); también se busca. */
  hint?: string;
  group?: string;
}

interface ListProps {
  options: SearchOption[];
  isSelected: (v: string) => boolean;
  onSelect: (v: string) => void;
  searchPlaceholder: string;
  emptyText: string;
  header?: React.ReactNode;
}

/** Lista con buscador agrupada (núcleo de los combos). */
function OptionList({ options, isSelected, onSelect, searchPlaceholder, emptyText, header }: ListProps) {
  const groups = React.useMemo(() => {
    const m = new Map<string, SearchOption[]>();
    for (const o of options) m.set(o.group ?? "", [...(m.get(o.group ?? "") ?? []), o]);
    return [...m.entries()];
  }, [options]);
  return (
    <Command>
      <CommandInput placeholder={searchPlaceholder} />
      <CommandList className="max-h-72">
        <CommandEmpty>{emptyText}</CommandEmpty>
        {header}
        {groups.map(([g, opts]) => (
          <CommandGroup key={g || "_"} heading={g || undefined}>
            {opts.map((o) => (
              <CommandItem key={o.value} value={`${o.label} ${o.hint ?? ""} ${o.value}`} onSelect={() => onSelect(o.value)}>
                <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected(o.value) ? "opacity-100" : "opacity-0")} />
                <div className="min-w-0">
                  <p className="truncate">{o.label}</p>
                  {o.hint && <p className="truncate text-xs text-muted-foreground">{o.hint}</p>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
}

const TRIGGER = "flex h-auto min-h-0 w-full flex-1 items-center justify-between gap-2 bg-transparent text-left text-sm outline-none disabled:cursor-not-allowed";

interface ComboBase extends FieldProps {
  options: SearchOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Dentro de un Dialog debe ser modal (scroll y teclado); en tarjetas normales, false. */
  modal?: boolean;
  /** Compatibilidad con `invalid` de SearchableSelect (sin texto de error). */
  invalid?: boolean;
}

/** Buscador de una opción con el marco de campo. `allowClear` agrega una opción para dejarlo vacío. */
export function ComboField({
  value, onChange, options, placeholder = "Elige", searchPlaceholder = "Buscar…", emptyText = "No hay coincidencias.",
  allowClear, clearLabel = "Ninguno", modal = true, invalid, ...field
}: ComboBase & { value: string | null; onChange: (v: string | null) => void; allowClear?: boolean; clearLabel?: string }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const selected = options.find((o) => o.value === value);
  // Vacío con allowClear muestra la opción de "ninguno" (p. ej. "Cualquiera"); si no, el placeholder.
  const shown = selected?.label ?? (value === null && allowClear ? clearLabel : null);
  return (
    <Field {...field} error={field.error} htmlFor={id} className={cn(invalid && !field.error && "[&>div]:border-destructive", field.className)}>
      <Popover open={open} onOpenChange={setOpen} modal={modal}>
        <PopoverTrigger asChild>
          <button id={id} type="button" role="combobox" aria-expanded={open} aria-invalid={!!field.error || invalid}
            aria-label={field.size === "sm" ? field.label : undefined} disabled={field.disabled}
            className={cn(TRIGGER, field.size === "sm" ? "py-1.5" : "py-3")}>
            <span className={cn("truncate", !selected && "text-muted-foreground")}>{shown ?? placeholder}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[280px] p-0" align="start" sideOffset={10}>
          <OptionList
            options={options}
            isSelected={(v) => v === value}
            onSelect={(v) => { onChange(v); setOpen(false); }}
            searchPlaceholder={searchPlaceholder}
            emptyText={emptyText}
            header={allowClear ? (
              <CommandGroup>
                <CommandItem value={`__clear__ ${clearLabel}`} onSelect={() => { onChange(null); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === null ? "opacity-100" : "opacity-0")} />
                  <span className="text-muted-foreground">{clearLabel}</span>
                </CommandItem>
              </CommandGroup>
            ) : undefined}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

/** Buscador de varias opciones; lo elegido se ve como chips debajo del campo. */
export function MultiComboField({
  values, onChange, options, placeholder = "Elige uno o varios", searchPlaceholder = "Buscar…", emptyText = "No hay coincidencias.",
  modal = true, invalid, ...field
}: ComboBase & { values: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const chosen = values.map((v) => options.find((o) => o.value === v)).filter(Boolean) as SearchOption[];
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return (
    <div className="grid gap-2">
      <Field {...field} htmlFor={id} className={cn(invalid && !field.error && "[&>div]:border-destructive", field.className)}>
        <Popover open={open} onOpenChange={setOpen} modal={modal}>
          <PopoverTrigger asChild>
            <button id={id} type="button" role="combobox" aria-expanded={open} disabled={field.disabled}
              className={cn(TRIGGER, field.size === "sm" ? "py-1.5" : "py-3")}>
              <span className="truncate text-muted-foreground">
                {chosen.length ? `${chosen.length} elegido${chosen.length === 1 ? "" : "s"} · agregar otro` : placeholder}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[280px] p-0" align="start" sideOffset={10}>
            <OptionList options={options} isSelected={(v) => values.includes(v)} onSelect={toggle} searchPlaceholder={searchPlaceholder} emptyText={emptyText} />
          </PopoverContent>
        </Popover>
      </Field>
      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {chosen.map((o) => (
            <Badge key={o.value} variant="secondary" className="gap-1 rounded-full py-1 pl-3 pr-1.5 font-normal">
              {o.label}
              <button type="button" onClick={() => toggle(o.value)} className="rounded-full p-0.5 hover:bg-foreground/10" aria-label={`Quitar ${o.label}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
