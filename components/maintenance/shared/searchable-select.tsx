"use client";

import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchOption {
  value: string;
  label: string;
  /** Texto chico debajo (marca, número de parte…); también se busca. */
  hint?: string;
  group?: string;
}

function groupOptions(options: SearchOption[]) {
  const groups = new Map<string, SearchOption[]>();
  for (const o of options) {
    const g = o.group ?? "";
    groups.set(g, [...(groups.get(g) ?? []), o]);
  }
  return [...groups.entries()];
}

interface BaseProps {
  options: SearchOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  /** Dentro de un Dialog: el popover debe ser modal para que funcione el scroll y el teclado. */
  modal?: boolean;
}

/** Select con buscador (shadcn Popover + Command). `allowClear` agrega una opción para dejarlo vacío. */
export function SearchableSelect({
  value, onChange, options, placeholder = "Elige", searchPlaceholder = "Buscar…", emptyText = "No hay coincidencias.",
  allowClear, clearLabel = "Ninguno", invalid, disabled, className, modal = true,
}: BaseProps & { value: string | null; onChange: (v: string | null) => void; allowClear?: boolean; clearLabel?: string }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const groups = useMemo(() => groupOptions(options), [options]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          type="button" variant="outline" role="combobox" aria-expanded={open} disabled={disabled}
          className={cn("w-full justify-between px-3 font-normal", !selected && "text-muted-foreground", invalid && "border-destructive", className)}
        >
          <span className="truncate">{selected ? selected.label : value === null && allowClear ? clearLabel : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-72">
            <CommandEmpty>{emptyText}</CommandEmpty>
            {allowClear && (
              <CommandGroup>
                <CommandItem value={`__clear__ ${clearLabel}`} onSelect={() => { onChange(null); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === null ? "opacity-100" : "opacity-0")} />
                  <span className="text-muted-foreground">{clearLabel}</span>
                </CommandItem>
              </CommandGroup>
            )}
            {groups.map(([g, opts]) => (
              <CommandGroup key={g || "_"} heading={g || undefined}>
                {opts.map((o) => (
                  <CommandItem key={o.value} value={`${o.label} ${o.hint ?? ""} ${o.value}`} onSelect={() => { onChange(o.value); setOpen(false); }}>
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", value === o.value ? "opacity-100" : "opacity-0")} />
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
      </PopoverContent>
    </Popover>
  );
}

/** Selección múltiple con buscador; lo elegido se muestra como chips que se pueden quitar. */
export function SearchableMultiSelect({
  values, onChange, options, placeholder = "Elige uno o varios", searchPlaceholder = "Buscar…", emptyText = "No hay coincidencias.",
  invalid, disabled, className, modal = true,
}: BaseProps & { values: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => groupOptions(options), [options]);
  const chosen = values.map((v) => options.find((o) => o.value === v)).filter(Boolean) as SearchOption[];
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen} modal={modal}>
        <PopoverTrigger asChild>
          <Button
            type="button" variant="outline" role="combobox" aria-expanded={open} disabled={disabled}
            className={cn("w-full justify-between px-3 font-normal text-muted-foreground", invalid && "border-destructive")}
          >
            <span className="truncate">{chosen.length ? `${chosen.length} elegido${chosen.length === 1 ? "" : "s"} · agregar otro` : placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[260px] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList className="max-h-72">
              <CommandEmpty>{emptyText}</CommandEmpty>
              {groups.map(([g, opts]) => (
                <CommandGroup key={g || "_"} heading={g || undefined}>
                  {opts.map((o) => (
                    <CommandItem key={o.value} value={`${o.label} ${o.hint ?? ""} ${o.value}`} onSelect={() => toggle(o.value)}>
                      <Check className={cn("mr-2 h-4 w-4 shrink-0", values.includes(o.value) ? "opacity-100" : "opacity-0")} />
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
        </PopoverContent>
      </Popover>
      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chosen.map((o) => (
            <Badge key={o.value} variant="secondary" className="gap-1 pr-1 font-normal">
              {o.label}
              <button type="button" onClick={() => toggle(o.value)} className="rounded-sm p-0.5 hover:bg-muted-foreground/20" aria-label={`Quitar ${o.label}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
