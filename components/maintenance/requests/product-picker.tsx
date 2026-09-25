"use client";

import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { useProducts } from "@/hooks/services/maintenance/use-maintenance";
import { bestOffer, KIND_PLURAL, Product, ProductKind } from "@/lib/types/compras";
import { formatMoney } from "@/lib/types/maintenance";

const KIND_ORDER: ProductKind[] = ["pieza", "insumo", "servicio", "equipo"];

/** Buscador del catálogo de productos (por nombre, marca, número de parte), agrupado por tipo. */
export function ProductPicker({ onPick, label }: { onPick: (p: Product) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const { products } = useProducts();
  const groups = useMemo(() => {
    const g: Record<string, Product[]> = {};
    for (const p of products) (g[p.category?.kind ?? "otro"] ||= []).push(p);
    return [...KIND_ORDER.filter((k) => g[k]).map((k) => ({ key: k, label: KIND_PLURAL[k], items: g[k] })), ...(g.otro ? [{ key: "otro", label: "Sin categoría", items: g.otro }] : [])];
  }, [products]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size={label ? "sm" : "icon"} title="Elegir del catálogo" aria-label="Elegir del catálogo">
          <BookOpen className={label ? "mr-1.5 h-4 w-4" : "h-4 w-4"} />{label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar producto, marca o número de parte…" />
          <CommandList className="max-h-80">
            <CommandEmpty>No hay productos que coincidan. Escríbelo a mano en el renglón.</CommandEmpty>
            {groups.map((g) => (
              <CommandGroup key={g.key} heading={g.label}>
                {g.items.map((p) => {
                  const b = bestOffer(p);
                  return (
                    <CommandItem
                      key={p.id}
                      value={`${p.name} ${p.brand ?? ""} ${p.partNumber ?? ""} ${p.category?.name ?? ""}`}
                      onSelect={() => { onPick(p); setOpen(false); }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[p.category?.name, p.brand, p.partNumber && `No. ${p.partNumber}`].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      {b && <span className="ml-2 text-xs tabular-nums text-muted-foreground">desde {formatMoney(b.price)}</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
