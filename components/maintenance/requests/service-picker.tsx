"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { formatMoney, MaintenanceServiceItem } from "@/lib/types/maintenance";

/** Buscador del catálogo de servicios agrupado por categoría. */
export function ServicePicker({ services, onPick }: { services: MaintenanceServiceItem[]; onPick: (s: MaintenanceServiceItem) => void }) {
  const [open, setOpen] = useState(false);
  const groups = services.reduce<Record<string, MaintenanceServiceItem[]>>((acc, s) => {
    const k = s.category?.name ?? "Otros";
    (acc[k] ||= []).push(s);
    return acc;
  }, {});

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" title="Elegir del catálogo" aria-label="Elegir del catálogo">
          <BookOpen className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar servicio…" />
          <CommandList>
            <CommandEmpty>No hay servicios que coincidan.</CommandEmpty>
            {Object.entries(groups).map(([cat, list]) => (
              <CommandGroup key={cat} heading={cat}>
                {list.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={`${s.name} ${cat}`}
                    onSelect={() => {
                      onPick(s);
                      setOpen(false);
                    }}
                  >
                    <span className="flex-1">{s.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{formatMoney(s.referencePrice)}</span>
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
