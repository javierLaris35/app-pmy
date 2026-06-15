import * as React from "react";
import { Search, Clock, BanknoteIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface PackageFiltersProps {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;

  carrier: string; // "all" | "fedex" | "dhl"
  onCarrierChange: (v: string) => void;

  onlyToday: boolean;
  onToggleToday: () => void;

  onlyPayment: boolean;
  onTogglePayment: () => void;

  priority: string; // "all" | "alta" | "media" | "baja"
  onPriorityChange: (v: string) => void;

  type: string; // "all" | "special" | "normal"
  onTypeChange: (v: string) => void;

  activeFilterCount: number;
  onClear: () => void;
}

const CARRIERS = [
  { v: "all", label: "Todas" },
  { v: "fedex", label: "FedEx" },
  { v: "dhl", label: "DHL" },
] as const;

const pillSelect =
  "h-8 rounded-full border border-input bg-background px-3 text-xs font-medium text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

/** Barra de filtros estandarizada (segmentado de paquetería + toggles + selects). */
export function PackageFilters({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Buscar por guía, CP, destinatario o dirección...",
  carrier,
  onCarrierChange,
  onlyToday,
  onToggleToday,
  onlyPayment,
  onTogglePayment,
  priority,
  onPriorityChange,
  type,
  onTypeChange,
  activeFilterCount,
  onClear,
}: PackageFiltersProps) {
  return (
    <div className="space-y-2">
      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filtros rápidos (chips) */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Segmentado de paquetería */}
        <div className="inline-flex rounded-lg border bg-background p-0.5">
          {CARRIERS.map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => onCarrierChange(opt.v)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                carrier === opt.v
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onToggleToday}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
            onlyToday ? "bg-red-100 text-red-700 border-red-200" : "bg-background text-muted-foreground border-input hover:bg-muted"
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          Vencen hoy
        </button>

        <button
          type="button"
          onClick={onTogglePayment}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
            onlyPayment ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-background text-muted-foreground border-input hover:bg-muted"
          )}
        >
          <BanknoteIcon className="h-3.5 w-3.5" />
          Con cobro
        </button>

        <select className={pillSelect} value={priority} onChange={(e) => onPriorityChange(e.target.value)}>
          <option value="all">Prioridad: todas</option>
          <option value="alta">Prioridad: alta</option>
          <option value="media">Prioridad: media</option>
          <option value="baja">Prioridad: baja</option>
        </select>

        <select className={pillSelect} value={type} onChange={(e) => onTypeChange(e.target.value)}>
          <option value="all">Tipo: todos</option>
          <option value="special">Tipo: especial</option>
          <option value="normal">Tipo: normal</option>
        </select>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar ({activeFilterCount})
          </button>
        )}
      </div>
    </div>
  );
}
