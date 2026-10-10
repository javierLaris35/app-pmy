"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { PackageInfo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WarehouseSortToggle, type WarehouseSortMode } from "@/components/warehouse/shared/warehouse-sort-toggle";
import {
  orderWarehousePackages,
  warehouseCarrier,
  warehouseCarrierLabel,
  warehouseCityLabel,
} from "@/components/warehouse/shared/warehouse-scan";

export type CarrierFilter = "all" | "fedex" | "dhl";

const CARRIERS: { value: CarrierFilter; label: string; active: string }[] = [
  { value: "all", label: "Todas", active: "bg-primary text-primary-foreground" },
  { value: "fedex", label: "FedEx", active: "bg-[#4D148C] text-white" },
  { value: "dhl", label: "DHL", active: "bg-[#FFCC00] text-[#D40511]" },
];

const SORT_MODES: WarehouseSortMode[] = ["carrier", "city", "cp", "scan"];

/**
 * Vista de los paquetes del inventario: filtro por paquetería (como la bandeja de
 * correos) y por ciudad, y orden como Entrada/Salida de bodega. Lo usan la captura
 * y el detalle; el PDF/Excel salen con este mismo orden.
 */
export function useInventoryPackageView(packages: PackageInfo[], defaultSort: WarehouseSortMode = "carrier") {
  const [carrier, setCarrier] = useState<CarrierFilter>("all");
  const [city, setCity] = useState<string>("all");
  const [sortMode, setSortMode] = useState<WarehouseSortMode>(defaultSort);

  const carrierCounts = useMemo(() => {
    const counts = { all: packages.length, fedex: 0, dhl: 0 };
    for (const p of packages) {
      const c = warehouseCarrier(p);
      if (c === "fedex" || c === "dhl") counts[c]++;
    }
    return counts;
  }, [packages]);

  const byCarrier = useMemo(
    () => (carrier === "all" ? packages : packages.filter((p) => warehouseCarrier(p) === carrier)),
    [packages, carrier],
  );

  // Ciudades de la paquetería elegida, con conteo; "Sin ciudad" al final.
  const cityOptions = useMemo(() => {
    const counts = new Map<string, number>();
    byCarrier.forEach((p) => {
      const c = warehouseCityLabel(p);
      counts.set(c, (counts.get(c) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) =>
        a.name === "Sin ciudad" ? 1 : b.name === "Sin ciudad" ? -1 : a.name.localeCompare(b.name, "es"),
      );
  }, [byCarrier]);

  // Si al cambiar de paquetería la ciudad ya no aparece, se muestra todo.
  const effectiveCity = city !== "all" && cityOptions.some((c) => c.name === city) ? city : "all";

  const visible = useMemo(() => {
    const filtered = effectiveCity === "all" ? byCarrier : byCarrier.filter((p) => warehouseCityLabel(p) === effectiveCity);
    return orderWarehousePackages(filtered, sortMode);
  }, [byCarrier, effectiveCity, sortMode]);

  const groupBy =
    sortMode === "carrier" ? warehouseCarrierLabel : sortMode === "city" ? warehouseCityLabel : undefined;

  /** Texto del filtro activo para el PDF/Excel (vacío si no hay filtro). */
  const filterLabel = [
    carrier !== "all" ? CARRIERS.find((c) => c.value === carrier)?.label : null,
    effectiveCity !== "all" ? effectiveCity : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    carrier,
    setCarrier,
    city: effectiveCity,
    setCity,
    sortMode,
    setSortMode,
    carrierCounts,
    cityOptions,
    visible,
    groupBy,
    /** Por CP y por escaneo: número de fila al inicio (estilo Excel / VS Code). */
    showRowNumbers: sortMode === "cp" || sortMode === "scan",
    filterLabel,
    /** Todos los paquetes (sin filtrar) en el orden elegido: para el correo al guardar. */
    orderAll: <T extends PackageInfo>(list: T[]) => orderWarehousePackages(list, sortMode),
  };
}

export type InventoryPackageView = ReturnType<typeof useInventoryPackageView>;

export function InventoryPackageToolbar({ view, className }: { view: InventoryPackageView; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="inline-flex rounded-full border bg-background p-0.5" role="tablist" aria-label="Paquetería">
        {CARRIERS.map((c) => {
          const count = view.carrierCounts[c.value];
          const active = view.carrier === c.value;
          return (
            <button
              key={c.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => view.setCarrier(c.value)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
                active ? c.active : "text-muted-foreground hover:bg-muted",
              )}
            >
              {c.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] tabular-nums",
                  active ? "bg-white/25" : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Select value={view.city} onValueChange={view.setCity}>
        <SelectTrigger className="h-8 w-auto min-w-44 gap-1.5 rounded-full px-3 text-sm font-medium" aria-label="Ciudad">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Ciudad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las ciudades</SelectItem>
          {view.cityOptions.map((c) => (
            <SelectItem key={c.name} value={c.name}>
              {c.name} ({c.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <WarehouseSortToggle value={view.sortMode} onChange={view.setSortMode} modes={SORT_MODES} className="ml-auto" />
    </div>
  );
}
